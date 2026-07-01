import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { leadId } = (await req.json()) as { leadId?: string };
    if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

    const { getAdminDb } = await import("@/lib/db/client");
    const { withTenant } = await import("@/lib/db/tenant");
    const { matchFromBrief } = await import("@/lib/leads/triage");

    const admin = getAdminDb();
    const [agency] = await admin<{ id: string }[]>`
      select id from agencies order by created_at limit 1`;
    if (!agency) return NextResponse.json({ error: "no agency" }, { status: 404 });

    const [lead] = await withTenant(agency.id, (sql) =>
      sql<{ requirements: Record<string, unknown> }[]>`
        select requirements from leads where id = ${leadId}`,
    );
    if (!lead?.requirements) return NextResponse.json({ error: "lead not found" }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { location, results } = await matchFromBrief(agency.id, lead.requirements as any);
    return NextResponse.json({ brief: lead.requirements, location, count: results.length, results });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
