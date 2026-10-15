// Small display helpers shared by the pages.

export function formatFileSize(bytes: number): string {
  if (!bytes) return "Unknown size"
  if (bytes < 1024) return `${bytes} B`
  const units = ["KB", "MB", "GB"]
  let size = bytes / 1024
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit++
  }
  return `${size >= 100 ? size.toFixed(0) : size.toFixed(1)} ${units[unit]}`
}

/** Like formatFileSize, but a real zero is "0 B" (formatFileSize treats 0 as "unknown"). */
export function formatBytes(bytes: number): string {
  return bytes === 0 ? "0 B" : formatFileSize(bytes)
}

/** "482913" -> "482 913" (easier to read aloud and to type). */
export function formatCode(code: string): string {
  return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code
}

/** Live countdown text: 29:58, 2h 10m, 3d 4h. */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "Expired"
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
}

export function timeAgo(timestamp: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000))
  if (seconds < 60) return "Just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function utf8Length(text: string): number {
  return new TextEncoder().encode(text).length
}
