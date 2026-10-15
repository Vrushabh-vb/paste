import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import { BackgroundFX } from "@/components/background-fx"
import { cn } from "@/lib/utils"

const fontSans = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" })
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" })
const fontSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
})

export const metadata: Metadata = {
  title: { default: "PasteHere: share text and files instantly", template: "%s · PasteHere" },
  description:
    "Free, no sign-up sharing for text, code, images, video and zips. Open it anywhere with a 6-digit code. Deleted automatically.",
  applicationName: "PasteHere",
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
      <body className={cn("min-h-screen font-sans", fontSans.variable, fontMono.variable, fontSerif.variable)}>
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
