import { lookup as lookupPostcode, type LatLng } from "@/lib/geocode/postcodes";

const POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?(\s*\d[A-Z]{2})?$/i;

/**
 * Geocode a free-text location from a triaged brief.
 * Postcodes/outcodes → postcodes.io (cached); place/area names → Nominatim (OSM).
 */
export async function geocodePlace(text: string): Promise<LatLng | null> {
  const t = text.trim();
  if (!t) return null;

  if (POSTCODE_RE.test(t)) {
    const hit = await lookupPostcode(t);
    if (hit) return hit;
  }

  const url =
    "https://nominatim.openstreetmap.org/search?" +
    new URLSearchParams({ q: `${t}, United Kingdom`, format: "json", limit: "1" });
  const res = await fetch(url, {
    headers: { "user-agent": "domus-portfolio/0.1 (lead-triage geocoder)" },
  });
  if (!res.ok) return null;
  const j = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (j[0]) return { lat: Number(j[0].lat), lng: Number(j[0].lon) };
  return null;
}
