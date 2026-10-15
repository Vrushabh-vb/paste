import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_FILE_SIZE, MAX_FILES, MAX_TEXT_BYTES, MAX_TOTAL_FILES_SIZE } from '@/lib/config'
import {
  allocateCode,
  clampTtl,
  createFileShare,
  createTextShare,
  loadShare,
  parseRef,
  ShareError,
  toPublic,
  updateText,
} from '@/lib/server/shares'
import { MemoryStorage } from './helpers/memory-storage'

let storage: MemoryStorage
beforeEach(() => {
  storage = new MemoryStorage()
})

const rejects = async (p: Promise<unknown>, status: number) => {
  const err = await p.then(() => null, e => e)
  expect(err).toBeInstanceOf(ShareError)
  expect((err as ShareError).status).toBe(status)
}

describe('parseRef', () => {
  it('tells codes from ids and rejects everything else', () => {
    expect(parseRef('123456')).toEqual({ type: 'code', value: '123456' })
    expect(parseRef(' ABCDEFGHJKMN ')).toEqual({ type: 'id', value: 'abcdefghjkmn' })
    for (const bad of ['', '1234', '12345', '1234567', 'abc', '../etc/passwd', 'abcdefghjkm!', 'abcdefghijkl'])
      expect(parseRef(bad)).toBeNull()
  })
})

describe('clampTtl', () => {
  it('caps text at 7 days and files at 1 day', () => {
    const day = 86400
    expect(clampTtl(30 * day, 'text')).toBe(7 * day)
    expect(clampTtl(7 * day, 'files')).toBe(day)
    expect(clampTtl(300, 'files')).toBe(300)
  })
  it('falls back to the default for junk', () => {
    for (const junk of [undefined, null, 'abc', -5, 0, NaN, Infinity]) expect(clampTtl(junk, 'text')).toBe(30 * 60)
  })
})

describe('text shares', () => {
  it('creates a share reachable by both id and code', async () => {
    const m = await createTextShare(storage, { text: 'hello', ttl: 600 }, 1_000_000)
    expect(m.code).toMatch(/^\d{6}$/)
    expect(m.expiresAt).toBe(1_000_000 + 600_000)

    const byId = await loadShare(storage, { type: 'id', value: m.id }, 1_000_001)
    const byCode = await loadShare(storage, { type: 'code', value: m.code }, 1_000_001)
    expect(byId?.text).toBe('hello')
    expect(byCode?.id).toBe(m.id)
  })

  it('stops serving at the exact expiry moment', async () => {
    const m = await createTextShare(storage, { text: 'x', ttl: 60 }, 5_000)
    expect(await loadShare(storage, { type: 'id', value: m.id }, 5_000 + 59_999)).not.toBeNull()
    expect(await loadShare(storage, { type: 'id', value: m.id }, 5_000 + 60_000)).toBeNull()
    expect(await loadShare(storage, { type: 'code', value: m.code }, 5_000 + 60_000)).toBeNull()
  })

  it('rejects empty, whitespace-only and non-string text', async () => {
    await rejects(createTextShare(storage, { text: '' }), 400)
    await rejects(createTextShare(storage, { text: '   \n ' }), 400)
    await rejects(createTextShare(storage, { text: 123 as any }), 400)
  })

  it('enforces the byte limit (counts bytes, not characters)', async () => {
    await createTextShare(storage, { text: 'a'.repeat(MAX_TEXT_BYTES) })
    await rejects(createTextShare(storage, { text: 'a'.repeat(MAX_TEXT_BYTES + 1) }), 413)
    await rejects(createTextShare(storage, { text: '日'.repeat(Math.floor(MAX_TEXT_BYTES / 3) + 1) }), 413)
  })

  it('treats allowEditing/isCode as opt-in booleans only', async () => {
    const m = await createTextShare(storage, { text: 'x', allowEditing: 'yes' as any, isCode: 1 as any })
    expect(m.allowEditing).toBe(false)
    expect(m.isCode).toBe(false)
  })

  it('returns null for corrupted or unknown manifests instead of throwing', async () => {
    expect(await loadShare(storage, { type: 'id', value: 'abcdefghjkmn' })).toBeNull()
    await storage.put('s/abcdefghjkmn.json', '{not json')
    expect(await loadShare(storage, { type: 'id', value: 'abcdefghjkmn' })).toBeNull()
    await storage.put('c/123456', 'not-a-valid-id')
    expect(await loadShare(storage, { type: 'code', value: '123456' })).toBeNull()
  })
})

describe('allocateCode', () => {
  it('never overwrites a code that is already taken', async () => {
    await storage.put('c/111111', 'victimvictim', { ifNoneMatch: true })
    // every code is "taken" -> must give up rather than overwrite
    const full = new MemoryStorage()
    full.put = async () => 'exists' as const
    await rejects(allocateCode(full, 'abcdefghjkmn', 5), 503)
    expect(await storage.get('c/111111')).toBe('victimvictim')
  })

  it('retries on collision and succeeds', async () => {
    let calls = 0
    const flaky = new MemoryStorage()
    const realPut = flaky.put.bind(flaky)
    flaky.put = async (k, b, o) => (++calls < 4 ? ('exists' as const) : realPut(k, b, o))
    const code = await allocateCode(flaky, 'abcdefghjkmn')
    expect(code).toMatch(/^\d{6}$/)
    expect(calls).toBe(4)
  })
})

