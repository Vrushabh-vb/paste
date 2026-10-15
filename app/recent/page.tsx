"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronRight, Code2, FileText, Files, History, Paperclip, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { CopyButton } from "@/components/copy-button"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { formatCode, formatCountdown, timeAgo } from "@/lib/format"
import { getHistory, type ShareHistoryItem } from "@/lib/store"
import { cn } from "@/lib/utils"

const HISTORY_KEY = "shareHistory"

const TYPES: Record<ShareHistoryItem["type"], { label: string; icon: typeof FileText }> = {
  text: { label: "Text", icon: FileText },
  code: { label: "Code", icon: Code2 },
  file: { label: "File", icon: Paperclip },
  multi: { label: "Files", icon: Files },
}

export default function RecentPage() {
  const [history, setHistory] = useState<ShareHistoryItem[] | null>(null) // null until read on the client
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    setHistory(
      getHistory()
        .filter(h => !!h.url)
        .sort((a, b) => b.createdAt - a.createdAt),
    )
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  const persist = (next: ShareHistoryItem[]) => {
    setHistory(next)
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
    } catch {
      toast.error("Couldn't update your history")
    }
  }

  const items = history ?? []
  const expiredCount = items.filter(h => h.expiresAt <= now).length

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
        <p className="eyebrow">History</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight sm:text-5xl">Recent shares</h1>
        <p className="mt-3 max-w-xl text-balance text-muted-foreground">
          Only you can see this list: it lives in this browser, not on our servers. Shares delete themselves when their timer ends.
        </p>

        {history === null ? null : items.length === 0 ? (
          <div className="surface mt-10 flex animate-fade-up flex-col items-center px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-gold">
              <History className="h-6 w-6" strokeWidth={1.5} aria-hidden />
            </span>
            <h2 className="mt-5 font-serif text-2xl">Nothing here yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">Shares you create on this device will show up here.</p>
            <Button asChild className="mt-6">
              <Link href="/">Create a share</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-8 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground tabular">
                {items.length} {items.length === 1 ? "share" : "shares"}
              </p>
              <div className="flex gap-1.5">
                {expiredCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => persist(items.filter(h => h.expiresAt > now))}>
                    Clear expired
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="hover:text-destructive"
                  onClick={() => {
                    persist([])
                    toast.success("History cleared on this device")
                  }}
                >
                  Clear all
                </Button>
              </div>
            </div>

            <ul className="mt-4 space-y-2.5">
              {items.map(item => {
                const expired = item.expiresAt <= now
                const { label, icon: Icon } = TYPES[item.type] ?? TYPES.text
                return (
                  <li key={item.code + item.createdAt} className={cn("surface flex items-center gap-1 p-2 pr-2.5 transition-opacity", expired && "opacity-55")}>
                    <Link
                      href={expired ? "#" : item.url}
                      aria-disabled={expired}
                      tabIndex={expired ? -1 : 0}
                      className={cn("group flex min-w-0 flex-1 items-center gap-3.5 rounded-xl p-2", !expired && "hover:bg-accent", expired && "pointer-events-none")}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-gold">
                        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-mono text-lg font-medium tabular tracking-wider">{formatCode(item.code)}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {label} · {timeAgo(item.createdAt, now)} ·{" "}
                          <span className={cn(expired && "text-destructive")}>
                            {expired ? "Expired" : `${formatCountdown(item.expiresAt - now)} left`}
                          </span>
                        </span>
                      </span>
                      {!expired && <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" aria-hidden />}
                    </Link>
                    {!expired && (
                      <CopyButton
                        value={`${typeof window === "undefined" ? "" : window.location.origin}${item.url}`}
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Copy link for ${item.code}`}
                        successMessage="Link copied"
                      />
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${item.code} from history`}
                      className="hover:text-destructive"
                      onClick={() => persist(items.filter(h => h !== item))}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
