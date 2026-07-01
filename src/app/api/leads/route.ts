import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { getAdminDb } = await import("@/lib/db/client");
    const { withTenant } = await import("@/lib/db/tenant");

    const admin = getAdminDb();
    const [agency] = await admin<{ id: string }[]>`
      select id from agencies order by created_at limit 1`;
    if (!agency) return NextResponse.json({ leads: [] });

    const leads = await withTenant(agency.id, (sql) =>
      sql`
        select id, raw_text, requirements, status, created_at
        from leads order by created_at desc limit 100`,
    );
    return NextResponse.json({ leads });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
