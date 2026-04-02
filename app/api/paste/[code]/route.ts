import { type NextRequest, NextResponse } from "next/server"
import { getPaste, updatePaste, formatExpirationTime } from "@/lib/store"

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } | Promise<{ code: string }> }
) {
  // Await params if it's a Promise (Next.js 15+ async params)
  const resolvedParams = await Promise.resolve(params)
  const { code } = resolvedParams

  // Validate code format (4 or 5 digits)
  if (!/^\d{4,5}$/.test(code)) {
    return NextResponse.json({ error: "Invalid code format" }, { status: 400 })
  }

  try {
    const paste = await getPaste(code)

    if (!paste) {
      return NextResponse.json({ error: "Content not found or expired" }, { status: 404 })
    }

    // Double-check expiration
    const now = Date.now()
    if (now > paste.expiresAt) {
      return NextResponse.json({ error: "Content not found or expired" }, { status: 404 })
    }

    // Increment download/view count
    paste.downloadCount = (paste.downloadCount || 0) + 1
    // Fire and forget the update — don't block the response
    updatePaste(code, paste).catch(err => console.error("Failed to update view count:", err))

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
      downloadCount: paste.downloadCount || 0,
      isCode: paste.isCode || false,
    })
  } catch (error: any) {
    console.error("Error fetching paste:", error)
    return NextResponse.json(
      { error: "Failed to retrieve content", details: error.message },
      { status: 500 }
    )
  }
}
