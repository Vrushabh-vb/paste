"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Code2, FileText, Files, Loader2, Paperclip } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CODE_LENGTH, CODE_REGEX, ID_REGEX } from "@/lib/config"
import { formatCode, formatCountdown } from "@/lib/format"
import { getHistory, type ShareHistoryItem } from "@/lib/store"
import { cn } from "@/lib/utils"

const TYPE_ICON: Record<ShareHistoryItem["type"], typeof FileText> = {
  text: FileText,
  code: Code2,
  file: Paperclip,
  multi: Files,
}

const groupDigits = (digits: string) => (digits.length > 3 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits)

/** `refreshKey` changes whenever a new share is created, so the "On this device" list stays current. */
export function ReceiveCard({ className, refreshKey }: { className?: string; refreshKey?: string }) {
  const router = useRouter()
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [opening, setOpening] = useState(false)
  const [recent, setRecent] = useState<ShareHistoryItem[]>([])

  useEffect(() => {
    const now = Date.now()
    setRecent(
      getHistory()
        .filter(h => h.url && h.expiresAt > now)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 3),
    )
  }, [refreshKey])

  const isDigits = /^[\d\s-]*$/.test(value)

  const open = (raw: string) => {
    const input = raw.trim()
    if (!input) return
    setError(null)

    // A full link (also pre-v2 links, which carry their data after the #).
    if (/^https?:\/\//i.test(input) || input.startsWith("/view/")) {
      try {
        const url = new URL(input, window.location.origin)
        if (url.pathname.startsWith("/view/")) {
          setOpening(true)
          window.location.assign(url.pathname + url.hash)
          return
        }
      } catch {
        /* fall through to the error */
      }
      setError("That doesn't look like a PlainText link.")
      return
    }

    const ref = input.replace(/[\s-]/g, "").toLowerCase()
    if (CODE_REGEX.test(ref) || ID_REGEX.test(ref)) {
      setOpening(true)
      router.push(`/view/${ref}`)
      return
    }
    setError(`Enter the ${CODE_LENGTH}-digit code, or paste the full link.`)
  }

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    setError(null)
    if (/^[\d\s-]*$/.test(next)) {
      const digits = next.replace(/\D/g, "").slice(0, CODE_LENGTH)
      setValue(groupDigits(digits))
      if (digits.length === CODE_LENGTH) open(digits) // open as soon as the last digit is typed
    } else {
      setValue(next)
    }
  }

  return (
    <section aria-labelledby="receive-title" className={cn("surface p-5 sm:p-6", className)}>
      <p className="eyebrow">Receive</p>
      <h2 id="receive-title" className="mt-2 text-2xl leading-tight">Have a code?</h2>
      <p className="mt-2 hidden text-sm leading-relaxed text-muted-foreground lg:block">
        Type the {CODE_LENGTH}-digit code from the other device, or paste a link.
      </p>

      <form
        onSubmit={e => {
          e.preventDefault()
          open(value)
        }}
        className="mt-4 flex gap-2"
      >
        <Input
          value={value}
          onChange={onChange}
          aria-label={`${CODE_LENGTH}-digit code or share link`}
          aria-invalid={!!error}
          aria-describedby={error ? "receive-error" : undefined}
          placeholder="000 000"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={opening}
          className={cn("h-12 flex-1 font-mono", isDigits && "text-lg tracking-[0.18em] md:text-lg")}
        />
        <Button type="submit" size="lg" disabled={!value.trim() || opening} aria-label="Open share" className="px-4">
          {opening ? <Loader2 className="animate-spin" /> : <ArrowRight />}
        </Button>
      </form>
      {error && (
        <p id="receive-error" role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {recent.length > 0 && (
        <div className="mt-6 hidden border-t border-border pt-5 lg:block">
          <div className="flex items-center justify-between">
            <p className="eyebrow">On this device</p>
            <Link href="/recent" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
              See all
            </Link>
          </div>
          <ul className="mt-3 space-y-1.5">
            {recent.map(item => {
              const Icon = TYPE_ICON[item.type] ?? FileText
              return (
                <li key={item.code + item.createdAt}>
                  <Link
                    href={item.url}
                    className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-accent"
                  >
                    <Icon className="h-4 w-4 text-gold" aria-hidden />
                    <span className="font-mono text-sm tabular tracking-wider">{formatCode(item.code)}</span>
                    <span className="ml-auto text-xs text-muted-foreground tabular">
                      {formatCountdown(item.expiresAt - Date.now())}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
