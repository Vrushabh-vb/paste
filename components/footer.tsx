import { Copy } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-12 items-center justify-between py-2">
        <div className="flex items-center gap-1.5 ml-4">
          {/* <Copy className="h-3.5 w-3.5" /> */}
          <p className="text-xs text-muted-foreground">
            Paste-Here Online © {new Date().getFullYear()}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {/* Pastes expire after 30 minutes */}
        </p>
      </div>
    </footer>
  )
} 