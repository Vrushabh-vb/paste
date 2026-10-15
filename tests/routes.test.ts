import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { setStorageForTests } from '@/lib/server/storage'
import { resetRateLimitsForTests } from '@/lib/server/rate-limit'
import { MAX_FILE_SIZE, MAX_FILES, MAX_TOTAL_FILES_SIZE } from '@/lib/config'
import { POST as upload } from '@/app/api/upload/route'
import { POST as createShare } from '@/app/api/share/route'
import { GET as getShare, PUT as putShare } from '@/app/api/share/[ref]/route'
import { GET as getFile } from '@/app/api/file/[id]/[index]/route'
import { GET as cron } from '@/app/api/cron/cleanup/route'
import { MemoryStorage } from './helpers/memory-storage'

let storage: MemoryStorage
let ipCounter = 0
const freshIp = () => `10.0.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`

function req(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-forwarded-for': freshIp(), ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  })
}
const ctx = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) })

beforeEach(() => {
  storage = new MemoryStorage()
  setStorageForTests(storage)
  resetRateLimitsForTests()
  delete process.env.DAILY_UPLOAD_CAP_MB
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
})
afterEach(() => setStorageForTests(null))

describe('POST /api/upload', () => {
  const ok = [{ name: 'my photo.png', type: 'image/png', size: 1234 }]

  it('returns one signed URL per file, namespaced under a fresh upload id', async () => {
    const res = await upload(req('POST', '/api/upload', { files: [...ok, { name: 'a.zip', type: 'application/zip', size: 5 }] }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.uploadId).toMatch(/^[a-z2-9]{12}$/)
    expect(body.files).toHaveLength(2)
    for (const f of body.files) expect(f.key.startsWith(`f/${body.uploadId}/`)).toBe(true)
    expect(body.files[0].key).toMatch(/^f\/[a-z2-9]{12}\/0-my_photo\.png$/)
  })

  it('signs the declared size and a normalised content type (so R2 can enforce them)', async () => {
    await upload(req('POST', '/api/upload', { files: [{ name: 'x', type: 'IMAGE/PNG', size: 77 }, { name: 'y', type: 'not a mime\r\nx: y', size: 5 }] }))
    expect(storage.presigned[0].opts).toMatchObject({ size: 77, contentType: 'image/png' })
    expect(storage.presigned[1].opts.contentType).toBe('application/octet-stream')
  })

  it.each([
    ['no body files', {}, 400],
    ['empty list', { files: [] }, 400],
    ['too many files', { files: Array.from({ length: MAX_FILES + 1 }, () => ({ name: 'a', size: 1 })) }, 400],
    ['zero-byte file', { files: [{ name: 'a', size: 0 }] }, 400],
    ['fractional size', { files: [{ name: 'a', size: 1.5 }] }, 400],
    ['string size', { files: [{ name: 'a', size: '5' }] }, 400],
    ['missing name', { files: [{ size: 5 }] }, 400],
    ['file over the per-file limit', { files: [{ name: 'a', size: MAX_FILE_SIZE + 1 }] }, 413],
    ['total over the share limit', { files: Array.from({ length: 6 }, (_, i) => ({ name: 'f' + i, size: MAX_TOTAL_FILES_SIZE / 5 })) }, 413],
  ])('rejects: %s', async (_name, body, status) => {
    const res = await upload(req('POST', '/api/upload', body))
    expect(res.status).toBe(status)
    expect(storage.presigned).toHaveLength(0)
  })

  it('rejects invalid JSON with 400, not 500', async () => {
    expect((await upload(req('POST', '/api/upload', '{nope'))).status).toBe(400)
  })

  it('stops handing out URLs once the daily capacity is used (free-tier circuit breaker)', async () => {
    process.env.DAILY_UPLOAD_CAP_MB = '10'
    const mb6 = [{ name: 'a', size: 6 * 1024 * 1024 }]
    expect((await upload(req('POST', '/api/upload', { files: mb6 }))).status).toBe(200)
    const res = await upload(req('POST', '/api/upload', { files: mb6 }))
    expect(res.status).toBe(503)
    expect((await res.json()).error).toMatch(/capacity/i)
  })

  it('rate-limits a single IP', async () => {
    const headers = { 'x-forwarded-for': '203.0.113.9' }
    let last = 200
    for (let i = 0; i < 61; i++) last = (await upload(req('POST', '/api/upload', { files: ok }, headers))).status
    expect(last).toBe(429)
  })
})

describe('share lifecycle over HTTP', () => {
  const create = async (body: unknown) => (await createShare(req('POST', '/api/share', body))).json()

  it('text: create -> read by code and by link id', async () => {
    const made = await create({ kind: 'text', text: 'hello world', ttl: 600 })
    expect(made.code).toMatch(/^\d{6}$/)
    expect(made.url).toBe(`/view/${made.id}`)

    for (const ref of [made.code, made.id]) {
      const res = await getShare(req('GET', `/api/share/${ref}`), ctx({ ref }))
      expect(res.status).toBe(200)
      expect(res.headers.get('cache-control')).toBe('no-store')
      expect(await res.json()).toMatchObject({ kind: 'text', text: 'hello world', code: made.code, id: made.id, allowEditing: false })
    }
  })

  it('unknown / malformed refs are all the same 404', async () => {
    for (const ref of ['123456', 'abcdefghjkmn', '12', '../../etc', 'x'.repeat(100)]) {
      const res = await getShare(req('GET', `/api/share/${ref}`), ctx({ ref }))
      expect(res.status).toBe(404)
    }
  })

  it('brute-forcing codes is throttled per IP', async () => {
    const headers = { 'x-forwarded-for': '198.51.100.7' }
    const statuses: number[] = []
    for (let i = 0; i < 25; i++) {
      const ref = String(100000 + i)
      statuses.push((await getShare(req('GET', `/api/share/${ref}`, undefined, headers), ctx({ ref }))).status)
    }
    expect(statuses.slice(0, 20).every(s => s === 404)).toBe(true)
    expect(statuses.slice(20).every(s => s === 429)).toBe(true)
    const throttled = await getShare(req('GET', '/api/share/100099', undefined, headers), ctx({ ref: '100099' }))
    expect(Number(throttled.headers.get('retry-after'))).toBeGreaterThan(0)
  })

  it('expired shares are gone', async () => {
    const made = await create({ kind: 'text', text: 'short lived', ttl: 300 })
    const key = `s/${made.id}.json`
    const m = JSON.parse((await storage.get(key))!)
    m.expiresAt = Date.now() - 1
    await storage.put(key, JSON.stringify(m))
    const res = await getShare(req('GET', `/api/share/${made.code}`), ctx({ ref: made.code }))
    expect(res.status).toBe(404)
  })

  it('edit works only with allowEditing and keeps the expiry', async () => {
    const ro = await create({ kind: 'text', text: 'locked' })
    const denied = await putShare(req('PUT', `/api/share/${ro.id}`, { text: 'hacked' }), ctx({ ref: ro.id }))
    expect(denied.status).toBe(403)

    const rw = await create({ kind: 'text', text: 'v1', allowEditing: true, ttl: 3600 })
    const done = await putShare(req('PUT', `/api/share/${rw.code}`, { text: 'v2' }), ctx({ ref: rw.code }))
    expect(done.status).toBe(200)
    const after = await (await getShare(req('GET', `/api/share/${rw.id}`), ctx({ ref: rw.id }))).json()
    expect(after.text).toBe('v2')
    expect(after.expiresAt).toBe(rw.expiresAt)
  })

  it('create validates input', async () => {
    expect((await createShare(req('POST', '/api/share', { kind: 'nope' }))).status).toBe(400)
    expect((await createShare(req('POST', '/api/share', { kind: 'text', text: '' }))).status).toBe(400)
    expect((await createShare(req('POST', '/api/share', '[[['))).status).toBe(400)
    expect((await createShare(req('POST', '/api/share', { kind: 'files', uploadId: 'abcdefghjkmn', files: [{ key: 'f/abcdefghjkmn/0-x', name: 'x' }] }))).status).toBe(400)
  })

  it('does not leak internals when storage blows up', async () => {
    storage.put = async () => {
      throw new Error('AccessDenied: secret-account-id-1234')
    }
    const res = await createShare(req('POST', '/api/share', { kind: 'text', text: 'x' }))
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('secret-account-id')
  })

  it('files: upload -> finalize -> list -> download', async () => {
    const up = await (await upload(req('POST', '/api/upload', { files: [{ name: 'pic.png', type: 'image/png', size: 100 }, { name: 'bundle.zip', type: 'application/zip', size: 200 }] }))).json()
    storage.seedFile(up.files[0].key, 100, 'image/png')
    storage.seedFile(up.files[1].key, 200, 'application/zip')

    const made = await create({ kind: 'files', uploadId: up.uploadId, files: [{ key: up.files[0].key, name: 'pic.png' }, { key: up.files[1].key, name: 'bundle.zip' }], ttl: 99999999 })
    expect(made.expiresAt - made.createdAt).toBe(24 * 3600 * 1000)

    const pub = await (await getShare(req('GET', `/api/share/${made.code}`), ctx({ ref: made.code }))).json()
    expect(pub.files.map((f: any) => [f.name, f.preview, f.url])).toEqual([
      ['pic.png', 'image', `/api/file/${made.id}/0`],
      ['bundle.zip', null, `/api/file/${made.id}/1`],
    ])
    expect(JSON.stringify(pub)).not.toContain('f/')
  })
})

describe('GET /api/file/{id}/{index}', () => {
  async function shareWith(files: Array<{ name: string; type: string }>) {
    const up = await (await upload(req('POST', '/api/upload', { files: files.map(f => ({ ...f, size: 10 })) }))).json()
    up.files.forEach((f: any, i: number) => storage.seedFile(f.key, 10, files[i].type))
    const made = await (await createShare(req('POST', '/api/share', { kind: 'files', uploadId: up.uploadId, files: up.files.map((f: any, i: number) => ({ key: f.key, name: files[i].name })) }))).json()
    return made.id as string
  }
  const dl = (id: string, i: number | string, qs = '') => getFile(req('GET', `/api/file/${id}/${i}${qs}`), ctx({ id, index: String(i) }))
  const loc = (r: Response) => new URL(r.headers.get('location')!)

  it('forces download for non-media, even if the uploader lied about the type', async () => {
    const id = await shareWith([{ name: 'evil.html', type: 'text/html' }, { name: 'logo.svg', type: 'image/svg+xml' }, { name: 'a.zip', type: 'application/zip' }])
    for (const i of [0, 1, 2]) {
      const r = await dl(id, i)
      expect(r.status).toBe(302)
      expect(loc(r).hostname).toBe('r2.test')
      expect(loc(r).searchParams.get('cd')).toMatch(/^attachment;/)
      expect(loc(r).searchParams.get('ct')).toBe('application/octet-stream')
    }
  })

  it('renders images/video inline, unless ?dl=1', async () => {
    const id = await shareWith([{ name: 'cat.png', type: 'image/png' }, { name: 'clip.mp4', type: 'video/mp4' }])
    const inline = await dl(id, 0)
    expect(loc(inline).searchParams.get('cd')).toMatch(/^inline;/)
    expect(loc(inline).searchParams.get('ct')).toBe('image/png')
    expect(loc(await dl(id, 1)).searchParams.get('ct')).toBe('video/mp4')
    expect(loc(await dl(id, 0, '?dl=1')).searchParams.get('cd')).toMatch(/^attachment;/)
  })

  it('signed download links are short-lived and never outlive the share', async () => {
    const id = await shareWith([{ name: 'a.zip', type: 'application/zip' }])
    await dl(id, 0)
    expect(storage.presigned.at(-1)!.opts.expiresIn).toBeLessThanOrEqual(300)
  })

  it('404s for expired shares, bad indexes and bad ids', async () => {
    const id = await shareWith([{ name: 'a.zip', type: 'application/zip' }])
    expect((await dl(id, 5)).status).toBe(404)
    expect((await dl(id, -1)).status).toBe(404)
    expect((await dl(id, 'x')).status).toBe(404)
    expect((await dl('not-an-id', 0)).status).toBe(404)
    expect((await dl('abcdefghjkmn', 0)).status).toBe(404)

    const m = JSON.parse((await storage.get(`s/${id}.json`))!)
    m.expiresAt = Date.now() - 1
    await storage.put(`s/${id}.json`, JSON.stringify(m))
    expect((await dl(id, 0)).status).toBe(404)
  })

  it('a text share has no files to download', async () => {
    const made = await (await createShare(req('POST', '/api/share', { kind: 'text', text: 'hi' }))).json()
    expect((await dl(made.id, 0)).status).toBe(404)
  })
})

describe('GET /api/cron/cleanup', () => {
  const call = (auth?: string, qs = '') => cron(req('GET', `/api/cron/cleanup${qs}`, undefined, auth ? { authorization: auth } : {}))
  afterEach(() => {
    delete process.env.CRON_SECRET
  })

  it('is disabled until CRON_SECRET is set (never an open delete endpoint)', async () => {
    expect((await call()).status).toBe(503)
    expect((await call('Bearer anything')).status).toBe(503)
  })

  it('rejects wrong or missing credentials', async () => {
    process.env.CRON_SECRET = 's3cret-value'
    expect((await call()).status).toBe(401)
    expect((await call('Bearer wrong')).status).toBe(401)
    expect((await call('s3cret-value')).status).toBe(401)
  })

  it('runs for the right secret, and ?dry=1 deletes nothing', async () => {
    process.env.CRON_SECRET = 's3cret-value'
    storage.seedFile('pastes/old', 5, 'x', Date.now() - 30 * 86400_000)
    const dry = await call('Bearer s3cret-value', '?dry=1')
    expect(dry.status).toBe(200)
    expect(await dry.json()).toMatchObject({ dryRun: true, legacyObjects: 1, deleted: 0 })
    expect(storage.objects.has('pastes/old')).toBe(true)

    const real = await call('Bearer s3cret-value')
    expect(await real.json()).toMatchObject({ dryRun: false, deleted: 1 })
    expect(storage.objects.has('pastes/old')).toBe(false)
  })
})
