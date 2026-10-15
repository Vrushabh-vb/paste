export type FileKind = "image" | "video" | "audio" | "archive" | "pdf" | "code" | "text" | "document" | "sheet" | "other"

const ARCHIVE_EXT = /\.(zip|rar|7z|tar|gz|tgz|bz2|xz)$/i
const CODE_EXT = /\.(js|jsx|ts|tsx|py|rb|go|rs|java|c|cc|cpp|h|cs|php|sh|ps1|json|ya?ml|toml|xml|html|css|scss|sql|md)$/i
const DOC_EXT = /\.(docx?|odt|rtf|pptx?|key)$/i
const SHEET_EXT = /\.(xlsx?|csv|ods|tsv)$/i

/** Best-effort classification for picking an icon. Only used for display, never for security decisions. */
export function fileKind(name: string, type: string): FileKind {
  const t = (type || "").toLowerCase()
  if (t.startsWith("image/")) return "image"
  if (t.startsWith("video/")) return "video"
  if (t.startsWith("audio/")) return "audio"
  if (t === "application/pdf" || /\.pdf$/i.test(name)) return "pdf"
  if (ARCHIVE_EXT.test(name) || /zip|compressed|tar|rar/.test(t)) return "archive"
  if (SHEET_EXT.test(name)) return "sheet"
  if (DOC_EXT.test(name)) return "document"
  if (CODE_EXT.test(name)) return "code"
  if (t.startsWith("text/")) return "text"
  return "other"
}
