import Link from "next/link"
import { History } from "lucide-react"
import { Logo } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav aria-label="Primary" className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href="/recent">
              <History />
              <span>Recent</span>
            </Link>
          </Button>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
