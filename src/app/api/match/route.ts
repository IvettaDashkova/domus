import { NextResponse } from "next/server";
import { parseBody, matchBody } from "@/lib/api/validate";

// Embeds + DB: must be dynamic + Node, with lazy init.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const parsed = await parseBody(req, matchBody);
    if ("response" in parsed) return parsed.response;
    const body = parsed.data;
    const brief = (body.brief ?? "").trim();

    const { withTenant } = await import("@/lib/db/tenant");
    const { hybridMatch } = await import("@/lib/retrieval/hybrid");
    const { scopedAgencies } = await import("@/lib/listings/scope");

    const scoped = await scopedAgencies();
    if (!scoped.length) return NextResponse.json({ results: [] });

    // Embed the brief (semantic signal). Skipped when the brief is empty.
    let queryVec: number[] | null = null;
    if (brief) {
      const { embedText } = await import("@/lib/embeddings/text");
      queryVec = await embedText(brief);
    }

    const limit = Math.min(body.limit ?? 20, 100);
    // Match own listings + the shared catalog, then merge on RRF score.
    const perAgency = await Promise.all(
      scoped.map((a) =>
        withTenant(a.id, (sql) =>
          hybridMatch(sql, {
            brief,
            queryVec,
            filters: body.filters,
            location: body.location ?? null,
            limit,
          }),
        ).then((rows) => rows.map((r) => ({ ...r, own: a.own }))),
      ),
    );
    const results = perAgency
      .flat()
      .sort((x, y) => (Number(y.score) || 0) - (Number(x.score) || 0))
      .slice(0, limit);

    return NextResponse.json({ count: results.length, results });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
