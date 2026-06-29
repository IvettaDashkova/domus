import { NextResponse } from "next/server";

// Embeds + DB: must be dynamic + Node, with lazy init.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface MatchBody {
  brief?: string;
  filters?: {
    minPrice?: number | null;
    maxPrice?: number | null;
    bedrooms?: number | null;
    propertyType?: string | null;
  };
  location?: { lat: number; lng: number; radiusKm?: number | null } | null;
  limit?: number;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as MatchBody;
    const brief = (body.brief ?? "").trim();

    const { getAdminDb } = await import("@/lib/db/client");
    const { withTenant } = await import("@/lib/db/tenant");
    const { hybridMatch } = await import("@/lib/retrieval/hybrid");

    const admin = getAdminDb();
    const [agency] = await admin<{ id: string }[]>`
      select id from agencies order by created_at limit 1`;
    if (!agency) return NextResponse.json({ results: [] });

    // Embed the brief (semantic signal). Skipped when the brief is empty.
    let queryVec: number[] | null = null;
    if (brief) {
      const { embedText } = await import("@/lib/embeddings/text");
      queryVec = await embedText(brief);
    }

    const results = await withTenant(agency.id, (sql) =>
      hybridMatch(sql, {
        brief,
        queryVec,
        filters: body.filters,
        location: body.location ?? null,
        limit: Math.min(body.limit ?? 20, 100),
      }),
    );

    return NextResponse.json({ count: results.length, results });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
