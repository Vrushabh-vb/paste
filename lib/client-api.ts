// Browser-side calls to our API. Every function throws an Error whose message is safe to show to the user.
import type { PublicShare } from '@/lib/server/shares'

export type { PublicShare }

export interface CreatedShare {
  id: string
  code: string
  url: string
  kind: 'text' | 'files'
  createdAt: number
  expiresAt: number
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(input, init)
  } catch {
    throw new Error('Network error. Check your connection and try again.')
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(body?.error || `Request failed (${res.status})`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return body as T
}

const post = (url: string, body: unknown) =>
  request<any>(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export const createTextShare = (input: { text: string; ttl: number; allowEditing: boolean; isCode: boolean }) =>
  post('/api/share', { kind: 'text', ...input }) as Promise<CreatedShare>

export const getShare = (ref: string) => request<PublicShare>(`/api/share/${encodeURIComponent(ref)}`)

export const updateShareText = (ref: string, text: string) =>
  request<PublicShare>(`/api/share/${encodeURIComponent(ref)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })

// ─── Files ────────────────────────────────────────────────
function putWithProgress(url: string, file: File, contentType: string, onProgress: (loaded: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.upload.onprogress = e => e.lengthComputable && onProgress(e.loaded)
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve()
      reject(new Error(`Upload of "${file.name}" was rejected (${xhr.status}). Please try again.`))
    }
    xhr.onerror = () => {
      // The browser hides the reason. The usual cause is the bucket's CORS policy, so leave a hint for the site owner.
      // (warn, not error: console.error opens Next's full-screen dev overlay for something the UI already reports.)
      console.warn(`[upload] PUT to storage failed. If this happens for every file, "${window.location.origin}" is probably missing from the R2 bucket's CORS AllowedOrigins (see README step 3).`)
      // Origins must match exactly: localhost, 127.0.0.1 and a LAN IP such as 192.168.x.x are all different origins.
      const devHint = process.env.NODE_ENV === 'production' ? '' : ` [dev: add ${window.location.origin} to the R2 bucket CORS AllowedOrigins, or open the site via http://localhost:3000]`
      reject(new Error(`Upload of "${file.name}" failed. Check your connection and try again.${devHint}`))
    }
    xhr.onabort = () => reject(new Error('Upload cancelled'))
    xhr.send(file)
  })
}

/** Presign -> PUT every file straight to storage (3 at a time) -> finalize into a share. */
export async function createFileShare(
  files: File[],
  ttl: number,
  onProgress?: (fraction: number) => void,
): Promise<CreatedShare> {
  const signed = await post('/api/upload', {
    files: files.map(f => ({ name: f.name, type: f.type || 'application/octet-stream', size: f.size })),
  })
  const total = files.reduce((s, f) => s + f.size, 0)
  const loaded = new Array(files.length).fill(0)
  const report = () => onProgress?.(Math.min(1, loaded.reduce((a, b) => a + b, 0) / total))

  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(3, files.length) }, async () => {
      while (next < files.length) {
        const i = next++
        await putWithProgress(signed.files[i].uploadUrl, files[i], signed.files[i].contentType, n => {
          loaded[i] = n
          report()
        })
        loaded[i] = files[i].size
        report()
      }
    }),
  )

  return post('/api/share', {
    kind: 'files',
    uploadId: signed.uploadId,
    ttl,
    files: files.map((f, i) => ({ key: signed.files[i].key, name: f.name })),
  })
}
