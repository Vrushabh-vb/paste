import { randomInt, randomBytes } from 'node:crypto'
import { CODE_LENGTH, ID_ALPHABET, ID_LENGTH, MAX_FILENAME_LENGTH } from '@/lib/config'

/** Unguessable share id (~59 bits). Safe to put in a link. */
export function generateId(length = ID_LENGTH): string {
  const bytes = randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) out += ID_ALPHABET[bytes[i] % ID_ALPHABET.length]
  return out
}

/** Short numeric code for typing on another device. Never starts with 0. */
export function generateCode(length = CODE_LENGTH): string {
  return String(randomInt(10 ** (length - 1), 10 ** length))
}

/** ASCII-only, path-safe version of a filename for use in object keys. */
export function safeKeyName(name: string): string {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.') // keys must never contain ".." (the finalize step rejects it as traversal)
    .replace(/^\./, '_')
    .replace(/_+/g, '_')
    .slice(-80)
  return cleaned || 'file'
}

/** Strips control characters / path separators from a name shown to users. Keeps unicode. */
export function cleanDisplayName(name: string): string {
  const cleaned = name
    .replace(/[\u0000-\u001f\u007f\\/]/g, '_')
    .trim()
    .slice(0, MAX_FILENAME_LENGTH)
  return cleaned || 'file'
}

/** RFC 6266 / 5987 Content-Disposition value that is safe for any filename. */
export function contentDisposition(type: 'attachment' | 'inline', filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
  const encoded = encodeURIComponent(filename).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encoded}`
}
