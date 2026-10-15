import { beforeEach, describe, expect, it } from 'vitest'
import { FILE_RETENTION_MS, SHARE_RETENTION_MS } from '@/lib/config'
import { runCleanup } from '@/lib/server/cleanup'
import { createFileShare, createTextShare } from '@/lib/server/shares'
import { MemoryStorage } from './helpers/memory-storage'

const HOUR = 3600_000
const DAY = 24 * HOUR
let storage: MemoryStorage
beforeEach(() => {
  storage = new MemoryStorage()
})

async function fileShare(now: number, ttl: number) {
  const up = 'abcdefghjkmn'
  const key = `f/${up}/0-a.bin`
  storage.seedFile(key, 10)
  const m = await createFileShare(storage, { uploadId: up, files: [{ key, name: 'a.bin' }], ttl }, now)
  return { m, key }
}

describe('runCleanup', () => {
  it('removes an expired share together with its code mapping and its files', async () => {
    const t0 = Date.now()
    const { m, key } = await fileShare(t0, 300)
    const res = await runCleanup(storage, { now: t0 + 301_000 })
    expect(res.expiredShares).toBe(1)
    expect(storage.objects.has(`s/${m.id}.json`)).toBe(false)
    expect(storage.objects.has(`c/${m.code}`)).toBe(false)
    expect(storage.objects.has(key)).toBe(false)
  })

  it('leaves live shares completely alone', async () => {
    const t0 = Date.now()
    const live = await createTextShare(storage, { text: 'still here', ttl: 3600 }, t0)
    const { m, key } = await fileShare(t0, 3600)
    const res = await runCleanup(storage, { now: t0 + 1000 })
    expect(res.deleted).toBe(0)
    for (const k of [`s/${live.id}.json`, `c/${live.code}`, `s/${m.id}.json`, `c/${m.code}`, key]) expect(storage.objects.has(k)).toBe(true)
  })

  it('deletes only the expired one when both exist', async () => {
    const t0 = Date.now()
    const dead = await createTextShare(storage, { text: 'dead', ttl: 60 }, t0)
    const alive = await createTextShare(storage, { text: 'alive', ttl: 3 * DAY / 1000 }, t0)
    await runCleanup(storage, { now: t0 + 120_000 })
    expect(storage.objects.has(`s/${dead.id}.json`)).toBe(false)
    expect(storage.objects.has(`s/${alive.id}.json`)).toBe(true)
    expect(storage.objects.has(`c/${alive.code}`)).toBe(true)
  })

  it('removes abandoned uploads, but not ones that may still be in progress', async () => {
    const now = Date.now()
    storage.seedFile('f/oldupload123/0-x', 5, 'a/b', now - FILE_RETENTION_MS - 1000)
    storage.seedFile('f/newupload456/0-x', 5, 'a/b', now - 10 * 60_000)
    await runCleanup(storage, { now })
    expect(storage.objects.has('f/oldupload123/0-x')).toBe(false)
    expect(storage.objects.has('f/newupload456/0-x')).toBe(true)
  })

  it('removes orphaned codes', async () => {
    const now = Date.now()
    storage.seedFile('c/654321', 12, 'text/plain', now - SHARE_RETENTION_MS - 1000)
    storage.seedFile('c/123456', 12, 'text/plain', now - 1000)
    await runCleanup(storage, { now })
    expect(storage.objects.has('c/654321')).toBe(false)
    expect(storage.objects.has('c/123456')).toBe(true)
  })

  it('purges the old pre-v2 data (the 150-day-old backlog) but spares fresh legacy objects', async () => {
    const now = Date.now()
    storage.seedFile('pastes/1_old.zip', 1e6, 'application/zip', now - 150 * DAY)
    storage.seedFile('codes/1234.txt', 100, 'text/plain', now - 150 * DAY)
    storage.seedFile('pastes/2_fresh.zip', 1e6, 'application/zip', now - 2 * HOUR)
    const res = await runCleanup(storage, { now })
    expect(res.legacyObjects).toBe(2)
    expect(storage.objects.has('pastes/2_fresh.zip')).toBe(true)
  })

  it('removes unreadable manifests instead of keeping them forever', async () => {
    await storage.put('s/brokenbroken.json', '{{{')
    const res = await runCleanup(storage)
    expect(res.expiredShares).toBe(1)
    expect(storage.objects.has('s/brokenbroken.json')).toBe(false)
  })

  it('never touches anything outside its own prefixes', async () => {
    storage.seedFile('somebody-elses/data.bin', 5, 'x', 0)
    storage.seedFile('zz-probe/x', 5, 'x', 0)
    await runCleanup(storage)
    expect(storage.objects.has('somebody-elses/data.bin')).toBe(true)
    expect(storage.objects.has('zz-probe/x')).toBe(true)
  })

  it('dry run reports but does not delete', async () => {
    const t0 = Date.now()
    await createTextShare(storage, { text: 'x', ttl: 60 }, t0)
    const before = storage.objects.size
    const res = await runCleanup(storage, { now: t0 + HOUR, dryRun: true })
    expect(res).toMatchObject({ dryRun: true, expiredShares: 1, deleted: 0 })
    expect(storage.objects.size).toBe(before)
  })

  it('reports bytes freed and bytes still stored', async () => {
    const t0 = Date.now()
    const { m } = await fileShare(t0, 60) // 10-byte file, expires in 60s
    const live = await createTextShare(storage, { text: 'abcde', ttl: 3600 }, t0)
    const liveSize = storage.objects.get(`s/${live.id}.json`)!.size + storage.objects.get(`c/${live.code}`)!.size
    const res = await runCleanup(storage, { now: t0 + 120_000 })
    expect(res.freedBytes).toBeGreaterThanOrEqual(10)
    expect(res.storedBytes).toBe(liveSize)
    expect(res.nearFreeLimit).toBe(false)
    expect(storage.objects.has(`s/${m.id}.json`)).toBe(false)
  })

  it('warns when stored data passes 80% of the free tier', async () => {
    storage.seedFile('f/bigbigbigbig/0-x', 8.5 * 1024 ** 3, 'a/b', Date.now()) // fresh, so it is kept
    const res = await runCleanup(storage)
    expect(res.storedBytes).toBeGreaterThan(8 * 1024 ** 3)
    expect(res.nearFreeLimit).toBe(true)
  })

  it('a dry run predicts exactly what a real run frees', async () => {
    const t0 = Date.now()
    await fileShare(t0, 60)
    storage.seedFile('pastes/old', 1234, 'x', t0 - 30 * DAY)
    const dry = await runCleanup(storage, { now: t0 + HOUR, dryRun: true })
    const real = await runCleanup(storage, { now: t0 + HOUR })
    expect(dry.freedBytes).toBe(real.freedBytes)
    expect(dry.storedBytes).toBe(real.storedBytes)
  })

  it('caps work per run and says how much is left', async () => {
    const t0 = Date.now()
    for (let i = 0; i < 5; i++) await createTextShare(storage, { text: 't' + i, ttl: 60 }, t0)
    const res = await runCleanup(storage, { now: t0 + HOUR, maxReads: 2 })
    expect(res.expiredShares).toBe(2)
    expect(res.skippedUnread).toBe(3)
    expect((await runCleanup(storage, { now: t0 + HOUR })).expiredShares).toBe(3)
  })
})
