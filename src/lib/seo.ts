/**
 * Single source of truth for site-level SEO metadata. Consumed by the root
 * layout, sitemap, robots, web manifest, OG image and JSON-LD. Set
 * NEXT_PUBLIC_SITE_URL to the canonical production origin (no trailing slash).
 */
export const site = {
  name: "Domus",
  title: "Domus — AI real-estate agency operations",
  tagline: "AI lead triage, hybrid property search & viewing-route planning",
  description:
    "Domus is an AI operations tool for real-estate agencies: free-text lead " +
    "triage, hybrid (semantic + keyword + spatial) property matching on a map, " +
    "optimized viewing routes, and comps-based valuation. Built on open data.",
  // `||` (not `??`) so an empty-string env value falls back too — an empty URL
  // would otherwise crash the build at `new URL("")`.
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3007").replace(/\/$/, ""),
  author: "Ivetta Dashkova",
  locale: "en_US",
  themeColor: "#0f172a",
  keywords: [
    "real estate",
    "PropTech",
    "AI agent",
    "RAG",
    "hybrid search",
    "vector search",
    "pgvector",
    "geospatial",
    "route optimization",
    "property valuation",
    "lead triage",
    "Next.js",
    "Poland",
    "Wrocław",
  ],
} as const;
