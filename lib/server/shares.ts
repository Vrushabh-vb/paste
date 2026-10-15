// Share lifecycle: create, look up by id or code, edit. All storage goes through the Storage interface.
import {
  CODE_REGEX,
  ID_REGEX,
  MAX_FILE_SIZE,
  MAX_FILE_TTL_SECONDS,
  MAX_FILES,
  MAX_TEXT_BYTES,
  MAX_TEXT_TTL_SECONDS,
  MAX_TOTAL_FILES_SIZE,
  DEFAULT_TTL_SECONDS,
  PREFIX_CODE,
  PREFIX_FILE,
  PREFIX_SHARE,
  previewKind,
} from '@/lib/config'
import { cleanDisplayName, generateCode, generateId } from './ids'
import type { Storage } from './storage'

export class ShareError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

export interface ShareFile {
  key: string
  name: string
  type: string
  size: number
}

export interface ShareManifest {
  v: 2
  id: string
  code: string
  kind: 'text' | 'files'
  createdAt: number
  expiresAt: number
  allowEditing?: boolean
  isCode?: boolean
  text?: string
  files?: ShareFile[]
}

/** What the API returns to browsers: no storage keys, files get API download URLs. */
export interface PublicShare {
  id: string
  code: string
  kind: 'text' | 'files'
  createdAt: number
  expiresAt: number
  allowEditing: boolean
  isCode: boolean
  text?: string
  files?: Array<{ name: string; type: string; size: number; url: string; preview: 'image' | 'video' | 'audio' | null }>
}

export type Ref = { type: 'id'; value: string } | { type: 'code'; value: string }

export function parseRef(input: string): Ref | null {
  const value = input.trim().toLowerCase()
  if (CODE_REGEX.test(value)) return { type: 'code', value }
  if (ID_REGEX.test(value)) return { type: 'id', value }
  return null
}

export function clampTtl(requested: unknown, kind: 'text' | 'files'): number {
  const max = kind === 'files' ? MAX_FILE_TTL_SECONDS : MAX_TEXT_TTL_SECONDS
  const wanted = typeof requested === 'number' && Number.isFinite(requested) && requested > 0 ? requested : DEFAULT_TTL_SECONDS
  return Math.min(Math.floor(wanted), max)
}

const manifestKey = (id: string) => `${PREFIX_SHARE}${id}.json`
const codeKey = (code: string) => `${PREFIX_CODE}${code}`

async function saveManifest(storage: Storage, m: ShareManifest, opts: { ifNoneMatch?: boolean } = {}) {
  return storage.put(manifestKey(m.id), JSON.stringify(m), { contentType: 'application/json', ...opts })
}

/** Claim a free 6-digit code. Conditional create makes collisions and overwrites impossible. */
export async function allocateCode(storage: Storage, id: string, attempts = 12): Promise<string> {
  for (let i = 0; i < attempts; i++) {
    const code = generateCode()
    if ((await storage.put(codeKey(code), id, { contentType: 'text/plain', ifNoneMatch: true })) === 'ok') return code
  }
  throw new ShareError('Could not allocate a code, please try again', 503)
}

export async function createTextShare(
  storage: Storage,
  input: { text: unknown; ttl?: unknown; allowEditing?: unknown; isCode?: unknown },
  now = Date.now(),
): Promise<ShareManifest> {
  if (typeof input.text !== 'string' || !input.text.trim()) throw new ShareError('Text is empty', 400)
  if (Buffer.byteLength(input.text, 'utf8') > MAX_TEXT_BYTES) {
    throw new ShareError(`Text is too large (max ${MAX_TEXT_BYTES / 1024 / 1024}MB). Upload it as a file instead.`, 413)
  }
  const id = generateId()
  const code = await allocateCode(storage, id)
  const manifest: ShareManifest = {
    v: 2,
    id,
    code,
    kind: 'text',
    createdAt: now,
    expiresAt: now + clampTtl(input.ttl, 'text') * 1000,
    allowEditing: input.allowEditing === true,
    isCode: input.isCode === true,
    text: input.text,
  }
  await saveManifest(storage, manifest, { ifNoneMatch: true })
  return manifest
}

