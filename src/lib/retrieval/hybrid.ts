import type postgres from "postgres";
import { toVectorLiteral } from "@/lib/embeddings/text";

/**
 * Hybrid retrieval with Reciprocal Rank Fusion (RRF).
 *
 * Three independent signals, each a ranked candidate list, fused by
 *   score = Σ wᵢ / (k + rankᵢ)            (standard RRF, k = 60)
 *   - dense   : pgvector cosine kNN on text_embedding   (semantic)
 *   - lexical : pg_trgm similarity on description        (keyword overlap)
 *   - spatial : PostGIS distance from a point            (when a location is set)
 *
 * Runs entirely in SQL (CTEs + window ranks) against a tenant-scoped
 * connection. Hard filters (price/beds/type/radius) constrain the candidate set
 * before fusion.
 */

export interface MatchFilters {
  minPrice?: number | null;
  maxPrice?: number | null;
  bedrooms?: number | null;
  propertyType?: string | null;
}

export interface MatchLocation {
  lat: number;
  lng: number;
  radiusKm?: number | null;
}

export interface MatchParams {
  brief: string;
  queryVec: number[] | null;
  filters?: MatchFilters;
  location?: MatchLocation | null;
  k?: number;
  candidateN?: number;
  limit?: number;
}

export interface MatchResult {
  id: string;
  address: string | null;
  price: number | null;
  bedrooms: number | null;
  property_type: string | null;
  lng: number | null;
  lat: number | null;
  score: number;
  dense_rank: number | null;
  lexical_rank: number | null;
  spatial_rank: number | null;
}

export async function hybridMatch(
  sql: postgres.Sql,
  p: MatchParams,
): Promise<MatchResult[]> {
  const k = p.k ?? 60;
  const candN = p.candidateN ?? 200;
  const limit = p.limit ?? 20;
  const f = p.filters ?? {};

  const hasVec = !!p.queryVec && p.queryVec.length > 0;
  const vec = hasVec ? toVectorLiteral(p.queryVec!) : null;
  const brief = p.brief ?? "";
  const hasLoc = !!p.location;
  const lng = p.location?.lng ?? null;
  const lat = p.location?.lat ?? null;
  const radiusM = p.location?.radiusKm != null ? p.location.radiusKm * 1000 : null;

  return sql<MatchResult[]>`
    with base as (
      select id, address, price, bedrooms, property_type, description, geom,
             text_embedding,
             st_x(geom::geometry) as lng, st_y(geom::geometry) as lat
      from listings
      where status = 'enriched'
        and (${f.minPrice ?? null}::numeric is null or price >= ${f.minPrice ?? null})
        and (${f.maxPrice ?? null}::numeric is null or price <= ${f.maxPrice ?? null})
        and (${f.bedrooms ?? null}::int is null or bedrooms = ${f.bedrooms ?? null})
        and (${f.propertyType ?? null}::text is null or property_type = ${f.propertyType ?? null})
        and (
          ${hasLoc} = false or ${radiusM}::float is null
          or st_dwithin(geom, st_setsrid(st_makepoint(${lng}, ${lat}), 4326)::geography, ${radiusM})
        )
    ),
    dense as (
      select id, row_number() over (order by text_embedding <=> ${vec}::vector) as rnk
      from base
      where ${hasVec} and text_embedding is not null
      order by text_embedding <=> ${vec}::vector
      limit ${candN}
    ),
    lexical as (
      select id, row_number() over (order by similarity(coalesce(description,''), ${brief}) desc) as rnk
      from base
      where ${brief} <> ''
      order by similarity(coalesce(description,''), ${brief}) desc
      limit ${candN}
    ),
    spatial as (
      select id, row_number() over (
        order by geom <-> st_setsrid(st_makepoint(${lng}, ${lat}), 4326)::geography
      ) as rnk
      from base
      where ${hasLoc} and geom is not null
      order by geom <-> st_setsrid(st_makepoint(${lng}, ${lat}), 4326)::geography
      limit ${candN}
    )
    select b.id, b.address, b.price, b.bedrooms, b.property_type, b.lng, b.lat,
           coalesce(1.0/(${k} + d.rnk), 0)
             + coalesce(1.0/(${k} + l.rnk), 0)
             + coalesce(1.0/(${k} + s.rnk), 0) as score,
           d.rnk as dense_rank, l.rnk as lexical_rank, s.rnk as spatial_rank
    from base b
    left join dense d on d.id = b.id
    left join lexical l on l.id = b.id
    left join spatial s on s.id = b.id
    where d.rnk is not null or l.rnk is not null or s.rnk is not null
    order by score desc
    limit ${limit}
  `;
}
