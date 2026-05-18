import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { NextRequest, NextResponse } from 'next/server'

const MAX_HASH_BYTES = 512 * 1024 // 512KB — plenty for any LZ-compressed paste

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing R2 environment variables')
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  })
}

// POST /api/code — register a code→hash mapping so any device can look it up
export async function POST(req: NextRequest) {
  try {
    const { code, hash } = await req.json()

    if (!code?.match(/^\d{4,5}$/) || typeof hash !== 'string' || !hash) {
      return NextResponse.json({ error: 'Invalid code or hash' }, { status: 400 })
    }

    if (Buffer.byteLength(hash, 'utf8') > MAX_HASH_BYTES) {
      return NextResponse.json({ error: 'Hash too large' }, { status: 400 })
    }

    const bucket = process.env.R2_BUCKET_NAME
    if (!bucket) {
      return NextResponse.json({ error: 'R2 not configured' }, { status: 500 })
    }

    const r2 = getR2Client()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    await r2.send(new PutObjectCommand({
      Bucket: bucket,
      Key: `codes/${code}.txt`,
      Body: hash,
      ContentType: 'text/plain',
      Metadata: { 'expires-at': expiresAt },
    }))

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[code register]', err)
    return NextResponse.json({ error: err.message || 'Failed to register code' }, { status: 500 })
  }
}
