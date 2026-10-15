"use client"

import { useState } from "react"
import { Composer } from "@/components/home/composer"
import { ReceiveCard } from "@/components/home/receive-card"
import { ShareResult } from "@/components/home/share-result"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { CreatedShare } from "@/lib/client-api"
import { CODE_LENGTH, MAX_FILE_SIZE, MB } from "@/lib/config"

const STEPS = [
  { n: "01", title: "Paste or drop", body: `Text, code, a screenshot, or files up to ${MAX_FILE_SIZE / MB} MB each.` },
  { n: "02", title: "Get a code", body: `A ${CODE_LENGTH}-digit code, a private link and a QR code, instantly.` },
  { n: "03", title: "Open anywhere", body: "Works on any device. It deletes itself when the timer runs out." },
]

export default function HomePage() {
  const [created, setCreated] = useState<CreatedShare | null>(null)

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 sm:px-6">
          <section className="mx-auto max-w-3xl pb-7 pt-9 text-center sm:pb-7 sm:pt-9">
            <p className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-soft" aria-hidden />
              Free · No sign-up · Deletes itself
            </p>
            <h1 className="text-[2.5rem] leading-[1.05] tracking-[-0.04em] sm:text-5xl lg:text-[3.75rem]">
              Share anything,
              <br className="sm:hidden" /> <span className="bg-gradient-to-r from-gold to-gold-soft bg-clip-text text-transparent">in seconds.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-balance text-base leading-relaxed text-muted-foreground">
              Paste text or code, or drop images, video and zips. Open it on any device with a {CODE_LENGTH}-digit code.
            </p>
          </section>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
            {/* On phones the (compact) receive box comes first: the person on the second device only needs that */}
            <ReceiveCard className="order-first lg:order-last" refreshKey={created?.id} />
            <div className="min-w-0">
              {created ? <ShareResult created={created} onReset={() => setCreated(null)} /> : <Composer onCreated={setCreated} />}
            </div>
          </div>

          <section aria-labelledby="how-title" className="mt-20 sm:mt-28">
            <h2 id="how-title" className="eyebrow text-center">How it works</h2>
            <ol className="mt-8 grid gap-8 sm:grid-cols-3 sm:gap-6">
              {STEPS.map(step => (
                <li key={step.n} className="border-t border-border pt-5">
                  <span className="text-2xl font-semibold tabular tracking-tight text-gold">{step.n}</span>
                  <h3 className="mt-2 text-base font-medium">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </section>
        </main>

        <SiteFooter />
      </div>
    </TooltipProvider>
  )
}
