import Link from "next/link"
import { cn } from "@/lib/utils"

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn("h-8 w-8", className)}>
      <rect width="64" height="64" rx="16" className="fill-primary" />
      <rect x="17" y="14" width="26" height="32" rx="6" fill="none" strokeWidth="3.5" className="stroke-primary-foreground" opacity="0.5" />
      <rect x="23" y="20" width="26" height="32" rx="6" className="fill-primary-foreground" />
      <path d="M30 30h12M30 36h12M30 42h7" strokeWidth="3.2" strokeLinecap="round" className="stroke-primary" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5", className)} aria-label="PasteHere home">
      <LogoMark className="transition-transform duration-300 group-hover:-rotate-6" />
      <span className="font-serif text-[22px] leading-none tracking-tight">
        Paste<span className="italic text-gold">Here</span>
      </span>
    </Link>
  )
}
