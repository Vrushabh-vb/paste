import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
        <p className="eyebrow">Last updated {updated}</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight sm:text-5xl">{title}</h1>
        <article
          className={[
            "mt-8 text-[15px] leading-relaxed text-muted-foreground",
            "[&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-foreground",
            "[&_p]:mb-4 [&_strong]:font-medium [&_strong]:text-foreground",
            "[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5",
            "[&_a]:text-foreground [&_a]:underline [&_a]:decoration-border [&_a]:underline-offset-4 hover:[&_a]:decoration-foreground",
          ].join(" ")}
        >
          {children}
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}
