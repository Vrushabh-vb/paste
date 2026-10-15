// Physically removes expired data so storage stays inside the free tier and "auto-expiring" is true.
// Logical expiry is already enforced on every read; this reclaims the space.
import {
  FILE_RETENTION_MS,
  LEGACY_PREFIXES,
  PREFIX_CODE,
  PREFIX_FILE,
  PREFIX_SHARE,
  R2_FREE_TIER_BYTES,
  SHARE_RETENTION_MS,
  STORAGE_WARN_FRACTION,
} from '@/lib/config'
import type { ShareManifest } from './shares'
import type { Storage, StoredObjectInfo } from './storage'

export interface CleanupSummary {
  dryRun: boolean
  expiredShares: number
  orphanFiles: number
  orphanCodes: number
  legacyObjects: number
  deleted: number
  skippedUnread: number // manifests left for the next run because of maxReads
  freedBytes: number // bytes removed (or that would be removed in a dry run)
  storedBytes: number // bytes left in the bucket after this run
  nearFreeLimit: boolean // true when storedBytes is above 80% of R2's free 10 GB
}

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        out[i] = await fn(items[i])
      }
    }),
  )
  return out
}

export async function runCleanup(
  storage: Storage,
  opts: { now?: number; dryRun?: boolean; maxReads?: number; concurrency?: number } = {},
): Promise<CleanupSummary> {
  const now = opts.now ?? Date.now()
  const dryRun = opts.dryRun ?? false
  const maxReads = opts.maxReads ?? 3000
  const concurrency = opts.concurrency ?? 20
  const toDelete = new Set<string>()
  const sizes = new Map<string, number>() // every object we saw, for the storage report
  const list = async (prefix: string): Promise<StoredObjectInfo[]> => {
    const objects = await storage.list(prefix)
    for (const o of objects) sizes.set(o.key, o.size)
    return objects
  }
  const summary: CleanupSummary = {
    dryRun,
    expiredShares: 0,
    orphanFiles: 0,
    orphanCodes: 0,
    legacyObjects: 0,
    deleted: 0,
    skippedUnread: 0,
    freedBytes: 0,
    storedBytes: 0,
    nearFreeLimit: false,
  }

  // 1. Shares: read each manifest; if expired (or unreadable) remove it, its code and its files.
  const manifests = await list(PREFIX_SHARE)
  const toRead = manifests.slice(0, maxReads)
  summary.skippedUnread = manifests.length - toRead.length
  const files = await list(PREFIX_FILE) // listed up front so expired shares' files count towards freedBytes
  const codes = await list(PREFIX_CODE)
  await mapPool(toRead, concurrency, async obj => {
    let m: ShareManifest | null = null
    try {
      const raw = await storage.get(obj.key)
      m = raw ? (JSON.parse(raw) as ShareManifest) : null
    } catch {
      m = null
    }
    const tooOld = now - obj.lastModified > SHARE_RETENTION_MS
    if (m && m.expiresAt > now && !tooOld) return // still live
    summary.expiredShares++
    toDelete.add(obj.key)
    if (m?.code) toDelete.add(`${PREFIX_CODE}${m.code}`)
    for (const f of m?.files ?? []) toDelete.add(f.key)
  })

  // 2. Files that never made it into a share (abandoned uploads) or that outlived every share.
  for (const o of files) {
    if (now - o.lastModified > FILE_RETENTION_MS && !toDelete.has(o.key)) {
      summary.orphanFiles++
      toDelete.add(o.key)
    }
  }

  // 3. Code mappings whose share is gone.
  for (const o of codes) {
    if (now - o.lastModified > SHARE_RETENTION_MS && !toDelete.has(o.key)) {
      summary.orphanCodes++
      toDelete.add(o.key)
    }
  }

  // 4. Pre-v2 layout: everything there promised a 24h maximum.
  for (const prefix of LEGACY_PREFIXES) {
    for (const o of await list(prefix)) {
      if (now - o.lastModified > FILE_RETENTION_MS) {
        summary.legacyObjects++
        toDelete.add(o.key)
      }
    }
  }

  for (const key of toDelete) summary.freedBytes += sizes.get(key) ?? 0
  for (const [key, size] of sizes) if (!toDelete.has(key)) summary.storedBytes += size
  summary.nearFreeLimit = summary.storedBytes > R2_FREE_TIER_BYTES * STORAGE_WARN_FRACTION

  if (!dryRun && toDelete.size > 0) summary.deleted = await storage.deleteMany([...toDelete])
  return summary
}
