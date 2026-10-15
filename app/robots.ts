import type { MetadataRoute } from "next"

// Share links are secrets: keep them (and the API) out of search engines.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/view/", "/api/", "/recent"] }] }
}
