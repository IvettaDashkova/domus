import type postgres from "postgres";

export interface Subject {
  id?: string; // excluded from its own comps (leave-one-out)
  lng: number;
  lat: number;
  propertyType: string | null;
  bedrooms: number | null;
}

export interface Comp {
  id: string;
  address: string | null;
  price: number;
  bedrooms: number | null;
  property_type: string | null;
  distanceM: number;
}

const RADII_M = [2000, 5000, 10000, 20000, 40000];

/**
 * Spatial comparables: nearest enriched sold listings of the same property type
 * (PostGIS KNN), excluding the subject. Auto-expands the radius until at least
 * `minComps` are found (or the widest ring is reached).
 */
export async function findComps(
  sql: postgres.Sql,
  subject: Subject,
  opts: { minComps?: number; maxComps?: number } = {},
): Promise<{ comps: Comp[]; radiusM: number }> {
  const minComps = opts.minComps ?? 5;
  const maxComps = opts.maxComps ?? 15;
  const { lng, lat } = subject;

  let comps: Comp[] = [];
  let radiusM = RADII_M[RADII_M.length - 1];

  for (const r of RADII_M) {
    comps = await sql<Comp[]>`
      select id, address, price::float8 as price, bedrooms, property_type,
             ST_Distance(geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) as "distanceM"
      from listings
      where status = 'enriched'
        and price is not null
        and geom is not null
        and ${subject.id ?? null}::uuid is distinct from id
        and (${subject.propertyType ?? null}::text is null
             or property_type = ${subject.propertyType ?? null})
        and ST_DWithin(geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${r})
      order by geom <-> ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      limit ${maxComps}
    `;
    radiusM = r;
    if (comps.length >= minComps) break;
  }
  return { comps, radiusM };
}
