import { NextResponse } from "next/server";
import { parseBody, similarBody } from "@/lib/api/validate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const parsed = await parseBody(req, similarBody);
    if ("response" in parsed) return parsed.response;
    const { listingId } = parsed.data;

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
