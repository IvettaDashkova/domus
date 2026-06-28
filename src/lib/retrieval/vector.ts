import type postgres from "postgres";
import { toVectorLiteral } from "@/lib/embeddings/text";

export interface ListingMatch {
  id: string;
  address: string | null;
  distance: number;
}

/**
 * kNN over listings.text_embedding using pgvector cosine distance (<=>).
 * Runs against a tenant-scoped connection (RLS already applied by `tx`).
 * Ranking/hybrid retrieval (RRF) comes in a later phase — this is the
 * primitive the matcher will build on.
 */
export async function knnByTextEmbedding(
  tx: postgres.Sql,
  queryVec: number[],
  k = 10,
): Promise<ListingMatch[]> {
  const literal = toVectorLiteral(queryVec);
  const rows = await tx<ListingMatch[]>`
    select id,
           address,
           text_embedding <=> ${literal}::vector as distance
    from listings
    where text_embedding is not null
    order by text_embedding <=> ${literal}::vector
    limit ${k}
  `;
  return rows;
}
