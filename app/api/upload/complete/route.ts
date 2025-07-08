import { type NextRequest, NextResponse } from "next/server"
import { chunkedUploads, pasteStore, generateCode, cleanExpiredPastes, EXPIRATION_OPTIONS, DEFAULT_TTL_MS } from "@/lib/store"

export async function POST(request: NextRequest) {
  try {
    const { uploadId, expirationOption = '30min', allowEditing = false } = await request.json()

    if (!uploadId) {
      return NextResponse.json({ error: "Upload ID is required" }, { status: 400 })
    }

    // Clean expired uploads
    cleanExpiredPastes()

    const upload = chunkedUploads.get(uploadId)
    if (!upload) {
      return NextResponse.json({ error: "Upload session not found or expired" }, { status: 404 })
    }

    // Check if all chunks are uploaded
    if (upload.uploadedChunks !== upload.totalChunks) {
      return NextResponse.json({ 
        error: `Upload incomplete. ${upload.uploadedChunks}/${upload.totalChunks} chunks uploaded.` 
      }, { status: 400 })
    }

    // Combine all chunks in order
    let combinedBase64 = ""
    for (let i = 0; i < upload.totalChunks; i++) {
      const chunk = upload.chunks.get(i)
      if (!chunk) {
        return NextResponse.json({ 
          error: `Missing chunk ${i}. Please retry upload.` 
        }, { status: 400 })
      }
      combinedBase64 += chunk
    }

    // Create the paste
    const code = generateCode()
    const createdAt = Date.now()
    const expirationMs = EXPIRATION_OPTIONS[expirationOption as keyof typeof EXPIRATION_OPTIONS] || DEFAULT_TTL_MS
    const expiresAt = createdAt + expirationMs

    // Create data URL format
    const dataUrl = `data:${upload.fileType};base64,${combinedBase64}`

    pasteStore.set(code, {
      content: dataUrl,
      createdAt,
      expiresAt,
      fileName: upload.fileName,
      fileType: upload.fileType,
      isFile: true,
      allowEditing: false, // Files cannot be edited
      downloadCount: 0
    })

    // Clean up the chunked upload session
    chunkedUploads.delete(uploadId)

    return NextResponse.json({ 
      code,
      expiresAt,
      fileName: upload.fileName,
      fileSize: upload.totalSize
    })
  } catch (error) {
    console.error("Error completing chunked upload:", error)
    return NextResponse.json({ error: "Failed to complete upload" }, { status: 500 })
  }
}