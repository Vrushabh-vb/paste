import { NextRequest } from 'next/server'
import { getStorage } from '@/lib/server/storage'
import { handleError, json, jsonError, limited, readJson } from '@/lib/server/http'
import { loadShare, parseRef, toPublic, updateText } from '@/lib/server/shares'

type Ctx = { params: Promise<{ ref: string }> }

const NOT_FOUND = 'Not found, or it has expired.'

// GET /api/share/{id or 6-digit code}
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const ref = parseRef((await params).ref)
    if (!ref) return jsonError(NOT_FOUND, 404)

    // Guessing codes is the realistic attack, so codes get the tight limit.
    const limit = await limited(req, ref.type === 'code' ? 'lookupCode' : 'lookupId')
    if (limit) return limit

    const manifest = await loadShare(getStorage(), ref)
    if (!manifest) return jsonError(NOT_FOUND, 404)
    return json(toPublic(manifest))
  } catch (err) {
    return handleError(err, 'share:get')
  }
}

// PUT /api/share/{id or code} — edit the text of a share created with "Allow editing".
// Expiry is never extended by an edit.
export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const ref = parseRef((await params).ref)
    if (!ref) return jsonError(NOT_FOUND, 404)

    const limit = await limited(req, 'edit')
    if (limit) return limit

    const storage = getStorage()
    const manifest = await loadShare(storage, ref)
    if (!manifest) return jsonError(NOT_FOUND, 404)

    const body = await readJson(req)
    const updated = await updateText(storage, manifest, body?.text)
    return json(toPublic(updated))
  } catch (err) {
    return handleError(err, 'share:put')
  }
}
