import { NextResponse } from "next/server";
import { parseBody, valuationBody } from "@/lib/api/validate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const parsed = await parseBody(req, valuationBody);
    if ("response" in parsed) return parsed.response;
    const { listingId } = parsed.data;

    const { getAdminDb } = await import("@/lib/db/client");
    const { withTenant } = await import("@/lib/db/tenant");
    const { findComps } = await import("@/lib/valuation/comps");
    const { valuate } = await import("@/lib/valuation/avm");

    const admin = getAdminDb();
    const [agency] = await admin<{ id: string }[]>`
      select id from agencies order by created_at limit 1`;
    if (!agency) return NextResponse.json({ error: "no agency" }, { status: 404 });

    const valuation = await withTenant(agency.id, async (sql) => {
      const [subject] = await sql<
        {
          id: string;
          address: string | null;
          price: number | null;
          bedrooms: number | null;
          property_type: string | null;
          lng: number;
          lat: number;
        }[]
      >`
        select id, address, price::float8 as price, bedrooms, property_type,
               st_x(geom::geometry) as lng, st_y(geom::geometry) as lat
        from listings where id = ${listingId} and geom is not null`;
      if (!subject) return null;

      const { comps, radiusM } = await findComps(sql, {
        id: subject.id,
        lng: subject.lng,
        lat: subject.lat,
        propertyType: subject.property_type,
        bedrooms: subject.bedrooms,
      });
      if (comps.length === 0) return { subject, insufficient: true };

      return { subject, valuation: valuate(comps, subject, radiusM, subject.price) };
    });

    if (!valuation) return NextResponse.json({ error: "listing not found" }, { status: 404 });
    if ("insufficient" in valuation && valuation.insufficient) {
      return NextResponse.json({ error: "no comparable sales nearby" }, { status: 422 });
    }

    return NextResponse.json({
      subject: {
        id: valuation.subject.id,
        address: valuation.subject.address,
        propertyType: valuation.subject.property_type,
        bedrooms: valuation.subject.bedrooms,
      },
      ...valuation.valuation,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
