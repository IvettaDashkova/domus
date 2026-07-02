import { NextResponse } from "next/server";
import { parseBody, createListingBody } from "@/lib/api/validate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Approx city centres (lat,lng) for placing user-added listings on the map.
const PL_CITIES: Record<string, [number, number]> = {
  warszawa: [52.2297, 21.0122],
  warsaw: [52.2297, 21.0122],
  kraków: [50.0647, 19.945],
  krakow: [50.0647, 19.945],
  wrocław: [51.1079, 17.0385],
  wroclaw: [51.1079, 17.0385],
  gdańsk: [54.352, 18.6466],
  gdansk: [54.352, 18.6466],
  poznań: [52.4064, 16.9252],
  poznan: [52.4064, 16.9252],
  łódź: [51.7592, 19.456],
  lodz: [51.7592, 19.456],
};

// Add a property to the shared demo catalog (authenticated users only).
export async function POST(req: Request) {
  try {
    const parsed = await parseBody(req, createListingBody);
    if ("response" in parsed) return parsed.response;
    const body = parsed.data;

    const { resolveSession } = await import("@/lib/auth");
    const session = await resolveSession();
    if (!session) return NextResponse.json({ error: "sign in to add a property" }, { status: 401 });
    // Saved into the signed-in agent's OWN agency (private), shown alongside the
    // shared demo catalog on their map.
    const agencyId = session.agencyId;

    // Locate: known Polish city centre + small jitter, else geocode the address.
    let lat: number | null = null;
    let lng: number | null = null;
    const key = body.city.trim().toLowerCase();
    if (PL_CITIES[key]) {
      const [clat, clng] = PL_CITIES[key];
      lat = clat + (Math.random() - 0.5) * 0.06;
      lng = clng + (Math.random() - 0.5) * 0.09;
    } else {
      const { geocodePlace } = await import("@/lib/geocode/place");
      const hit = await geocodePlace(`${body.address}, ${body.city}, Poland`);
      if (hit) {
        lat = hit.lat;
        lng = hit.lng;
      }
    }

    const description =
      body.description?.trim() ||
      `${body.propertyType[0].toUpperCase()}${body.propertyType.slice(1)} in ${body.city}. ${body.address}.`;

    const { embedText, toVectorLiteral } = await import("@/lib/embeddings/text");
    const { withTenant } = await import("@/lib/db/tenant");
    const { getAdminDb } = await import("@/lib/db/client");
    const vec = await embedText(description);

    // Reuse a pool photo's precomputed CLIP embedding + tags (avoids recompute).
    const admin = getAdminDb();
    const [photo] = await admin<{ image_url: string; emb: string; tags: string[] }[]>`
      select image_url, image_embedding::text as emb, tags
      from listings
      where image_url is not null and image_embedding is not null
      order by random() limit 1`;

    const [listing] = await withTenant(agencyId, (sql) =>
      sql<{ id: string }[]>`
        insert into listings
          (agency_id, source, external_id, address, price, bedrooms, property_type,
           description, text_embedding, geom, image_url, image_embedding, tags, status)
        values
          (${agencyId}, 'user', ${"user-" + Date.now()}, ${body.address}, ${body.price},
           ${body.bedrooms ?? null}, ${body.propertyType}, ${description},
           ${toVectorLiteral(vec)}::vector,
           ${lat != null && lng != null ? sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography` : null},
           ${photo?.image_url ?? null},
           ${photo?.emb ? sql`${photo.emb}::vector` : null},
           ${photo?.tags ?? null}, 'enriched')
        returning id`,
    );
    return NextResponse.json({ listingId: listing.id });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
