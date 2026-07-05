import type { MetadataRoute } from "next";
import { site } from "@/lib/seo";

// Only public, indexable routes. The internal app (/map, /login) is excluded.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${site.url}/`,
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
