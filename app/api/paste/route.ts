import { type NextRequest, NextResponse } from "next/server"
import { pasteStore, cleanExpiredPastes, generateCode, MAX_FILE_SIZE, MAX_TOTAL_FILES_SIZE, MAX_FILES } from "@/lib/store"

export async function POST(request: NextRequest) {
  try {
    const { content, fileName, fileType, isFile, files, isMultiFile } = await request.json()

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
        return NextResponse.json({ error: "File size exceeds 5MB limit" }, { status: 400 })
      }

      // Validate file name and type
      if (!fileName || !fileType) {
        return NextResponse.json({ error: "File name and type are required" }, { status: 400 })
      }
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
        if (!file.name || !file.type || !file.content) {
          return NextResponse.json({ error: "Invalid file data" }, { status: 400 })
        }

        if (!file.content.startsWith('data:') || !file.content.includes(';base64,')) {
          return NextResponse.json({ error: "Invalid file format" }, { status: 400 })
        }

        const base64Content = file.content.split(';base64,')[1]
        const fileSize = (base64Content.length * 3) / 4
        totalSize += fileSize

        if (fileSize > MAX_FILE_SIZE) {
          return NextResponse.json({ error: `File "${file.name}" exceeds 5MB limit` }, { status: 400 })
        }
      }

      // Check total size
      if (totalSize > MAX_TOTAL_FILES_SIZE) {
        return NextResponse.json({ error: `Total file size exceeds 20MB limit` }, { status: 400 })
      }
    }

    // Clean expired pastes before creating new one
    cleanExpiredPastes()

    const code = generateCode()
    const createdAt = Date.now()

    // Store based on type
    if (isMultiFile) {
      pasteStore.set(code, {
        content: "", // Empty for multi-file
        createdAt,
        files,
        isMultiFile: true
      })
    } else if (isFile) {
      pasteStore.set(code, {
        content: content.trim(),
        createdAt,
        fileName,
        fileType,
        isFile: true
      })
    } else {
      pasteStore.set(code, {
        content: content.trim(),
        createdAt
      })
    }

    return NextResponse.json({ code })
  } catch (error) {
    console.error("Error processing paste:", error)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
