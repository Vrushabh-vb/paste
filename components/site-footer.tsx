import Link from "next/link"
import { MAX_FILE_SIZE, MB } from "@/lib/config"

// Optional: set NEXT_PUBLIC_CONTACT_EMAIL to show a contact link (needed for abuse reports).
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <p>
          <span className="font-serif text-base text-foreground">PasteHere</span>
          <span className="mx-2 opacity-40">·</span>
          Free, no sign-up. Files up to {MAX_FILE_SIZE / MB} MB, deleted automatically.
        </p>
        <nav aria-label="Legal" className="flex items-center gap-5">
          <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
          <Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link>
          {CONTACT && (
            <a href={`mailto:${CONTACT}`} className="transition-colors hover:text-foreground">Contact</a>
          )}
        </nav>
      </div>
    </footer>
  )
}
