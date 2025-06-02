import { type NextRequest, NextResponse } from "next/server"
import { pasteStore, cleanExpiredPastes, generateCode } from "@/lib/store"

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    try {
      // Clean expired pastes
      await cleanExpiredPastes()

      // Generate a unique code
      const code = await generateCode()
      const createdAt = Date.now()

      // Store the paste
      await pasteStore.set(code, {
        content: content.trim(),
        createdAt,
      })

      return NextResponse.json({ code })
    } catch (storageError) {
      console.error("Storage error:", storageError);
      return NextResponse.json({ error: "Failed to store paste. Please try again." }, { status: 500 })
    }
  } catch (parseError) {
    console.error("Request parsing error:", parseError);
    return NextResponse.json({ error: "Invalid request format" }, { status: 400 })
  }
}
