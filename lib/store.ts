// Client-side store — no server storage required
// Paste data is LZ-compressed into the shareable URL hash
import LZString from 'lz-string'

// ─── Constants ────────────────────────────────────────────
export const MAX_FILE_SIZE = 1 * 1024 * 1024          // 1MB — inline (URL-hash) threshold
export const MAX_TOTAL_FILES_SIZE = 5 * 1024 * 1024   // 5MB total inline
export const MAX_FILES = 10
export const MAX_TEXT_SIZE = 10 * 1024 * 1024          // 10MB for text
export const MAX_R2_FILE_SIZE = 100 * 1024 * 1024     // 100MB per file via R2
export const MAX_R2_TOTAL_SIZE = 500 * 1024 * 1024    // 500MB total via R2
export const MAX_R2_TTL_SECONDS = 24 * 60 * 60        // R2 files deleted after 24h max

export const EXPIRATION_OPTIONS: Record<string, number> = {
  '5min': 5 * 60,
  '30min': 30 * 60,
  '1hour': 60 * 60,
  '6hours': 6 * 60 * 60,
  '12hours': 12 * 60 * 60,
  '1day': 24 * 60 * 60,
  '3days': 3 * 24 * 60 * 60,
  '7days': 7 * 24 * 60 * 60,
  '30days': 30 * 24 * 60 * 60,
}

export const DEFAULT_TTL_SECONDS = EXPIRATION_OPTIONS['30min']

// ─── Type definitions ─────────────────────────────────────
export interface InlineFileRef {
  name: string
  type: string
  content: string   // base64 data URL e.g. "data:image/png;base64,..."
  size: number
}

// For files stored in Cloudflare R2 (large files)
export interface R2FileRef {
  name: string
  type: string
  url: string       // R2 public URL
  size: number
}

// Keep BlobFileRef as alias so file-upload.tsx still compiles
export type BlobFileRef = InlineFileRef

export interface PasteRecord {
  content: string       // text content, base64 data URL (small file), or R2 URL (large single file)
  createdAt: number     // Unix ms
  expiresAt: number     // Unix ms
  fileName?: string
  fileType?: string
  fileSize?: number     // for R2 single-file size display
  isFile?: boolean
  isR2File?: boolean    // true when content is an R2 URL (not base64)
  files?: Array<InlineFileRef | R2FileRef>   // multi-file: mix of inline + R2
  isMultiFile?: boolean
  allowEditing?: boolean
  isCode?: boolean
}

// ─── Code generation (sync, no server) ────────────────────
export function generateCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

// ─── Encode / Decode (LZ + URL-safe base64) ───────────────
export function encodePaste(data: PasteRecord): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(data))
}

export function decodePaste(encoded: string): PasteRecord | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded)
    if (!json) return null
    return JSON.parse(json) as PasteRecord
  } catch {
    return null
  }
}

// ─── localStorage history ─────────────────────────────────
export interface ShareHistoryItem {
  code: string
  url: string           // full path + hash: "/view/1234#<encoded>"
  type: 'text' | 'file' | 'multi' | 'code'
  createdAt: number
  expiresAt: number
}

const HISTORY_KEY = 'shareHistory'

export function saveToHistory(item: ShareHistoryItem): void {
  try {
    const existing = localStorage.getItem(HISTORY_KEY)
    const history: ShareHistoryItem[] = existing ? JSON.parse(existing) : []
    history.push(item)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  } catch {
    // ignore storage errors
  }
}

export function getHistory(): ShareHistoryItem[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY)
    if (!stored) return []
    return JSON.parse(stored) as ShareHistoryItem[]
  } catch {
    return []
  }
}

export function deleteFromHistory(code: string): void {
  try {
    const history = getHistory().filter(h => h.code !== code)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  } catch {
    // ignore
  }
}

export function updateHistoryUrl(code: string, newUrl: string): void {
  try {
    const history = getHistory().map(h =>
      h.code === code ? { ...h, url: newUrl } : h
    )
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  } catch {
    // ignore
  }
}

// ─── Formatting helper ───────────────────────────────────
export function formatExpirationTime(ms: number): string {
  if (ms <= 0) return 'Expired'
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (days > 0) return `${days}d ${hours}h remaining`
  if (hours > 0) return `${hours}h ${minutes}m remaining`
  if (minutes > 0) return `${minutes}m ${seconds}s remaining`
  return `${seconds}s remaining`
}