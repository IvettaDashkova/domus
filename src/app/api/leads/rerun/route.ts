import { NextResponse } from "next/server";
import { parseBody, rerunBody } from "@/lib/api/validate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const parsed = await parseBody(req, rerunBody);
    if ("response" in parsed) return parsed.response;
    const { leadId } = parsed.data;

    const { withTenant } = await import("@/lib/db/tenant");
    const { matchFromBrief } = await import("@/lib/leads/triage");
    const { resolveSession, demoAgencyId } = await import("@/lib/auth");

    const session = await resolveSession();
    const demo = await demoAgencyId();
    const leadAgency = session?.agencyId ?? demo;
    if (!leadAgency || !demo) return NextResponse.json({ error: "no agency" }, { status: 404 });

    const [lead] = await withTenant(leadAgency, (sql) =>
      sql<{ requirements: Record<string, unknown> }[]>`
        select requirements from leads where id = ${leadId}`,
    );
    if (!lead?.requirements) return NextResponse.json({ error: "lead not found" }, { status: 404 });

    // Match against the shared demo catalog.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { location, results } = await matchFromBrief(demo, lead.requirements as any);
    return NextResponse.json({ brief: lead.requirements, location, count: results.length, results });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
