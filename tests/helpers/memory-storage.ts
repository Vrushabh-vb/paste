import type { Storage, StoredObjectInfo } from '@/lib/server/storage'

interface Entry {
  body: string
  size: number
  contentType?: string
  lastModified: number
}

/** In-memory stand-in for R2 with the same semantics the app relies on (conditional create, prefix list). */
export class MemoryStorage implements Storage {
  objects = new Map<string, Entry>()
  now = () => Date.now()
  presigned: Array<{ kind: 'put' | 'get'; key: string; opts: any }> = []

  async put(key: string, body: string, opts: { contentType?: string; ifNoneMatch?: boolean } = {}) {
    if (opts.ifNoneMatch && this.objects.has(key)) return 'exists' as const
    this.objects.set(key, { body, size: Buffer.byteLength(body), contentType: opts.contentType, lastModified: this.now() })
    return 'ok' as const
  }
  async get(key: string) {
    return this.objects.get(key)?.body ?? null
  }
  async head(key: string) {
    const o = this.objects.get(key)
    return o ? { size: o.size, contentType: o.contentType } : null
  }
  async list(prefix: string): Promise<StoredObjectInfo[]> {
    return [...this.objects.entries()]
      .filter(([k]) => k.startsWith(prefix))
      .map(([key, o]) => ({ key, size: o.size, lastModified: o.lastModified }))
  }
  async deleteMany(keys: string[]) {
    let n = 0
    for (const k of keys) if (this.objects.delete(k)) n++
    return n
  }
  async presignPut(key: string, opts: any) {
    this.presigned.push({ kind: 'put', key, opts })
    return `https://r2.test/put/${key}?size=${opts.size}`
  }
  async presignGet(key: string, opts: any) {
    this.presigned.push({ kind: 'get', key, opts })
    return `https://r2.test/get/${key}?cd=${encodeURIComponent(opts.disposition ?? '')}&ct=${encodeURIComponent(opts.contentType ?? '')}`
  }

  /** Pretend the browser already PUT a file of `size` bytes (without allocating it). */
  seedFile(key: string, size: number, contentType = 'application/octet-stream', lastModified = this.now()) {
    this.objects.set(key, { body: '', size, contentType, lastModified })
  }
  age(key: string, ms: number) {
    const o = this.objects.get(key)
    if (o) o.lastModified -= ms
  }
}
