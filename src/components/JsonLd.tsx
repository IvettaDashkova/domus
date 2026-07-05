import { site } from "@/lib/seo";

/** schema.org JSON-LD structured data for the landing page (rich results). */
export function JsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: site.name,
    description: site.description,
    url: site.url,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    author: { "@type": "Person", name: site.author },
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe to inline; no user data is interpolated.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
