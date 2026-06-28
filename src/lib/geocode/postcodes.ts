import { getAdminDb } from "@/lib/db/client";

/**
 * postcodes.io geocoding with a Postgres-backed cache (`postcode_cache`).
 * The cache makes geocoding idempotent and cheap at scale — a postcode is
 * fetched at most once across all listings and runs. Not-found is also cached
 * (found=false) so bad postcodes don't get retried forever.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/** Bulk pre-warm the cache (100 per request). Returns count newly cached. */
export async function warmCache(postcodes: string[]): Promise<number> {
  const sql = getAdminDb();
  const unique = [...new Set(postcodes.map((p) => p.trim()).filter(Boolean))];

  // Skip ones already cached.
  const cached = await sql<{ postcode: string }[]>`
    select postcode from postcode_cache where postcode in ${sql(unique)}`;
  const have = new Set(cached.map((c) => c.postcode));
  const todo = unique.filter((p) => !have.has(p));

  let cachedNow = 0;
  for (let i = 0; i < todo.length; i += 100) {
    const batch = todo.slice(i, i + 100);
    const res = await fetch("https://api.postcodes.io/postcodes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ postcodes: batch }),
    });
    const json = await res.json();
    const found = new Map<string, LatLng>();
    for (const r of json.result ?? []) {
      if (r.result?.latitude != null) {
        found.set(r.query, { lat: r.result.latitude, lng: r.result.longitude });
      }
    }
    for (const pc of batch) {
      const hit = found.get(pc);
      await sql`
        insert into postcode_cache (postcode, lat, lng, found)
        values (${pc}, ${hit?.lat ?? null}, ${hit?.lng ?? null}, ${!!hit})
        on conflict (postcode) do nothing`;
      cachedNow++;
    }
  }
  return cachedNow;
}

/** Resolve one postcode (cache-first, live fallback). null if not found. */
export async function lookup(postcode: string): Promise<LatLng | null> {
  const sql = getAdminDb();
  const pc = postcode.trim();
  const [row] = await sql<{ lat: number | null; lng: number | null; found: boolean }[]>`
    select lat, lng, found from postcode_cache where postcode = ${pc}`;
  if (row) return row.found && row.lat != null ? { lat: row.lat, lng: row.lng! } : null;

  // Live fallback for a cache miss.
  const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`);
  const ok = res.ok;
  const json = ok ? await res.json() : null;
  const ll: LatLng | null =
    json?.result?.latitude != null
      ? { lat: json.result.latitude, lng: json.result.longitude }
      : null;
  await sql`
    insert into postcode_cache (postcode, lat, lng, found)
    values (${pc}, ${ll?.lat ?? null}, ${ll?.lng ?? null}, ${!!ll})
    on conflict (postcode) do update set lat = excluded.lat, lng = excluded.lng,
      found = excluded.found, fetched_at = now()`;
  return ll;
}
