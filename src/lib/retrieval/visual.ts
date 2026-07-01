import type postgres from "postgres";
import { toVectorLiteral } from "@/lib/embeddings/text";

export interface VisualHit {
  id: string;
  address: string | null;
  property_type: string | null;
  price: number | null;
  bedrooms: number | null;
  image_url: string | null;
  tags: string[] | null;
  lng: number | null;
  lat: number | null;
  distance: number;
}

/** Image→image: listings whose photo looks most like the subject's (CLIP cosine). */
export async function similarListings(
  sql: postgres.Sql,
  listingId: string,
  k = 12,
): Promise<VisualHit[]> {
  return sql<VisualHit[]>`
    with subject as (select image_embedding from listings where id = ${listingId})
    select id, address, property_type, price, bedrooms, image_url, tags,
           st_x(geom::geometry) as lng, st_y(geom::geometry) as lat,
           image_embedding <=> (select image_embedding from subject) as distance
    from listings
    where id <> ${listingId}
      and image_embedding is not null
      and (select image_embedding from subject) is not null
    order by image_embedding <=> (select image_embedding from subject)
    limit ${k}`;
}

/** Text→image: listings whose photo best matches a CLIP text query embedding. */
export async function visualTextSearch(
  sql: postgres.Sql,
  queryVec: number[],
  k = 24,
): Promise<VisualHit[]> {
  const literal = toVectorLiteral(queryVec);
  return sql<VisualHit[]>`
    select id, address, property_type, price, bedrooms, image_url, tags,
           st_x(geom::geometry) as lng, st_y(geom::geometry) as lat,
           image_embedding <=> ${literal}::vector as distance
    from listings
    where image_embedding is not null
    order by image_embedding <=> ${literal}::vector
    limit ${k}`;
}
