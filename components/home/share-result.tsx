"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"
import { Check, ExternalLink, Plus, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CopyButton } from "@/components/copy-button"
import { ExpiryMeter } from "@/components/countdown"
import type { CreatedShare } from "@/lib/client-api"
import { formatCode } from "@/lib/format"

export function ShareResult({ created, onReset }: { created: CreatedShare; onReset: () => void }) {
  const [link, setLink] = useState("")
  const [canNativeShare, setCanNativeShare] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    setLink(`${window.location.origin}${created.url}`)
    setCanNativeShare(typeof navigator.share === "function")
  }, [created.url])

  // The form was probably scrolled when "Create" was pressed: bring the result into view,
  // and move focus to it so keyboard and screen-reader users land on the new content.
  useEffect(() => {
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  const nativeShare = () => {
    navigator.share({ title: "PasteHere", url: link }).catch(() => {
      /* user dismissed the share sheet */
    })
  }

  return (
    <section ref={sectionRef} aria-labelledby="result-title" className="surface scroll-mt-24 animate-fade-up overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4 sm:px-8">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
          <Check className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <h2 ref={headingRef} id="result-title" tabIndex={-1} className="font-serif text-2xl leading-none outline-none">Your share is ready</h2>
          <p className="mt-1 text-sm text-muted-foreground">Anyone with the code or the link can open it.</p>
        </div>
      </div>

      <div className="grid gap-8 p-5 sm:p-8 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0 space-y-7">
          <div>
            <p className="eyebrow">Code</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-3">
              <p
                className="font-mono text-5xl font-medium tabular tracking-[0.06em] text-gold sm:text-6xl"
                aria-label={`Code ${created.code.split("").join(" ")}`}
              >
                {formatCode(created.code)}
              </p>
              <CopyButton value={created.code} label="Copy code" variant="outline" size="sm" successMessage="Code copied" />
            </div>
          </div>

          <div>
            <p className="eyebrow">Link</p>
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-1.5 pl-3.5">
              <span className="min-w-0 flex-1 truncate font-mono text-[13px]" title={link}>{link || "…"}</span>
              <CopyButton value={link} label="Copy link" size="sm" disabled={!link} successMessage="Link copied" />
            </div>
          </div>

          <ExpiryMeter createdAt={created.createdAt} expiresAt={created.expiresAt} className="max-w-xs" />
        </div>

        <div className="flex flex-col items-center gap-3 md:pl-2">
          {/* Always dark-on-white so any phone camera can read it, in either theme */}
          <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
            {link ? (
              <QRCodeSVG value={link} size={148} level="M" bgColor="#ffffff" fgColor="#14171e" aria-label="QR code for the share link" />
            ) : (
              <div className="h-[148px] w-[148px]" />
            )}
          </div>
          <p className="max-w-[10rem] text-center text-xs leading-relaxed text-muted-foreground">
            Scan to open it on your phone
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border bg-muted/30 px-5 py-4 sm:px-8">
        <Button onClick={onReset}>
          <Plus /> Share something else
        </Button>
        <Button asChild variant="outline">
          <Link href={created.url}>
            <ExternalLink /> Open it
          </Link>
        </Button>
        {canNativeShare && (
          <Button variant="ghost" onClick={nativeShare}>
            <Share2 /> Share…
          </Button>
        )}
      </div>
    </section>
  )
}
