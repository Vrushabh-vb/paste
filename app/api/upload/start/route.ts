import { type NextRequest, NextResponse } from "next/server"
import { chunkedUploads, generateUploadId, cleanExpiredPastes, CHUNK_SIZE, MAX_FILE_SIZE } from "@/lib/store"

export async function POST(request: NextRequest) {
  try {
    const { fileName, fileType, fileSize, totalChunks } = await request.json()

    if (!fileName || !fileType || !fileSize || !totalChunks) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File size exceeds ${Math.floor(MAX_FILE_SIZE / (1024 * 1024))}MB limit` 
      }, { status: 400 })
    }

    // Clean expired uploads
    cleanExpiredPastes()

    const uploadId = generateUploadId()
    const expiresAt = Date.now() + (30 * 60 * 1000) // 30 minutes for upload completion

    chunkedUploads.set(uploadId, {
      chunks: new Map(),
      totalChunks,
      fileName,
      fileType,
      totalSize: fileSize,
      uploadedChunks: 0,
      expiresAt
    })

    return NextResponse.json({ 
      uploadId,
      chunkSize: CHUNK_SIZE,
      maxChunks: totalChunks
    })
  } catch (error) {
    console.error("Error starting chunked upload:", error)
    return NextResponse.json({ error: "Failed to initialize upload" }, { status: 500 })
  }
}