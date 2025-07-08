import { Copy, Shield, Clock, Zap } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60 mt-auto">
      <div className="container px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/10 to-blue-600/10">
                <Copy className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Paste-Here Online by VBX© {new Date().getFullYear()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-green-600" />
              <span className="font-medium">Secure</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-blue-600" />
              <span className="font-medium">30min expiry</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-yellow-600" />
              <span className="font-medium">Instant</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
} 
