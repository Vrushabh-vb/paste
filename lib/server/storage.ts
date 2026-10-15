// Storage abstraction. Production uses Cloudflare R2 (S3 API); tests inject an in-memory fake.
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export interface StoredObjectInfo {
  key: string
  size: number
  lastModified: number
}

export interface Storage {
  /** Returns 'exists' when ifNoneMatch is set and the key is already taken. */
  put(
    key: string,
    body: string,
    opts?: { contentType?: string; metadata?: Record<string, string>; ifNoneMatch?: boolean },
  ): Promise<'ok' | 'exists'>
  get(key: string): Promise<string | null>
  head(key: string): Promise<{ size: number; contentType?: string } | null>
  list(prefix: string, opts?: { maxKeys?: number }): Promise<StoredObjectInfo[]>
  deleteMany(keys: string[]): Promise<number>
  /** URL the browser PUTs to. Content-Length and Content-Type are signed, so the real size is enforced by R2. */
  presignPut(
    key: string,
    opts: { contentType: string; size: number; expiresIn: number; metadata?: Record<string, string> },
  ): Promise<string>
  presignGet(
    key: string,
    opts: { expiresIn: number; disposition?: string; contentType?: string },
  ): Promise<string>
}

// ─── R2 implementation ────────────────────────────────────
class R2Storage implements Storage {
  constructor(
    private client: S3Client,
    private bucket: string,
  ) {}

  async put(key: string, body: string, opts: Parameters<Storage['put']>[2] = {}) {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: opts.contentType ?? 'application/octet-stream',
          Metadata: opts.metadata,
          ...(opts.ifNoneMatch ? { IfNoneMatch: '*' } : {}),
        }),
      )
      return 'ok' as const
    } catch (err: any) {
      if (err?.$metadata?.httpStatusCode === 412 || err?.name === 'PreconditionFailed') return 'exists' as const
      throw err
    }
  }

  async get(key: string) {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }))
      return (await res.Body?.transformToString()) ?? null
    } catch (err: any) {
      if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) return null
      throw err
    }
  }

  async head(key: string) {
    try {
      const res = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }))
      return { size: res.ContentLength ?? 0, contentType: res.ContentType }
    } catch (err: any) {
      if (err?.name === 'NotFound' || err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) return null
      throw err
    }
  }

  async list(prefix: string, opts: { maxKeys?: number } = {}) {
    const out: StoredObjectInfo[] = []
    let token: string | undefined
    do {
      const res = await this.client.send(
        new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, ContinuationToken: token }),
      )
      for (const o of res.Contents ?? []) {
        if (o.Key) out.push({ key: o.Key, size: o.Size ?? 0, lastModified: o.LastModified?.getTime() ?? 0 })
      }
      token = res.IsTruncated ? res.NextContinuationToken : undefined
      if (opts.maxKeys && out.length >= opts.maxKeys) break
    } while (token)
    return opts.maxKeys ? out.slice(0, opts.maxKeys) : out
  }

  async deleteMany(keys: string[]) {
    let deleted = 0
    for (let i = 0; i < keys.length; i += 1000) {
      const batch = keys.slice(i, i + 1000)
      const res = await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: { Objects: batch.map(Key => ({ Key })), Quiet: true },
        }),
      )
      deleted += batch.length - (res.Errors?.length ?? 0)
    }
    return deleted
  }

  presignPut(key: string, opts: Parameters<Storage['presignPut']>[1]) {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: opts.contentType,
        ContentLength: opts.size,
        Metadata: opts.metadata,
      }),
      { expiresIn: opts.expiresIn, signableHeaders: new Set(['content-length', 'content-type']) },
    )
  }

  presignGet(key: string, opts: Parameters<Storage['presignGet']>[1]) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: opts.disposition,
        ResponseContentType: opts.contentType,
      }),
      { expiresIn: opts.expiresIn },
    )
  }
}

let current: Storage | null = null

export function getStorage(): Storage {
  if (current) return current
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = process.env
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    throw new Error(
      'Storage is not configured (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME)',
    )
  }
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    forcePathStyle: true,
    // Without this the SDK bakes a CRC32 of an *empty* body into presigned PUT URLs.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  })
  current = new R2Storage(client, R2_BUCKET_NAME)
  return current
}

/** Tests only. */
export function setStorageForTests(storage: Storage | null) {
  current = storage
}
