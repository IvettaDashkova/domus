import { tool } from "ai";
import { z } from "zod";
import type { ToolSet } from "ai";
import { withTenant } from "@/lib/db/tenant";
import { hybridMatch } from "@/lib/retrieval/hybrid";
import { embedText } from "@/lib/embeddings/text";
import { geocodePlace } from "@/lib/geocode/place";
import { findComps } from "@/lib/valuation/comps";
import { valuate } from "@/lib/valuation/avm";
import { planRoute } from "@/lib/routing/route";

const PROPERTY_TYPES = ["apartment", "house", "studio", "townhouse", "any"] as const;

/**
 * The agent's tools, bound to one agency's tenant. Each tool executes real
 * retrieval / geo / valuation code against `agencyId` under RLS — so the model
 * can only ever surface what the catalog actually contains (no fabrication).
 */
export function buildTools(agencyId: string): ToolSet {
  return {
    search_listings: tool({
      description:
        "Search the agency's live catalog for matching properties. Combines " +
        "semantic, keyword and spatial ranking. Use for any 'find me…' request.",
      inputSchema: z.object({
        brief: z
          .string()
          .describe("Neutral paraphrase of what the buyer wants, for semantic search."),
        location: z
          .string()
          .nullish()
          .describe("City/district/postcode to search near, e.g. 'Wrocław'."),
        propertyType: z.enum(PROPERTY_TYPES).nullish(),
        minPrice: z.number().nullish().describe("Minimum budget in PLN."),
        maxPrice: z.number().nullish().describe("Maximum budget in PLN."),
        bedrooms: z.number().int().nullish(),
        limit: z.number().int().min(1).max(20).nullish(),
      }),
      execute: async ({ brief, location, propertyType, minPrice, maxPrice, bedrooms, limit }) => {
        const loc = location ? await geocodePlace(location) : null;
        const queryVec = brief ? await embedText(brief) : null;
        const rows = await withTenant(agencyId, (sql) =>
          hybridMatch(sql, {
            brief: brief ?? "",
            queryVec,
            filters: {
              minPrice: minPrice ?? null,
              maxPrice: maxPrice ?? null,
              bedrooms: bedrooms ?? null,
              propertyType: propertyType && propertyType !== "any" ? propertyType : null,
            },
            location: loc ? { lat: loc.lat, lng: loc.lng, radiusKm: 25 } : null,
            limit: Math.min(limit ?? 6, 20),
          }),
        );
        return {
          count: rows.length,
          results: rows.map((r) => ({
            id: r.id,
            address: r.address,
            price: r.price,
            bedrooms: r.bedrooms,
            propertyType: r.property_type,
          })),
        };
      },
    }),

    value_property: tool({
      description:
        "Estimate the market value of one listing from nearby comparable sales " +
        "(inverse-distance-weighted AVM). Returns an estimate range and confidence.",
      inputSchema: z.object({
        listingId: z.string().uuid().describe("The listing id to value."),
      }),
      execute: async ({ listingId }) =>
        withTenant(agencyId, async (sql) => {
          const [subject] = await sql<
            {
              id: string;
              address: string | null;
              price: number | null;
              bedrooms: number | null;
              property_type: string | null;
              lng: number;
              lat: number;
            }[]
          >`
            select id, address, price::float8 as price, bedrooms, property_type,
                   st_x(geom::geometry) as lng, st_y(geom::geometry) as lat
            from listings where id = ${listingId} and geom is not null`;
          if (!subject) return { error: "listing not found" };
          const { comps, radiusM } = await findComps(sql, {
            id: subject.id,
            lng: subject.lng,
            lat: subject.lat,
            propertyType: subject.property_type,
            bedrooms: subject.bedrooms,
          });
          if (comps.length === 0) return { error: "no comparable sales nearby" };
          const v = valuate(comps, subject, radiusM, subject.price);
          return {
            address: subject.address,
            estimate: v.estimate,
            low: v.low,
            high: v.high,
            confidence: v.confidence,
            compCount: v.compCount,
          };
        }),
    }),

    plan_viewing_route: tool({
      description:
        "Plan an optimized viewing route from a start point through several " +
        "listings (TSP over real driving times). Returns ordered stops + ETAs.",
      inputSchema: z.object({
        start: z.object({ lat: z.number(), lng: z.number() }),
        listingIds: z.array(z.string().uuid()).min(1).max(25),
      }),
      execute: async ({ start, listingIds }) => {
        const listings = await withTenant(agencyId, (sql) =>
          sql<{ id: string; address: string | null; lng: number; lat: number }[]>`
            select id, address, st_x(geom::geometry) as lng, st_y(geom::geometry) as lat
            from listings where id in ${sql(listingIds)} and geom is not null`,
        );
        if (listings.length === 0) return { error: "no routable listings" };
        const plan = await planRoute({ start, listings });
        return {
          mode: plan.mode,
          degraded: plan.degraded,
          driveSec: plan.optimizedDriveSec,
          stops: plan.stops.map((s) => ({ address: s.address, arrival: s.arrival })),
        };
      },
    }),

    geocode_place: tool({
      description:
        "Resolve a Polish place name / district / postcode to coordinates. Use " +
        "before plan_viewing_route when the user gives a start location as text.",
      inputSchema: z.object({ place: z.string() }),
      execute: async ({ place }) => {
        const hit = await geocodePlace(place);
        return hit ?? { error: "could not geocode that place" };
      },
    }),
  };
}
