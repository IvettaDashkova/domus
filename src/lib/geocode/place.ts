import type { LatLng } from "@/lib/geocode/postcodes";

// Polish postal codes are "NN-NNN" (e.g. 00-001). Used to switch Nominatim
// into a structured postalcode lookup, which is more reliable than free text.
const PL_POSTCODE_RE = /^\d{2}-\d{3}$/;

/**
 * Geocode a free-text location from a triaged brief (or a listing address).
 * The catalog is Polish, so every lookup is constrained to Poland via
 * Nominatim's `countrycodes=pl`. Biasing by country code (rather than
 * appending ", Poland" to the query) keeps callers that already include the
 * country working, and stops "Warsaw" resolving to a UK hamlet.
 */
export async function geocodePlace(text: string): Promise<LatLng | null> {
  const t = text.trim();
  if (!t) return null;

  const params = new URLSearchParams({
    format: "json",
    limit: "1",
    countrycodes: "pl",
  });
  if (PL_POSTCODE_RE.test(t)) params.set("postalcode", t);
  else params.set("q", t);

  const res = await fetch(
    "https://nominatim.openstreetmap.org/search?" + params,
    { headers: { "user-agent": "domus-portfolio/0.1 (lead-triage geocoder)" } },
  );
  if (!res.ok) return null;
  const j = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (j[0]) return { lat: Number(j[0].lat), lng: Number(j[0].lon) };
  return null;
}
