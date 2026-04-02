import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import {
  generateCode,
  savePaste,
  getPaste,
  updatePaste,
  MAX_FILE_SIZE,
  MAX_TOTAL_FILES_SIZE,
  MAX_FILES,
  MAX_TEXT_SIZE,
  DEFAULT_TTL_SECONDS,
  EXPIRATION_OPTIONS,
} from "@/lib/store"
import type { PasteRecord, BlobFileRef } from "@/lib/store"

// Removed invalid Pages router config object

// ─── POST: Create a new paste ────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      content,
      fileName,
      fileType,
      isFile,
      files,
      isMultiFile,
      expirationOption = '30min',
      allowEditing = false,
    } = body

    // Validate expiration option
    const ttlSeconds = EXPIRATION_OPTIONS[expirationOption] || DEFAULT_TTL_SECONDS
    const createdAt = Date.now()
    const expiresAt = createdAt + ttlSeconds * 1000

    // ── Text content ──────────────────────────────────────
    if (!isFile && !isMultiFile) {
      if (!content || typeof content !== "string" || !content.trim()) {
        return NextResponse.json({ error: "Content is required" }, { status: 400 })
      }

      if (new Blob([content]).size > MAX_TEXT_SIZE) {
        return NextResponse.json(
          { error: `Text content exceeds ${Math.floor(MAX_TEXT_SIZE / (1024 * 1024))}MB limit` },
          { status: 400 }
        )
      }

      // Detect if content looks like code
      const isCode =
        content.includes("{") ||
        content.includes("}") ||
        content.includes("function") ||
        content.includes("const ") ||
        content.includes("import ") ||
        content.includes("=>")

      const code = await generateCode()
      const record: PasteRecord = {
        content: content.trim(),
        createdAt,
        expiresAt,
        allowEditing,
        downloadCount: 0,
        isCode,
      }

      await savePaste(code, record, ttlSeconds)
      return NextResponse.json({ code, expiresAt })
    }

    // ── Single file upload ────────────────────────────────
    if (isFile && !isMultiFile) {
      if (!fileName || !fileType) {
        return NextResponse.json({ error: "File name and type are required" }, { status: 400 })
      }

      const fileUrl = body.fileUrl;
      const fileSize = body.fileSize;

      if (!fileUrl) {
        return NextResponse.json({ error: "File URL is missing (upload to blob failed)" }, { status: 400 })
      }

      const code = await generateCode()
      const record: PasteRecord = {
        content: "",
        createdAt,
        expiresAt,
        fileName,
        fileType,
        isFile: true,
        files: [{ name: fileName, type: fileType, url: fileUrl, size: fileSize }],
        allowEditing,
        downloadCount: 0,
      }

      await savePaste(code, record, ttlSeconds)
      return NextResponse.json({ code, expiresAt })
    }

    // ── Multiple files upload ─────────────────────────────
    if (isMultiFile) {
      if (!files || !Array.isArray(files) || files.length === 0) {
        return NextResponse.json({ error: "Files are required" }, { status: 400 })
      }
      if (files.length > MAX_FILES) {
        return NextResponse.json(
          { error: `Maximum ${MAX_FILES} files allowed` },
          { status: 400 }
        )
      }

      let totalSize = 0
      const blobRefs: BlobFileRef[] = []

      for (const file of files) {
        if (!file.name || !file.url) {
          return NextResponse.json(
            { error: `Invalid data for file "${file.name || "unknown"}"` },
            { status: 400 }
          )
        }

        const fileSize = file.size || 0
        totalSize += fileSize

        const fileContentType = file.type || "application/octet-stream"

        blobRefs.push({ name: file.name, type: fileContentType, url: file.url, size: fileSize })
      }

      if (totalSize > MAX_TOTAL_FILES_SIZE) {
        return NextResponse.json(
          { error: `Total size exceeds ${Math.floor(MAX_TOTAL_FILES_SIZE / (1024 * 1024))}MB` },
          { status: 400 }
        )
      }

      const code = await generateCode()
      const record: PasteRecord = {
        content: "",
        createdAt,
        expiresAt,
        files: blobRefs,
        isMultiFile: true,
        allowEditing,
        downloadCount: 0,
      }

      await savePaste(code, record, ttlSeconds)
      return NextResponse.json({ code, expiresAt })
    }

    return NextResponse.json({ error: "Invalid request type" }, { status: 400 })
  } catch (error: any) {
    console.error("Error processing paste:", error)
    return NextResponse.json(
      { error: "Invalid request", details: error.message || "Unknown error" },
      { status: 400 }
    )
  }
}

// ─── PUT: Edit an existing paste ─────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const { code, content } = await request.json()

    if (!code || !content) {
      return NextResponse.json({ error: "Code and content are required" }, { status: 400 })
    }

    const paste = await getPaste(code)
    if (!paste) {
      return NextResponse.json({ error: "Paste not found or expired" }, { status: 404 })
    }

    if (!paste.allowEditing) {
      return NextResponse.json({ error: "Editing not allowed for this paste" }, { status: 403 })
    }

    if (paste.isFile || paste.isMultiFile) {
      return NextResponse.json({ error: "Files cannot be edited" }, { status: 400 })
    }

    paste.content = content.trim()
    await updatePaste(code, paste)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating paste:", error)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
