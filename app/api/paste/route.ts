import { type NextRequest, NextResponse } from "next/server"
import { pasteStore, cleanExpiredPastes, generateCode } from "@/lib/store"

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // Clean expired pastes before creating new one
    cleanExpiredPastes()

    const code = generateCode()
    const createdAt = Date.now()

    pasteStore.set(code, {
      content: content.trim(),
      createdAt,
    })

    return NextResponse.json({ code })
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
