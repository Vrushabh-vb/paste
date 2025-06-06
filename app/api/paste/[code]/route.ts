import { type NextRequest, NextResponse } from "next/server"
import { pasteStore, cleanExpiredPastes, TTL_MS } from "@/lib/store"

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

  // Double-check if paste is expired (in case cleanup didn't catch it)
  const now = Date.now()
  if (now - paste.createdAt > TTL_MS) {
    pasteStore.delete(code)
    return NextResponse.json({ error: "Content not found or expired" }, { status: 404 })
  }

  return NextResponse.json({
    content: paste.content,
    createdAt: new Date(paste.createdAt).toISOString(),
    fileName: paste.fileName,
    fileType: paste.fileType,
    isFile: paste.isFile || false,
    files: paste.files || [],
    isMultiFile: paste.isMultiFile || false
  })
}
