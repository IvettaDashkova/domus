import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { query } = (await req.json()) as { query?: string };
    const q = (query ?? "").trim();
    if (!q) return NextResponse.json({ error: "query required" }, { status: 400 });

    const { getAdminDb } = await import("@/lib/db/client");
    const { withTenant } = await import("@/lib/db/tenant");
    const { embedClipText } = await import("@/lib/embeddings/clip");
    const { visualTextSearch } = await import("@/lib/retrieval/visual");

    const admin = getAdminDb();
    const [agency] = await admin<{ id: string }[]>`
      select id from agencies order by created_at limit 1`;
    if (!agency) return NextResponse.json({ results: [] });

    const vec = await embedClipText(q); // CLIP text space — matches image embeddings
    const results = await withTenant(agency.id, (sql) => visualTextSearch(sql, vec, 24));
    return NextResponse.json({ count: results.length, results });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
