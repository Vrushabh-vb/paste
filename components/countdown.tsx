"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"
import { formatCountdown } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Current time that re-renders every second (under an hour left) or every 15s otherwise. */
export function useNow(expiresAt: number) {
  const [now, setNow] = useState(() => Date.now())
  const lastHour = expiresAt - now < 3600_000
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), lastHour ? 1000 : 15_000)
    return () => clearInterval(t)
  }, [lastHour])
  return now
}

/** "Deletes in 29:58" with a thin bar showing how much of the lifetime is left. */
export function ExpiryMeter({
  createdAt,
  expiresAt,
  className,
}: {
  createdAt: number
  expiresAt: number
  className?: string
}) {
  const now = useNow(expiresAt)
  const total = Math.max(1, expiresAt - createdAt)
  const left = Math.max(0, expiresAt - now)
  const pct = Math.min(100, (left / total) * 100)
  const urgent = left < 5 * 60_000

  return (
    <div className={cn("min-w-[11rem]", className)}>
      <div className="flex items-center justify-between gap-6 text-sm">
        <span className="eyebrow flex items-center gap-1.5">
          <Clock className="h-3 w-3" aria-hidden /> Deletes in
        </span>
        <span className={cn("font-mono tabular font-medium", urgent && "text-destructive")} aria-live="off">
          {formatCountdown(left)}
        </span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary" aria-hidden>
        <div
          className={cn("h-full rounded-full transition-[width] duration-1000 ease-linear", urgent ? "bg-destructive" : "bg-gold-soft")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
