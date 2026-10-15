import { NextRequest } from 'next/server'
import { MAX_FILE_SIZE, MAX_FILES, MAX_TOTAL_FILES_SIZE, MAX_FILE_TTL_SECONDS, PREFIX_FILE } from '@/lib/config'
import { cleanDisplayName, generateId, safeKeyName } from '@/lib/server/ids'
import { getStorage } from '@/lib/server/storage'
import { reserveDailyBytes } from '@/lib/server/rate-limit'
import { handleError, json, jsonError, limited, readJson } from '@/lib/server/http'
import { ShareError } from '@/lib/server/shares'

const MIME = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/

// POST /api/upload — step 1 of a file share: get one presigned PUT URL per file.
// The browser then uploads straight to R2 (Vercel functions cap request bodies at 4.5MB).
export async function POST(req: NextRequest) {
  try {
    const limit = await limited(req, 'upload')
    if (limit) return limit

    const body = await readJson(req)
    const files = body?.files
    if (!Array.isArray(files) || files.length === 0) throw new ShareError('No files provided', 400)
    if (files.length > MAX_FILES) throw new ShareError(`Too many files (max ${MAX_FILES})`, 400)

    let total = 0
    for (const f of files) {
      if (typeof f?.name !== 'string' || !f.name) throw new ShareError('Each file needs a name', 400)
      if (!Number.isInteger(f.size) || f.size < 1) throw new ShareError(`"${cleanDisplayName(f.name)}" is empty or has an invalid size`, 400)
      if (f.size > MAX_FILE_SIZE) throw new ShareError(`"${cleanDisplayName(f.name)}" is larger than ${MAX_FILE_SIZE / 1024 / 1024}MB`, 413)
      total += f.size
    }
    if (total > MAX_TOTAL_FILES_SIZE) throw new ShareError(`Total size is larger than ${MAX_TOTAL_FILES_SIZE / 1024 / 1024}MB`, 413)

    if (!(await reserveDailyBytes(total))) {
      return jsonError('Free upload capacity for today has been used up. Text sharing still works — please try uploading again tomorrow.', 503)
    }

    const storage = getStorage()
    const uploadId = generateId()
    const expiresAt = new Date(Date.now() + MAX_FILE_TTL_SECONDS * 1000).toISOString()

    const out = await Promise.all(
      files.map(async (f: { name: string; type?: string; size: number }, i: number) => {
        const contentType = typeof f.type === 'string' && MIME.test(f.type.toLowerCase()) ? f.type.toLowerCase() : 'application/octet-stream'
        const key = `${PREFIX_FILE}${uploadId}/${i}-${safeKeyName(f.name)}`
        const uploadUrl = await storage.presignPut(key, {
          contentType,
          size: f.size,
          expiresIn: 60 * 60,
          metadata: { 'expires-at': expiresAt },
        })
        return { key, uploadUrl, contentType }
      }),
    )

    return json({ uploadId, files: out })
  } catch (err) {
    return handleError(err, 'upload')
  }
}
