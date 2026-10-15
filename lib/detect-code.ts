// Decides whether pasted text should be labelled "Code snippet" (cosmetic only).
// Conservative on purpose: a sentence containing "<3" or "{" must not be called code.

const STRONG_START =
  /^(import|export|const|let|var|function|async|class|def|return|from\s+\S+\s+import|#include|#!|package|using|public|private|interface|type|enum|SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|if\s*\(|for\s*\(|while\s*\()\b/
const TAG_LINE = /^<\/?[a-z][\w:-]*(\s[^>]*)?\/?>/i

function lineLooksLikeCode(line: string): boolean {
  return (
    STRONG_START.test(line) ||
    /[;{}]$/.test(line) ||
    /=>|::|->|\|\||&&/.test(line) ||
    TAG_LINE.test(line) ||
    /^(\/\/|\/\*|\*\s|#!|#\s?[a-z])/i.test(line)
  )
}

export function looksLikeCode(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false

  // Valid JSON objects/arrays are code.
  if (/^[[{][\s\S]*[\]}]$/.test(trimmed)) {
    try {
      JSON.parse(trimmed)
      return true
    } catch {
      /* not JSON: fall through to the line heuristic */
    }
  }

  const lines = trimmed.split("\n").map(l => l.trim()).filter(Boolean).slice(0, 200)
  const hits = lines.filter(lineLooksLikeCode).length
  if (lines.length === 1) return STRONG_START.test(lines[0]) && /[=(;{]/.test(lines[0])
  return hits >= 2 && hits / lines.length >= 0.3
}
