import { type NextRequest, NextResponse } from "next/server"
import { pasteStore, cleanExpiredPastes, formatExpirationTime } from "@/lib/store"

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } | Promise<{ code: string }> }
) {
  // Await params if it's a Promise
  const resolvedParams = await Promise.resolve(params);
  const { code } = resolvedParams;

  // Validate code format
  if (!/^\d{4}$/.test(code)) {
    return NextResponse.json({ error: "Invalid code format" }, { status: 400 })
  }

  // Clean expired pastes
  cleanExpiredPastes()

  const paste = pasteStore.get(code)

  if (!paste) {
    return NextResponse.json({ error: "Content not found or expired" }, { status: 404 })
  }

  // Double-check if paste is expired (using new expiration system)
  const now = Date.now()
  if (now > paste.expiresAt) {
    pasteStore.delete(code)
    return NextResponse.json({ error: "Content not found or expired" }, { status: 404 })
  }

  // Increment download count
  paste.downloadCount = (paste.downloadCount || 0) + 1
  pasteStore.set(code, paste)

  // Calculate time remaining
  const timeRemaining = paste.expiresAt - now
  const timeRemainingFormatted = formatExpirationTime(timeRemaining)

  return NextResponse.json({
    content: paste.content,
    createdAt: new Date(paste.createdAt).toISOString(),
    expiresAt: new Date(paste.expiresAt).toISOString(),
    timeRemaining: timeRemainingFormatted,
    fileName: paste.fileName,
    fileType: paste.fileType,
    isFile: paste.isFile || false,
    files: paste.files || [],
    isMultiFile: paste.isMultiFile || false,
    allowEditing: paste.allowEditing || false,
    downloadCount: paste.downloadCount || 0
  })
}
