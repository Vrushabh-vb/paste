import { type NextRequest, NextResponse } from "next/server"
import { pasteStore, cleanExpiredPastes, generateCode, MAX_FILE_SIZE, MAX_TOTAL_FILES_SIZE, MAX_FILES, DEFAULT_TTL_MS, EXPIRATION_OPTIONS } from "@/lib/store"

export async function POST(request: NextRequest) {
  try {
    const {
      content,
      fileName,
      fileType,
      isFile,
      files,
      isMultiFile,
      expirationOption = '30min',
      allowEditing = false
    } = await request.json()

    // Validate expiration option
    const expirationMs = EXPIRATION_OPTIONS[expirationOption as keyof typeof EXPIRATION_OPTIONS] || DEFAULT_TTL_MS

    // For text content
    if (!isFile && !isMultiFile) {
      if (!content || typeof content !== "string" || !content.trim()) {
        return NextResponse.json({ error: "Content is required" }, { status: 400 })
      }
    }

    // For single file
    if (isFile && !isMultiFile) {
      // Basic validation for base64 string
      if (!content.startsWith('data:') || !content.includes(';base64,')) {
        return NextResponse.json({ error: "Invalid file format" }, { status: 400 })
      }

      // Check file size (base64 is ~33% larger than the original file)
      const base64Content = content.split(';base64,')[1]
      const fileSize = (base64Content.length * 3) / 4
      if (fileSize > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `File size exceeds ${Math.floor(MAX_FILE_SIZE / (1024 * 1024))}MB limit` }, { status: 400 })
      }

      // Validate file name and type
      if (!fileName) {
        return NextResponse.json({ error: "File name is required" }, { status: 400 })
      }
      // If fileType is missing, default to octet-stream
      const effectiveFileType = fileType || 'application/octet-stream'

    }

    // For multiple files
    if (isMultiFile) {
      // Validate files array
      if (!files || !Array.isArray(files) || files.length === 0) {
        return NextResponse.json({ error: "Files are required" }, { status: 400 })
      }

      // Check number of files
      if (files.length > MAX_FILES) {
        return NextResponse.json({ error: `Maximum ${MAX_FILES} files allowed` }, { status: 400 })
      }

      // Validate each file and calculate total size
      let totalSize = 0
      for (const file of files) {
        if (!file.name || !file.content) {
          return NextResponse.json({ error: `Invalid data for file "${file.name || 'unknown'}"` }, { status: 400 })
        }


        if (!file.content.startsWith('data:') || !file.content.includes(';base64,')) {
          return NextResponse.json({ error: "Invalid file format" }, { status: 400 })
        }

        const base64Content = file.content.split(';base64,')[1]
        const fileSize = (base64Content.length * 3) / 4
        totalSize += fileSize

        if (fileSize > MAX_FILE_SIZE) {
          return NextResponse.json({ error: `File "${file.name}" exceeds ${Math.floor(MAX_FILE_SIZE / (1024 * 1024))}MB limit` }, { status: 400 })
        }
      }

      // Check total size
      if (totalSize > MAX_TOTAL_FILES_SIZE) {
        return NextResponse.json({ error: `Total file size exceeds ${Math.floor(MAX_TOTAL_FILES_SIZE / (1024 * 1024))}MB limit` }, { status: 400 })
      }
    }

    // Clean expired pastes before creating new one
    cleanExpiredPastes()

    const code = generateCode()
    const createdAt = Date.now()
    const expiresAt = createdAt + expirationMs

    // Store based on type
    if (isMultiFile) {
      pasteStore.set(code, {
        content: "", // Empty for multi-file
        createdAt,
        expiresAt,
        files,
        isMultiFile: true,
        allowEditing,
        downloadCount: 0
      })
    } else if (isFile) {
      pasteStore.set(code, {
        content: content.trim(),
        createdAt,
        expiresAt,
        fileName,
        fileType: fileType || 'application/octet-stream',
        isFile: true,
        allowEditing,
        downloadCount: 0
      })

    } else {
      pasteStore.set(code, {
        content: content.trim(),
        createdAt,
        expiresAt,
        allowEditing,
        downloadCount: 0
      })
    }

    return NextResponse.json({ code, expiresAt })
  } catch (error: any) {
    console.error("Error processing paste:", error)
    return NextResponse.json({
      error: "Invalid request",
      details: error.message || "Unknown error"
    }, { status: 400 })
  }
}


export async function PUT(request: NextRequest) {
  try {
    const { code, content } = await request.json()

    if (!code || !content) {
      return NextResponse.json({ error: "Code and content are required" }, { status: 400 })
    }

    // Clean expired pastes first
    cleanExpiredPastes()

    const paste = pasteStore.get(code)
    if (!paste) {
      return NextResponse.json({ error: "Paste not found or expired" }, { status: 404 })
    }

    if (!paste.allowEditing) {
      return NextResponse.json({ error: "Editing is not allowed for this paste" }, { status: 403 })
    }

    // Only allow editing text content, not files
    if (paste.isFile || paste.isMultiFile) {
      return NextResponse.json({ error: "Files cannot be edited" }, { status: 400 })
    }

    // Update the content
    paste.content = content.trim()
    pasteStore.set(code, paste)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating paste:", error)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
