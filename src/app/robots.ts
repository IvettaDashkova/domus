import type { MetadataRoute } from "next";
import { site } from "@/lib/seo";

// Public landing is indexable; the internal app + API are not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/map", "/login"],
    },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
