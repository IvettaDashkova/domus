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

/**
 * Lead triage: free-text enquiry -> structured brief (LLM) -> persisted lead ->
 * hybrid match. Negations become exclude filters; location drives the spatial
 * signal; mustHaves enrich the semantic query.
 */
export async function triageLead(agencyId: string, enquiry: string): Promise<TriageResult> {
  const brief = await extractBrief(enquiry);
  const location = brief.location ? await geocodePlace(brief.location) : null;

  const queryText = [brief.semanticBrief, ...brief.mustHaves].filter(Boolean).join(", ");
  const queryVec = queryText ? await embedText(queryText) : null;
  const propertyType =
    brief.propertyType && brief.propertyType !== "any" ? brief.propertyType : null;

  const { leadId, results } = await withTenant(agencyId, async (sql) => {
    const [lead] = await sql<{ id: string }[]>`
      insert into leads (agency_id, raw_text, requirements, status)
      values (${agencyId}, ${enquiry}, ${sql.json(brief)}, 'triaged')
      returning id`;
    const results = await hybridMatch(sql, {
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
    });
    return { leadId: lead.id, results };
  });

  return { brief, leadId, location, results };
}
