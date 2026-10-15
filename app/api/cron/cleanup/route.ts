import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { getStorage } from '@/lib/server/storage'
import { runCleanup } from '@/lib/server/cleanup'
import { handleError, jsonError } from '@/lib/server/http'

export const maxDuration = 60

function authorized(req: NextRequest, secret: string) {
  const given = Buffer.from(req.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${secret}`)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

// GET /api/cron/cleanup — called daily by Vercel Cron (see vercel.json).
// Vercel automatically sends `Authorization: Bearer $CRON_SECRET` when that env var exists.
// Add ?dry=1 to see what would be deleted without deleting anything.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  // Without a secret this endpoint would let anyone trigger mass deletion, so it stays off.
  if (!secret) return jsonError('CRON_SECRET is not configured', 503)
  if (!authorized(req, secret)) return jsonError('Unauthorized', 401)

  try {
    const summary = await runCleanup(getStorage(), { dryRun: req.nextUrl.searchParams.get('dry') === '1' })
    console.log('[cleanup]', JSON.stringify(summary))
    if (summary.nearFreeLimit) {
      console.warn('[cleanup] storage is above 80% of the R2 free tier. Lower DAILY_UPLOAD_CAP_MB or shorten retention.')
    }
    return NextResponse.json(summary, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    return handleError(err, 'cleanup')
  }
}
