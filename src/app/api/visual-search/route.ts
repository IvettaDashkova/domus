import { NextResponse } from "next/server";
import { parseBody, visualSearchBody } from "@/lib/api/validate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const parsed = await parseBody(req, visualSearchBody);
    if ("response" in parsed) return parsed.response;
    const q = parsed.data.query.trim();

    const { withTenant } = await import("@/lib/db/tenant");
    const { embedClipText } = await import("@/lib/embeddings/clip");
    const { visualTextSearch } = await import("@/lib/retrieval/visual");
    const { scopedAgencies } = await import("@/lib/listings/scope");

    const scoped = await scopedAgencies();
    if (!scoped.length) return NextResponse.json({ results: [] });

    const vec = await embedClipText(q); // CLIP text space — matches image embeddings
    const perAgency = await Promise.all(
      scoped.map((a) =>
        withTenant(a.id, (sql) => visualTextSearch(sql, vec, 24)).then((rows) =>
          rows.map((r) => ({ ...r, own: a.own })),
        ),
      ),
    );
    const results = perAgency
      .flat()
      .sort((x, y) => (Number((y as { score?: number }).score) || 0) - (Number((x as { score?: number }).score) || 0))
      .slice(0, 24);
    return NextResponse.json({ count: results.length, results });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
