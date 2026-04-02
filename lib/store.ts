import { Redis } from '@upstash/redis'

// ─── Constants ────────────────────────────────────────────
export const MAX_FILE_SIZE = 500 * 1024 * 1024       // 500MB per file
export const MAX_TOTAL_FILES_SIZE = 500 * 1024 * 1024 // 500MB total
export const MAX_FILES = 20
export const MAX_TEXT_SIZE = 10 * 1024 * 1024          // 10MB for text content

export const EXPIRATION_OPTIONS: Record<string, number> = {
  '5min': 5 * 60,
  '30min': 30 * 60,
  '1hour': 60 * 60,
  '6hours': 6 * 60 * 60,
  '12hours': 12 * 60 * 60,
  '1day': 24 * 60 * 60,
  '3days': 3 * 24 * 60 * 60,
  '7days': 7 * 24 * 60 * 60,
  '30days': 30 * 24 * 60 * 60,
}

export const DEFAULT_TTL_SECONDS = EXPIRATION_OPTIONS['30min'] // 30 minutes

// ─── Type definitions ─────────────────────────────────────
export interface BlobFileRef {
  name: string
  type: string
  url: string        // Vercel Blob URL (public CDN)
  size: number
}

export interface PasteRecord {
  content: string
  createdAt: number
  expiresAt: number
  fileName?: string
  fileType?: string
  isFile?: boolean
  files?: BlobFileRef[]
  isMultiFile?: boolean
  allowEditing?: boolean
  downloadCount?: number
  isCode?: boolean
}

// ─── Redis client (lazy singleton) ────────────────────────
let _redis: Redis | null = null

function getRedis(): Redis {
  if (!_redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN

    if (!url || !token) {
      throw new Error(
        'Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN. ' +
        'Add a Redis integration from Vercel Marketplace or set these env vars.'
      )
    }
    _redis = new Redis({ url, token })
  }
  return _redis
}

// ─── Key helpers ──────────────────────────────────────────
function pasteKey(code: string) {
  return `paste:${code}`
}

// ─── Generate a unique 4-digit code ───────────────────────
export async function generateCode(): Promise<string> {
  const redis = getRedis()
  let attempts = 0
  const maxAttempts = 50

  while (attempts < maxAttempts) {
    const code = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    const exists = await redis.exists(pasteKey(code))
    if (!exists) return code
    attempts++
  }

  // Fallback: 5-digit code if 4-digit space is crowded
  const code = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return code
}

// ─── CRUD operations ─────────────────────────────────────
export async function savePaste(code: string, data: PasteRecord, ttlSeconds: number): Promise<void> {
  const redis = getRedis()
  await redis.set(pasteKey(code), JSON.stringify(data), { ex: ttlSeconds })
}

export async function getPaste(code: string): Promise<PasteRecord | null> {
  const redis = getRedis()
  const raw = await redis.get<string>(pasteKey(code))
  if (!raw) return null
  // Upstash may return parsed JSON or string depending on content
  if (typeof raw === 'object') return raw as unknown as PasteRecord
  return JSON.parse(raw)
}

export async function updatePaste(code: string, data: PasteRecord): Promise<void> {
  const redis = getRedis()
  const ttl = await redis.ttl(pasteKey(code))
  if (ttl <= 0) return
  await redis.set(pasteKey(code), JSON.stringify(data), { ex: ttl })
}

export async function deletePaste(code: string): Promise<void> {
  const redis = getRedis()
  await redis.del(pasteKey(code))
}

// ─── Formatting helper ───────────────────────────────────
export function formatExpirationTime(ms: number): string {
  const minutes = Math.floor(ms / (1000 * 60))
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`
  return `${minutes} minute${minutes > 1 ? 's' : ''}`
}