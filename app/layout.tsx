import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist_Mono, Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import { BackgroundFX } from "@/components/background-fx"
import { cn } from "@/lib/utils"

// Apple-style typography. Apple devices render their own San Francisco (see tailwind.config.ts); everyone else gets Inter,
// the open-source face designed to sit closest to it. "opsz" lets Inter switch to its tighter Display cut at large sizes.
const fontInter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap", axes: ["opsz"] })
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" })

export const metadata: Metadata = {
  title: { default: "PlainText: share text and files instantly", template: "%s · PlainText" },
  description:
    "Free, no sign-up sharing for text, code, images, video and zips. Open it anywhere with a 6-digit code. Deleted automatically.",
  applicationName: "PlainText",
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0e11" },
  ],
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen font-sans", fontInter.variable, fontMono.variable)}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <BackgroundFX />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
