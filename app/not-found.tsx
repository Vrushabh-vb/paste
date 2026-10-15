import Link from "next/link"
import { FileQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-gold">
          <FileQuestion className="h-6 w-6" strokeWidth={1.5} aria-hidden />
        </span>
        <h1 className="mt-6 font-serif text-4xl">Page not found</h1>
        <p className="mt-3 text-muted-foreground">The page you were looking for doesn&apos;t exist.</p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/">Back to PasteHere</Link>
        </Button>
      </main>
      <SiteFooter />
    </div>
  )
}
