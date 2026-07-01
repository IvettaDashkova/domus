import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { listingId } = (await req.json()) as { listingId?: string };
    if (!listingId) return NextResponse.json({ error: "listingId required" }, { status: 400 });

    const { getAdminDb } = await import("@/lib/db/client");
    const { withTenant } = await import("@/lib/db/tenant");
    const { similarListings } = await import("@/lib/retrieval/visual");

    const admin = getAdminDb();
    const [agency] = await admin<{ id: string }[]>`
      select id from agencies order by created_at limit 1`;
    if (!agency) return NextResponse.json({ results: [] });

    const results = await withTenant(agency.id, (sql) => similarListings(sql, listingId, 12));
    return NextResponse.json({ count: results.length, results });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
