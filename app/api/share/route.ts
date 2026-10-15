import { NextRequest } from 'next/server'
import { getStorage } from '@/lib/server/storage'
import { handleError, json, limited, readJson } from '@/lib/server/http'
import { createFileShare, createTextShare, ShareError } from '@/lib/server/shares'

// POST /api/share — create a share.
//   { kind: 'text',  text, ttl, allowEditing, isCode }
//   { kind: 'files', uploadId, files: [{ key, name }], ttl }   (after the files were PUT to R2)
export async function POST(req: NextRequest) {
  try {
    const limit = await limited(req, 'create')
    if (limit) return limit

    const body = await readJson(req)
    const storage = getStorage()

    let manifest
    if (body?.kind === 'text') manifest = await createTextShare(storage, body)
    else if (body?.kind === 'files') manifest = await createFileShare(storage, body)
    else throw new ShareError('kind must be "text" or "files"', 400)

    return json({
      id: manifest.id,
      code: manifest.code,
      expiresAt: manifest.expiresAt,
      createdAt: manifest.createdAt,
      kind: manifest.kind,
      url: `/view/${manifest.id}`,
    })
  } catch (err) {
    return handleError(err, 'share:create')
  }
}
