import { NextResponse } from "next/server";
import { parseBody, createLeadBody } from "@/lib/api/validate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// List leads: the signed-in user's own agency, or the demo agency's samples.
export async function GET() {
  try {
    const { withTenant } = await import("@/lib/db/tenant");
    const { resolveSession, demoAgencyId } = await import("@/lib/auth");

    const session = await resolveSession();
    const agencyId = session?.agencyId ?? (await demoAgencyId());
    if (!agencyId) return NextResponse.json({ leads: [], demo: !session });

    const leads = await withTenant(agencyId, (sql) =>
      sql`
        select id, raw_text, contact, requirements, status, created_at
        from leads order by created_at desc limit 100`,
    );
    return NextResponse.json({ leads, demo: !session });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// Create a lead — real data, so authentication is required.
export async function POST(req: Request) {
  try {
    const parsed = await parseBody(req, createLeadBody);
    if ("response" in parsed) return parsed.response;

    const { resolveSession } = await import("@/lib/auth");
    const session = await resolveSession();
    if (!session) {
      return NextResponse.json({ error: "sign in to add leads" }, { status: 401 });
    }

    const { withTenant } = await import("@/lib/db/tenant");
    const { enquiry, contact, requirements } = parsed.data;
    const [lead] = await withTenant(session.agencyId, (sql) =>
      sql<{ id: string }[]>`
        insert into leads (agency_id, raw_text, contact, requirements, status)
        values (${session.agencyId}, ${enquiry}, ${contact ?? null},
                ${requirements ? sql.json(requirements) : null}, 'new')
        returning id`,
    );
    return NextResponse.json({ leadId: lead.id });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
