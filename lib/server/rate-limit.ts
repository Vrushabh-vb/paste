// Fixed-window counters. Uses Upstash Redis (free tier) when UPSTASH_REDIS_REST_URL/TOKEN are set,
// otherwise falls back to per-instance memory, which is only best-effort on serverless.
import { DEFAULT_DAILY_UPLOAD_CAP_BYTES } from '@/lib/config'

export interface LimitResult {
  ok: boolean
  retryAfter: number // seconds
}

const memory = new Map<string, { count: number; resetAt: number }>()

function memoryIncr(key: string, by: number, windowSeconds: number, now: number): { count: number; resetAt: number } {
  let entry = memory.get(key)
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowSeconds * 1000 }
    memory.set(key, entry)
    // opportunistic GC so the map cannot grow forever
    if (memory.size > 5000) for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k)
  }
  entry.count += by
  return entry
}

async function redisIncr(key: string, by: number, windowSeconds: number): Promise<number> {
  const url = process.env.UPSTASH_REDIS_REST_URL!
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!
  const res = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      ['INCRBY', key, String(by)],
      ['EXPIRE', key, String(windowSeconds), 'NX'],
    ]),
  })
  if (!res.ok) throw new Error(`Upstash ${res.status}`)
  const out = (await res.json()) as Array<{ result?: number; error?: string }>
  if (out[0]?.error || typeof out[0]?.result !== 'number') throw new Error(out[0]?.error || 'Upstash: bad response')
  return out[0].result
}

const hasRedis = () => !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

/** Count one hit for `key`; ok=false once `limit` is exceeded within the window. */
export async function rateLimit(
  scope: string,
  id: string,
  { limit, windowSeconds }: { limit: number; windowSeconds: number },
  now = Date.now(),
): Promise<LimitResult> {
  const key = `rl:${scope}:${id}`
  try {
    if (hasRedis()) {
      const count = await redisIncr(key, 1, windowSeconds)
      return { ok: count <= limit, retryAfter: windowSeconds }
    }
  } catch (err) {
    // Never take the site down because the limiter is down: fall through to memory.
    console.warn('[rate-limit] redis failed, using memory:', (err as Error).message)
  }
  const entry = memoryIncr(key, 1, windowSeconds, now)
  return { ok: entry.count <= limit, retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) }
}

/**
 * Global circuit breaker: reserve `bytes` against today's (UTC) upload budget.
 * Keeps total storage inside the R2 free tier no matter how many IPs an abuser has.
 */
export async function reserveDailyBytes(bytes: number, now = Date.now()): Promise<boolean> {
  const cap = Number(process.env.DAILY_UPLOAD_CAP_MB) > 0
    ? Number(process.env.DAILY_UPLOAD_CAP_MB) * 1024 * 1024
    : DEFAULT_DAILY_UPLOAD_CAP_BYTES
  const day = new Date(now).toISOString().slice(0, 10)
  const key = `cap:bytes:${day}`
  const ttl = 2 * 24 * 60 * 60
  try {
    if (hasRedis()) {
      if ((await redisIncr(key, bytes, ttl)) <= cap) return true
      // Refused: give the bytes back, otherwise one oversized request would also lock out the budget still left.
      await redisIncr(key, -bytes, ttl).catch(() => {})
      return false
    }
  } catch (err) {
    console.warn('[daily-cap] redis failed, using memory:', (err as Error).message)
  }
  const entry = memoryIncr(key, bytes, ttl, now)
  if (entry.count <= cap) return true
  entry.count -= bytes
  return false
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  return (fwd?.split(',')[0] || req.headers.get('x-real-ip') || 'local').trim()
}

/** Tests only. */
export function resetRateLimitsForTests() {
  memory.clear()
}
