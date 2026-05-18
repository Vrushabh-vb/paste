import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { NextRequest, NextResponse } from 'next/server'

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing R2 environment variables (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)')
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
}

const MAX_R2_TTL_SECONDS = 24 * 60 * 60 // hard cap: R2 files never stored > 24h

export async function POST(req: NextRequest) {
  try {
    const { filename, contentType, size, ttl } = await req.json()

    if (!filename || !contentType || typeof size !== 'number') {
      return NextResponse.json({ error: 'Missing filename, contentType, or size' }, { status: 400 })
    }

    const maxSize = 100 * 1024 * 1024 // 100MB
    if (size > maxSize) {
      return NextResponse.json({ error: 'File too large (max 100MB)' }, { status: 400 })
    }

    // Cap TTL at 24h regardless of what the client sends
    const effectiveTtl = Math.min(typeof ttl === 'number' && ttl > 0 ? ttl : MAX_R2_TTL_SECONDS, MAX_R2_TTL_SECONDS)
    const expiresAt = new Date(Date.now() + effectiveTtl * 1000).toISOString()

    const bucket = process.env.R2_BUCKET_NAME
    const publicBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL

    if (!bucket || !publicBase) {
      return NextResponse.json({ error: 'Missing R2_BUCKET_NAME or NEXT_PUBLIC_R2_PUBLIC_URL' }, { status: 500 })
    }

    // Sanitize filename to safe characters
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const key = `pastes/${Date.now()}_${safeName}`

    const r2 = getR2Client()
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      // Store expiry as metadata so R2 lifecycle rules can clean up
      Metadata: {
        'expires-at': expiresAt,
        'effective-ttl': String(effectiveTtl),
      },
    })

    // Presigned URL valid only as long as the effective TTL (max 24h)
    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: effectiveTtl })
    const publicUrl = `${publicBase.replace(/\/$/, '')}/${key}`

    return NextResponse.json({ uploadUrl, publicUrl, key })
  } catch (err: any) {
    console.error('[R2 upload]', err)
    return NextResponse.json({ error: err.message || 'Failed to generate upload URL' }, { status: 500 })
  }
}