export async function createFileShare(
  storage: Storage,
  input: { uploadId: unknown; files: unknown; ttl?: unknown },
  now = Date.now(),
): Promise<ShareManifest> {
  const { uploadId, files } = input
  if (typeof uploadId !== 'string' || !ID_REGEX.test(uploadId)) throw new ShareError('Invalid uploadId', 400)
  if (!Array.isArray(files) || files.length === 0) throw new ShareError('No files', 400)
  if (files.length > MAX_FILES) throw new ShareError(`Too many files (max ${MAX_FILES})`, 400)

  const prefix = `${PREFIX_FILE}${uploadId}/`
  const verified: ShareFile[] = []
  let total = 0
  for (const f of files) {
    const key = typeof f?.key === 'string' ? f.key : ''
    if (!key.startsWith(prefix) || key.includes('..')) throw new ShareError('Invalid file reference', 400)
    // The bytes themselves never pass through us, so ask R2 what is actually there.
    const head = await storage.head(key)
    if (!head) throw new ShareError(`"${cleanDisplayName(String(f?.name ?? 'file'))}" was not uploaded`, 400)
    if (head.size > MAX_FILE_SIZE) throw new ShareError('A file exceeds the size limit', 413)
    total += head.size
    if (total > MAX_TOTAL_FILES_SIZE) throw new ShareError('Total size exceeds the limit', 413)
    verified.push({
      key,
      name: cleanDisplayName(String(f?.name ?? 'file')),
      type: head.contentType || 'application/octet-stream',
      size: head.size,
    })
  }

  const id = generateId()
  const code = await allocateCode(storage, id)
  const manifest: ShareManifest = {
    v: 2,
    id,
    code,
    kind: 'files',
    createdAt: now,
    expiresAt: now + clampTtl(input.ttl, 'files') * 1000,
    files: verified,
  }
  await saveManifest(storage, manifest, { ifNoneMatch: true })
  return manifest
}

/** Resolve an id or a code to a live (non-expired) manifest, or null. */
export async function loadShare(storage: Storage, ref: Ref, now = Date.now()): Promise<ShareManifest | null> {
  let id = ref.value
  if (ref.type === 'code') {
    const mapped = await storage.get(codeKey(ref.value))
    if (!mapped || !ID_REGEX.test(mapped.trim())) return null
    id = mapped.trim()
  }
  const raw = await storage.get(manifestKey(id))
  if (!raw) return null
  let manifest: ShareManifest
  try {
    manifest = JSON.parse(raw)
  } catch {
    return null
  }
  if (manifest.v !== 2 || manifest.expiresAt <= now) return null
  return manifest
}

export async function updateText(storage: Storage, manifest: ShareManifest, text: unknown): Promise<ShareManifest> {
  if (manifest.kind !== 'text' || !manifest.allowEditing) throw new ShareError('This share cannot be edited', 403)
  if (typeof text !== 'string' || !text.trim()) throw new ShareError('Text is empty', 400)
  if (Buffer.byteLength(text, 'utf8') > MAX_TEXT_BYTES) throw new ShareError('Text is too large', 413)
  const updated = { ...manifest, text } // expiresAt deliberately unchanged
  await saveManifest(storage, updated)
  return updated
}

export function toPublic(m: ShareManifest): PublicShare {
  return {
    id: m.id,
    code: m.code,
    kind: m.kind,
    createdAt: m.createdAt,
    expiresAt: m.expiresAt,
    allowEditing: m.allowEditing === true,
    isCode: m.isCode === true,
    text: m.text,
    files: m.files?.map((f, i) => ({
      name: f.name,
      type: f.type,
      size: f.size,
      url: `/api/file/${m.id}/${i}`,
      preview: previewKind(f.type),
    })),
  }
}
