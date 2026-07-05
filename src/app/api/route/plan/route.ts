import { NextResponse } from "next/server";
import { parseBody, routePlanBody } from "@/lib/api/validate";

// OSRM + DB: dynamic, Node, lazy init.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const parsed = await parseBody(req, routePlanBody);
    if ("response" in parsed) return parsed.response;
    const body = parsed.data;

    const { withTenant } = await import("@/lib/db/tenant");
    const { planRoute } = await import("@/lib/routing/route");
    const { scopedAgencies } = await import("@/lib/listings/scope");

    const scoped = await scopedAgencies();
    if (!scoped.length)
      return NextResponse.json({ error: "no agency" }, { status: 404 });

    // Gather the selected listings from wherever they live (own agency + catalog),
    // de-duplicated by id (an id can only match one agency, but guard anyway) and
    // ordered to match the caller's requested stop order.
    const found = (
      await Promise.all(
        scoped.map((a) =>
          withTenant(
            a.id,
            (sql) =>
              sql<
                {
                  id: string;
                  address: string | null;
                  lng: number;
                  lat: number;
                }[]
              >`
              select id, address,
                     st_x(geom::geometry) as lng, st_y(geom::geometry) as lat
              from listings
              where id in ${sql(body.listingIds!)} and geom is not null`,
          ),
        ),
      )
    ).flat();
    const byId = new Map(found.map((l) => [l.id, l]));
    const listings = body.listingIds!.flatMap((id) => {
      const l = byId.get(id);
      return l ? [l] : [];
    });
    if (listings.length < 1) {
      return NextResponse.json(
        { error: "no routable listings" },
        { status: 400 },
      );
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
    // Log the detail server-side; don't leak OSRM/DB internals to the client.
    console.error("route/plan failed", err);
    return NextResponse.json(
      { error: "route planning failed" },
      { status: 500 },
    );
  }
}
