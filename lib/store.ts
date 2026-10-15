// Browser-side storage helpers: this device's share history, and decoding of pre-v2 links.
// Current shares live in R2 and are fetched through /api/share (see lib/server/shares.ts).
import LZString from "lz-string"

// ─── Legacy (pre-v2) links ────────────────────────────────
// Old links looked like /view/1234#<lz-compressed json>. They still open until they expire.
export interface LegacyFileRef {
  name: string
  type: string
  content?: string // base64 data URL (small inline files)
  url?: string // R2 public URL (large files)
  size: number
}

export interface LegacyPasteRecord {
  content: string
  createdAt: number
  expiresAt: number
  fileName?: string
  fileType?: string
  fileSize?: number
  isFile?: boolean
  isR2File?: boolean
  files?: LegacyFileRef[]
  isMultiFile?: boolean
  allowEditing?: boolean
  isCode?: boolean
}

export function decodeLegacyPaste(encoded: string): LegacyPasteRecord | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded)
    if (!json) return null
    return JSON.parse(json) as LegacyPasteRecord
  } catch {
    return null
  }
}

// ─── localStorage history (this device only) ──────────────
export interface ShareHistoryItem {
  code: string
  url: string // "/view/<id>"
  type: "text" | "file" | "multi" | "code"
  createdAt: number
  expiresAt: number
}

const HISTORY_KEY = "shareHistory"
const HISTORY_MAX = 100

export function saveToHistory(item: ShareHistoryItem): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([...getHistory(), item].slice(-HISTORY_MAX)))
  } catch {
    // storage unavailable (private mode / quota): history is a convenience only
  }
}

export function getHistory(): ShareHistoryItem[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY)
    const parsed = stored ? JSON.parse(stored) : []
    return Array.isArray(parsed) ? (parsed as ShareHistoryItem[]) : []
  } catch {
    return []
  }
}
