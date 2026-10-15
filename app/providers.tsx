"use client"

import { MotionConfig } from "framer-motion"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {/* Respect the OS "reduce motion" setting everywhere */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
      <Toaster />
    </ThemeProvider>
  )
}