describe('editing', () => {
  it('lets anyone edit only when allowEditing was set, and never extends the expiry', async () => {
    const m = await createTextShare(storage, { text: 'v1', allowEditing: true, ttl: 600 }, 1000)
    const updated = await updateText(storage, m, 'v2')
    expect(updated.text).toBe('v2')
    expect(updated.expiresAt).toBe(m.expiresAt)
    expect((await loadShare(storage, { type: 'id', value: m.id }, 2000))?.text).toBe('v2')
  })

  it('refuses edits on read-only shares and file shares', async () => {
    const ro = await createTextShare(storage, { text: 'v1' })
    await rejects(updateText(storage, ro, 'hacked'), 403)
    expect((await loadShare(storage, { type: 'id', value: ro.id }))?.text).toBe('v1')

    storage.seedFile('f/kqzwtvxyabcd/0-a.txt', 3)
    const fs = await createFileShare(storage, { uploadId: 'kqzwtvxyabcd', files: [{ key: 'f/kqzwtvxyabcd/0-a.txt', name: 'a.txt' }] })
    await rejects(updateText(storage, { ...fs, allowEditing: true }, 'x'), 403)
  })

  it('validates the new text', async () => {
    const m = await createTextShare(storage, { text: 'v1', allowEditing: true })
    await rejects(updateText(storage, m, ''), 400)
    await rejects(updateText(storage, m, 'a'.repeat(MAX_TEXT_BYTES + 1)), 413)
  })
})

describe('file shares', () => {
  const UP = 'abcdefghjkmn'
  const key = (i: number, n = 'a.bin') => `f/${UP}/${i}-${n}`

  it('builds the manifest from what is really in storage, not from client claims', async () => {
    storage.seedFile(key(0, 'cat.png'), 2048, 'image/png')
    const m = await createFileShare(storage, { uploadId: UP, files: [{ key: key(0, 'cat.png'), name: 'cat.png', size: 1, type: 'text/html' }] })
    expect(m.files).toEqual([{ key: key(0, 'cat.png'), name: 'cat.png', type: 'image/png', size: 2048 }])
    expect(m.expiresAt - m.createdAt).toBeLessThanOrEqual(86400_000)
  })

  it('caps file share lifetime at 24h even if 7 days is requested', async () => {
    storage.seedFile(key(0), 10)
    const m = await createFileShare(storage, { uploadId: UP, files: [{ key: key(0), name: 'a' }], ttl: 7 * 86400 }, 0)
    expect(m.expiresAt).toBe(86400_000)
  })

  it('rejects files that were never uploaded', async () => {
    await rejects(createFileShare(storage, { uploadId: UP, files: [{ key: key(0), name: 'ghost.txt' }] }), 400)
  })

  it('rejects keys outside this upload (cannot claim other people\'s files)', async () => {
    storage.seedFile('f/zzzzzzzzzzzz/0-secret.pdf', 10)
    await rejects(createFileShare(storage, { uploadId: UP, files: [{ key: 'f/zzzzzzzzzzzz/0-secret.pdf', name: 's' }] }), 400)
    storage.seedFile('s/abcdefghjkmn.json', 10)
    await rejects(createFileShare(storage, { uploadId: UP, files: [{ key: 's/abcdefghjkmn.json', name: 's' }] }), 400)
    await rejects(createFileShare(storage, { uploadId: UP, files: [{ key: `f/${UP}/../s/x`, name: 's' }] }), 400)
  })

  it('rejects bad upload ids, empty lists and too many files', async () => {
    await rejects(createFileShare(storage, { uploadId: '../..', files: [{ key: 'x' }] }), 400)
    await rejects(createFileShare(storage, { uploadId: UP, files: [] }), 400)
    await rejects(createFileShare(storage, { uploadId: UP, files: 'nope' }), 400)
    const many = Array.from({ length: MAX_FILES + 1 }, (_, i) => ({ key: key(i), name: 'f' }))
    await rejects(createFileShare(storage, { uploadId: UP, files: many }), 400)
  })

  it('re-checks real sizes after upload', async () => {
    storage.seedFile(key(0), MAX_FILE_SIZE + 1)
    await rejects(createFileShare(storage, { uploadId: UP, files: [{ key: key(0), name: 'big' }] }), 413)

    const fresh = new MemoryStorage()
    const per = MAX_TOTAL_FILES_SIZE / 4 + 1
    const files = []
    for (let i = 0; i < 5; i++) {
      fresh.seedFile(key(i), per)
      files.push({ key: key(i), name: `f${i}` })
    }
    await rejects(createFileShare(fresh, { uploadId: UP, files }), 413)
  })

  it('sanitizes display names', async () => {
    storage.seedFile(key(0), 5)
    const m = await createFileShare(storage, { uploadId: UP, files: [{ key: key(0), name: '../../x\u0000.exe' }] })
    expect(m.files![0].name).not.toMatch(/[\\/\u0000]/)
  })
})

describe('toPublic', () => {
  it('never leaks storage keys and flags previewable media', async () => {
    storage.seedFile('f/abcdefghjkmn/0-a.png', 5, 'image/png')
    storage.seedFile('f/abcdefghjkmn/1-b.zip', 5, 'application/zip')
    storage.seedFile('f/abcdefghjkmn/2-c.svg', 5, 'image/svg+xml')
    const m = await createFileShare(storage, {
      uploadId: 'abcdefghjkmn',
      files: [0, 1, 2].map((i, n) => ({ key: ['f/abcdefghjkmn/0-a.png', 'f/abcdefghjkmn/1-b.zip', 'f/abcdefghjkmn/2-c.svg'][n], name: 'n' + i })),
    })
    const pub = toPublic(m)
    expect(JSON.stringify(pub)).not.toContain('f/abcdefghjkmn')
    expect(pub.files!.map(f => f.preview)).toEqual(['image', null, null]) // svg can carry script: never inline
    expect(pub.files![1].url).toBe(`/api/file/${m.id}/1`)
  })
})
