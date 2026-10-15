"use client"

import { useEffect } from "react"
import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="font-serif text-4xl">Something went wrong</h1>
      <p className="mt-3 text-muted-foreground">An unexpected error happened. Your shares are not affected.</p>
      <Button size="lg" className="mt-8" onClick={reset}>
        <RotateCcw /> Try again
      </Button>
    </main>
  )
}
