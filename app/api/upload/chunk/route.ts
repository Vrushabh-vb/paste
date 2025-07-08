import { type NextRequest, NextResponse } from "next/server"
import { chunkedUploads, cleanExpiredPastes } from "@/lib/store"

export async function POST(request: NextRequest) {
  try {
    const { uploadId, chunkIndex, chunkData } = await request.json()

    if (!uploadId || chunkIndex === undefined || !chunkData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Clean expired uploads
    cleanExpiredPastes()

    const upload = chunkedUploads.get(uploadId)
    if (!upload) {
      return NextResponse.json({ error: "Upload session not found or expired" }, { status: 404 })
    }

    // Check if upload session is expired
    if (Date.now() > upload.expiresAt) {
      chunkedUploads.delete(uploadId)
      return NextResponse.json({ error: "Upload session expired" }, { status: 410 })
    }

    // Validate chunk index
    if (chunkIndex < 0 || chunkIndex >= upload.totalChunks) {
      return NextResponse.json({ error: "Invalid chunk index" }, { status: 400 })
    }

    // Store the chunk (only increment if this is a new chunk)
    const wasNewChunk = !upload.chunks.has(chunkIndex)
    upload.chunks.set(chunkIndex, chunkData)
    if (wasNewChunk) {
      upload.uploadedChunks++
    }

    const progress = Math.round((upload.uploadedChunks / upload.totalChunks) * 100)
    const isComplete = upload.uploadedChunks === upload.totalChunks

    return NextResponse.json({ 
      success: true,
      progress,
      uploadedChunks: upload.uploadedChunks,
      totalChunks: upload.totalChunks,
      isComplete
    })
  } catch (error) {
    console.error("Error uploading chunk:", error)
    return NextResponse.json({ error: "Failed to upload chunk" }, { status: 500 })
  }
}