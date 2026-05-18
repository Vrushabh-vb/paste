import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { NextRequest, NextResponse } from 'next/server'

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

// GET /api/code/[code] — retrieve the hash for a given code (cross-device lookup)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    if (!code?.match(/^\d{4,5}$/)) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    const bucket = process.env.R2_BUCKET_NAME
    if (!bucket) {
      return NextResponse.json({ error: 'R2 not configured' }, { status: 500 })
    }

    const r2 = getR2Client()
    const response = await r2.send(new GetObjectCommand({
      Bucket: bucket,
      Key: `codes/${code}.txt`,
    }))

    const hash = await response.Body?.transformToString()
    if (!hash) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ hash })
  } catch (err: any) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return NextResponse.json({ error: 'Code not found or expired' }, { status: 404 })
    }
    console.error('[code lookup]', err)
    return NextResponse.json({ error: err.message || 'Lookup failed' }, { status: 500 })
  }
}
