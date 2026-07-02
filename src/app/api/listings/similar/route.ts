import { NextResponse } from "next/server";
import { parseBody, similarBody } from "@/lib/api/validate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const parsed = await parseBody(req, similarBody);
    if ("response" in parsed) return parsed.response;
    const { listingId } = parsed.data;

    const { withTenant } = await import("@/lib/db/tenant");
    const { similarListings } = await import("@/lib/retrieval/visual");
    const { agencyForListing } = await import("@/lib/listings/scope");

    // similar reads the subject's embedding, so it must run in the subject's agency.
    const agency = await agencyForListing(listingId);
    if (!agency) return NextResponse.json({ results: [] });

    const results = await withTenant(agency.id, (sql) => similarListings(sql, listingId, 12));
    return NextResponse.json({ count: results.length, results });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
