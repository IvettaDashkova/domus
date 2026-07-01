import { mkdirSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "images");

const UA = "domus-portfolio/0.1 (open-data property photos)";

const QUERIES = [
  { q: "detached house exterior england", kind: "exterior" },
  { q: "terraced houses street england", kind: "exterior" },
  { q: "semi-detached house england", kind: "exterior" },
  { q: "apartment building facade", kind: "exterior" },
  { q: "modern kitchen interior", kind: "interior" },
  { q: "living room interior home", kind: "interior" },
  { q: "bedroom interior house", kind: "interior" },
  { q: "english cottage garden house", kind: "exterior" },
];
const PER_CAT = 5;

interface ManifestEntry {
  file: string;
  kind: string;
  category: string;
  license: string;
  artist: string;
  source: string;
}

function strip(html?: string): string {
  return (html ?? "").replace(/<[^>]*>/g, "").trim().slice(0, 120);
}

async function fetchCategory(query: string) {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6", // File namespace
    gsrlimit: "30",
    prop: "imageinfo",
    iiprop: "url|mime|extmetadata",
    iiurlwidth: "640",
    format: "json",
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { "user-agent": UA },
  });
  const json = await res.json();
  const pages = Object.values(json?.query?.pages ?? {}) as Array<{
    title: string;
    imageinfo?: { thumburl?: string; mime?: string; descriptionurl?: string; extmetadata?: Record<string, { value?: string }> }[];
  }>;
  return pages
    .map((p) => p.imageinfo?.[0])
    .filter((ii): ii is NonNullable<typeof ii> => !!ii && ii.mime === "image/jpeg" && !!ii.thumburl);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  for (const f of readdirSync(OUT)) if (f.endsWith(".jpg")) rmSync(join(OUT, f));
  const manifest: ManifestEntry[] = [];
  let n = 0;

  for (const { q, kind } of QUERIES) {
    const files = await fetchCategory(q);
    let taken = 0;
    for (const ii of files) {
      if (taken >= PER_CAT) break;
      try {
        await new Promise((r) => setTimeout(r, 1500)); // be gentle to Wikimedia
        const imgRes = await fetch(ii.thumburl!, { headers: { "user-agent": UA } });
        if (!imgRes.ok) {
          console.log(`  - skip (HTTP ${imgRes.status})`);
          continue;
        }
        const buf = Buffer.from(await imgRes.arrayBuffer());
        if (buf.length < 3000) {
          console.log(`  - skip (${buf.length} bytes)`);
          continue;
        }
        const file = `p${String(++n).padStart(2, "0")}.jpg`;
        writeFileSync(join(OUT, file), buf);
        manifest.push({
          file,
          kind,
          category: q,
          license: strip(ii.extmetadata?.LicenseShortName?.value) || "see source",
          artist: strip(ii.extmetadata?.Artist?.value) || "Wikimedia Commons",
          source: ii.descriptionurl ?? "",
        });
        taken++;
        console.log(`  + ${file}  [${q}]`);
      } catch (e) {
        console.log(`  - skip (err ${(e as Error).message})`);
      }
    }
    console.log(`${q}: ${taken} photos`);
  }

  writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`\ndone — ${manifest.length} photos in public/images/`);
}

main().catch((err) => {
  console.error("fetch-photos failed:", err);
  process.exit(1);
});
