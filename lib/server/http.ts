import { NextResponse } from 'next/server'
import { ShareError } from './shares'
import { rateLimit, clientIp, type LimitResult } from './rate-limit'
import { RATE_LIMITS } from '@/lib/config'

export function jsonError(message: string, status: number, headers?: Record<string, string>) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store', ...headers } })
}

export function json(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, { status: init?.status, headers: { 'Cache-Control': 'no-store' } })
}

/** Turn anything thrown inside a route into a safe JSON response (no internal details leaked). */
export function handleError(err: unknown, tag: string) {
  if (err instanceof ShareError) return jsonError(err.message, err.status)
  console.error(`[${tag}]`, err)
  return jsonError('Something went wrong on our side. Please try again.', 500)
}

export async function limited(
  req: Request,
  scope: keyof typeof RATE_LIMITS,
  idOverride?: string,
): Promise<Response | null> {
  const result: LimitResult = await rateLimit(scope, idOverride ?? clientIp(req), RATE_LIMITS[scope])
  if (result.ok) return null
  return jsonError('Too many requests. Please slow down and try again shortly.', 429, {
    'Retry-After': String(result.retryAfter),
  })
}

export async function readJson(req: Request): Promise<any> {
  try {
    return await req.json()
  } catch {
    throw new ShareError('Invalid JSON body', 400)
  }
}
