// Validation for files the user picked / dropped / pasted, before anything is uploaded.
// Pure (no DOM) so it is unit-tested. The server re-validates everything; this is for fast, friendly errors.
import { MAX_FILE_SIZE, MAX_FILES, MAX_TOTAL_FILES_SIZE, MB } from "@/lib/config"

export interface StagedFile {
  id: string
  rawFile: File
  name: string
  type: string
  size: number
}

export interface StageResult {
  files: StagedFile[]
  errors: string[]
}

let counter = 0
const nextId = () => `f${Date.now().toString(36)}${(counter++).toString(36)}`

export function stageFiles(existing: StagedFile[], incoming: File[]): StageResult {
  const files = [...existing]
  const errors: string[] = []
  let total = files.reduce((sum, f) => sum + f.size, 0)

  for (const file of incoming) {
    if (files.length >= MAX_FILES) {
      errors.push(`You can share up to ${MAX_FILES} files at once.`)
      break
    }
    if (file.size === 0) {
      errors.push(`"${file.name}" is empty.`)
      continue
    }
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`"${file.name}" is larger than ${MAX_FILE_SIZE / MB} MB.`)
      continue
    }
    if (total + file.size > MAX_TOTAL_FILES_SIZE) {
      errors.push(`"${file.name}" would take the share over ${MAX_TOTAL_FILES_SIZE / MB} MB.`)
      continue
    }
    if (files.some(f => f.name === file.name && f.size === file.size && f.rawFile.lastModified === file.lastModified)) {
      continue // same file picked twice: ignore silently
    }
    files.push({ id: nextId(), rawFile: file, name: file.name, type: file.type || "application/octet-stream", size: file.size })
    total += file.size
  }
  return { files, errors }
}

/** Clipboard screenshots arrive as a generic "image.png": give them a useful, unique name. */
export function nameClipboardFile(file: File, now = new Date()): File {
  if (!/^image\.(png|jpe?g|gif|webp)$/i.test(file.name)) return file
  const ext = file.name.split(".").pop()
  const pad = (n: number) => String(n).padStart(2, "0")
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return new File([file], `screenshot-${stamp}.${ext}`, { type: file.type, lastModified: file.lastModified })
}
