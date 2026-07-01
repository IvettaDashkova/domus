import { withTenant } from "@/lib/db/tenant";
import { embedText } from "@/lib/embeddings/text";
import { hybridMatch, type MatchResult } from "@/lib/retrieval/hybrid";
import { extractBrief, type Brief } from "@/lib/leads/extract";
import { geocodePlace } from "@/lib/geocode/place";
import type { LatLng } from "@/lib/geocode/postcodes";

export interface TriageResult {
  brief: Brief;
  leadId: string;
  location: LatLng | null;
  results: MatchResult[];
}

/** Run the matcher from a (already extracted) structured brief. Reused by
 *  live triage and by re-opening a saved lead. */
export async function matchFromBrief(
  agencyId: string,
  brief: Brief,
): Promise<{ location: LatLng | null; results: MatchResult[] }> {
  const location = brief.location ? await geocodePlace(brief.location) : null;
  const queryText = [brief.semanticBrief, ...brief.mustHaves].filter(Boolean).join(", ");
  const queryVec = queryText ? await embedText(queryText) : null;
  const propertyType =
    brief.propertyType && brief.propertyType !== "any" ? brief.propertyType : null;

  const results = await withTenant(agencyId, (sql) =>
    hybridMatch(sql, {
      brief: queryText,
      queryVec,
      filters: {
        minPrice: brief.minPrice,
        maxPrice: brief.maxPrice,
        bedrooms: brief.bedrooms,
        propertyType,
      },
      location: location ? { lat: location.lat, lng: location.lng, radiusKm: 25 } : null,
      excludes: brief.excludes,
      limit: 30,
    }),
  );
  return { location, results };
}

/** Lead triage: free-text enquiry -> LLM brief -> persisted lead -> matches. */
export async function triageLead(agencyId: string, enquiry: string): Promise<TriageResult> {
  const brief = await extractBrief(enquiry);
  const { location, results } = await matchFromBrief(agencyId, brief);

  const [lead] = await withTenant(agencyId, (sql) =>
    sql<{ id: string }[]>`
      insert into leads (agency_id, raw_text, requirements, status)
      values (${agencyId}, ${enquiry}, ${sql.json(brief)}, 'triaged')
      returning id`,
  );

  return { brief, leadId: lead.id, location, results };
}
