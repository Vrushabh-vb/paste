import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clientIp, rateLimit, reserveDailyBytes, resetRateLimitsForTests } from '@/lib/server/rate-limit'

beforeEach(() => {
  resetRateLimitsForTests()
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
  delete process.env.DAILY_UPLOAD_CAP_MB
})
afterEach(() => vi.unstubAllGlobals())

describe('rateLimit (in-memory)', () => {
  const cfg = { limit: 3, windowSeconds: 60 }

  it('allows up to the limit then blocks, with a sensible retry-after', async () => {
    const t = 1_000_000
    for (let i = 0; i < 3; i++) expect((await rateLimit('s', 'ip', cfg, t)).ok).toBe(true)
    const blocked = await rateLimit('s', 'ip', cfg, t + 10_000)
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfter).toBe(50)
  })

  it('resets after the window', async () => {
    const t = 1_000_000
    for (let i = 0; i < 4; i++) await rateLimit('s', 'ip', cfg, t)
    expect((await rateLimit('s', 'ip', cfg, t + 60_001)).ok).toBe(true)
  })

  it('keeps different IPs and scopes separate', async () => {
    for (let i = 0; i < 4; i++) await rateLimit('s', 'a', cfg, 1)
    expect((await rateLimit('s', 'b', cfg, 1)).ok).toBe(true)
    expect((await rateLimit('other', 'a', cfg, 1)).ok).toBe(true)
  })
})

describe('rateLimit (Upstash)', () => {
  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io/'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'tok'
  })

  it('sends an atomic INCRBY + EXPIRE NX pipeline with the bearer token', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([{ result: 1 }, { result: 1 }])))
    vi.stubGlobal('fetch', fetchMock)
    const r = await rateLimit('create', '1.2.3.4', { limit: 5, windowSeconds: 3600 })
    expect(r.ok).toBe(true)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://example.upstash.io/pipeline')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
    expect(JSON.parse(init.body as string)).toEqual([
      ['INCRBY', 'rl:create:1.2.3.4', '1'],
      ['EXPIRE', 'rl:create:1.2.3.4', '3600', 'NX'],
    ])
  })

  it('blocks when the shared counter exceeds the limit', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([{ result: 6 }, { result: 0 }]))))
    expect((await rateLimit('create', 'ip', { limit: 5, windowSeconds: 60 })).ok).toBe(false)
  })

  it('falls back to memory (and keeps limiting) when Redis is down', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down') }))
    const cfg = { limit: 2, windowSeconds: 60 }
    expect((await rateLimit('s', 'ip', cfg)).ok).toBe(true)
    expect((await rateLimit('s', 'ip', cfg)).ok).toBe(true)
    expect((await rateLimit('s', 'ip', cfg)).ok).toBe(false)
  })

  it('treats an error payload as a failure and falls back', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([{ error: 'WRONGTYPE' }]))))
    expect((await rateLimit('s', 'ip', { limit: 1, windowSeconds: 60 })).ok).toBe(true)
  })
})

describe('reserveDailyBytes', () => {
  it('allows uploads until the day budget is spent, then refuses', async () => {
    process.env.DAILY_UPLOAD_CAP_MB = '100'
    const mb = 1024 * 1024
    expect(await reserveDailyBytes(60 * mb, 0)).toBe(true)
    expect(await reserveDailyBytes(40 * mb, 0)).toBe(true)
    expect(await reserveDailyBytes(1, 0)).toBe(false)
  })

  it('a refused request gives its bytes back, so smaller uploads still fit in what is left', async () => {
    process.env.DAILY_UPLOAD_CAP_MB = '100'
    const mb = 1024 * 1024
    expect(await reserveDailyBytes(60 * mb, 0)).toBe(true)
    expect(await reserveDailyBytes(60 * mb, 0)).toBe(false) // would be 120 MB: refused
    expect(await reserveDailyBytes(40 * mb, 0)).toBe(true) // 60 + 40 = 100 MB still fits
    expect(await reserveDailyBytes(1, 0)).toBe(false)
  })

  it('the 3 GB default lets exactly three 1 GB uploads through, then refuses the rest of the day', async () => {
    const gb = 1024 ** 3
    const results = []
    for (let i = 0; i < 11; i++) results.push(await reserveDailyBytes(gb, 0))
    expect(results).toEqual([true, true, true, ...Array(8).fill(false)])
  })

  it('on Redis, a refused reservation is rolled back with a negative INCRBY', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'tok'
    process.env.DAILY_UPLOAD_CAP_MB = '100'
    const bodies: unknown[] = []
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      bodies.push(JSON.parse(init.body as string))
      return new Response(JSON.stringify([{ result: 150 * 1024 * 1024 }, { result: 0 }])) // over the cap
    })
    vi.stubGlobal('fetch', fetchMock)
    expect(await reserveDailyBytes(60 * 1024 * 1024, 0)).toBe(false)
    expect(bodies).toHaveLength(2)
    expect((bodies[1] as string[][])[0]).toEqual(['INCRBY', 'cap:bytes:1970-01-01', String(-60 * 1024 * 1024)])
  })

  it('starts a fresh budget the next UTC day', async () => {
    process.env.DAILY_UPLOAD_CAP_MB = '1'
    const day = 86400_000
    expect(await reserveDailyBytes(1024 * 1024, 0)).toBe(true)
    expect(await reserveDailyBytes(1, 0)).toBe(false)
    expect(await reserveDailyBytes(1024 * 1024, day)).toBe(true)
  })
})

describe('clientIp', () => {
  it('uses the first x-forwarded-for hop, then x-real-ip, then a placeholder', () => {
    expect(clientIp(new Request('http://x', { headers: { 'x-forwarded-for': '9.9.9.9, 10.0.0.1' } }))).toBe('9.9.9.9')
    expect(clientIp(new Request('http://x', { headers: { 'x-real-ip': '8.8.8.8' } }))).toBe('8.8.8.8')
    expect(clientIp(new Request('http://x'))).toBe('local')
  })
})
