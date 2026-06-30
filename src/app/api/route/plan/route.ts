import { NextResponse } from "next/server";

// OSRM + DB: dynamic, Node, lazy init.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  listingIds?: string[];
  start?: { lng: number; lat: number };
  startTime?: string;
  dwellMin?: number;
  returnToStart?: boolean;
  dayEnd?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    if (!body.listingIds?.length || !body.start) {
      return NextResponse.json({ error: "listingIds and start required" }, { status: 400 });
    }

    const { getAdminDb } = await import("@/lib/db/client");
    const { withTenant } = await import("@/lib/db/tenant");
    const { planRoute } = await import("@/lib/routing/route");

    const admin = getAdminDb();
    const [agency] = await admin<{ id: string }[]>`
      select id from agencies order by created_at limit 1`;
    if (!agency) return NextResponse.json({ error: "no agency" }, { status: 404 });

    const listings = await withTenant(agency.id, (sql) =>
      sql<{ id: string; address: string | null; lng: number; lat: number }[]>`
        select id, address,
               st_x(geom::geometry) as lng, st_y(geom::geometry) as lat
        from listings
        where id in ${sql(body.listingIds!)} and geom is not null`,
    );
    if (listings.length < 1) {
      return NextResponse.json({ error: "no routable listings" }, { status: 400 });
    }

    const plan = await planRoute({
      start: body.start,
      listings,
      startTime: body.startTime,
      dwellMin: body.dwellMin,
      returnToStart: body.returnToStart,
      dayEnd: body.dayEnd,
    });
    return NextResponse.json(plan);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
