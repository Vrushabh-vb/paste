import type { Metadata } from "next"

// A share link is a capability: never let a search engine index or cache it.
export const metadata: Metadata = {
  title: "Shared with you",
  robots: { index: false, follow: false, nocache: true },
}

export default function ViewLayout({ children }: { children: React.ReactNode }) {
  return children
}
