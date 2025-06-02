import type React from "react"
import type { Metadata } from "next"
import { Inter as FontSans } from "next/font/google"
import "./globals.css"
import { Providers } from './providers'
import { cn } from "@/lib/utils"

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "Copy-Paste Online",
  description: "Share text content with simple 4-digit codes. Fast, secure, and easy to use.",
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased",
        fontSans.variable
      )} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
