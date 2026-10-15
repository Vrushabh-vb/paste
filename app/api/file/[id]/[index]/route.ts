import { NextRequest, NextResponse } from 'next/server'
import { ID_REGEX, previewKind } from '@/lib/config'
import { contentDisposition } from '@/lib/server/ids'
import { getStorage } from '@/lib/server/storage'
import { handleError, jsonError, limited } from '@/lib/server/http'
import { loadShare } from '@/lib/server/shares'

type Ctx = { params: Promise<{ id: string; index: string }> }

// GET /api/file/{id}/{index}[?dl=1]
// Checks the share is still live, then 302s to a short-lived signed R2 URL. Bytes never pass through
// Vercel (R2 egress is free), expiry is enforced on every download, and we decide how the browser
// treats the file: images/video/audio may render inline, everything else is forced to download.
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const { id, index } = await params
    const i = Number(index)
    if (!ID_REGEX.test(id) || !Number.isInteger(i) || i < 0) return jsonError('Not found', 404)

    const limit = await limited(req, 'file')
    if (limit) return limit

    const storage = getStorage()
    const manifest = await loadShare(storage, { type: 'id', value: id })
    const file = manifest?.files?.[i]
    if (!manifest || !file) return jsonError('Not found, or it has expired.', 404)

    const forceDownload = req.nextUrl.searchParams.get('dl') === '1'
    const preview = previewKind(file.type)
    const inline = !!preview && !forceDownload

    // Never longer than the share has left to live (min 30s so slow starts still work).
    const secondsLeft = Math.max(30, Math.floor((manifest.expiresAt - Date.now()) / 1000))
    const url = await storage.presignGet(file.key, {
      expiresIn: Math.min(300, secondsLeft),
      disposition: contentDisposition(inline ? 'inline' : 'attachment', file.name),
      contentType: inline ? file.type.split(';')[0].trim().toLowerCase() : 'application/octet-stream',
    })

    return NextResponse.redirect(url, { status: 302, headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    return handleError(err, 'file')
  }
}
