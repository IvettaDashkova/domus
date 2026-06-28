import Map, { type MapMarker } from "@/components/Map";
import ListingList, { type ListingRow } from "@/components/ListingList";

// DB-touching page: keep it dynamic and Node, init the client lazily.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Row extends ListingRow {
  lng: number | null;
  lat: number | null;
}

async function loadListings(): Promise<{ rows: Row[]; error?: string }> {
  try {
    const { getAdminDb } = await import("@/lib/db/client");
    const { withTenant } = await import("@/lib/db/tenant");
    const admin = getAdminDb();
    const [agency] = await admin<{ id: string }[]>`
      select id from agencies order by created_at limit 1
    `;
    if (!agency) return { rows: [] };

    const rows = await withTenant(agency.id, (sql) =>
      sql<Row[]>`
        select id, address, price, bedrooms, property_type,
               st_x(geom::geometry) as lng,
               st_y(geom::geometry) as lat
        from listings
        order by created_at desc
        limit 100
      `,
    );
    return { rows };
  } catch (err) {
    return { rows: [], error: (err as Error).message };
  }
}

export default async function Home() {
  const { rows, error } = await loadListings();
  const markers: MapMarker[] = rows
    .filter((r) => r.lng != null && r.lat != null)
    .map((r) => ({
      id: r.id,
      lng: r.lng as number,
      lat: r.lat as number,
      label: r.address ?? undefined,
    }));

  return (
    <main
      style={{
        display: "grid",
        gridTemplateColumns: "360px 1fr",
        height: "100vh",
      }}
    >
      <aside
        style={{
          background: "var(--panel)",
          borderRight: "1px solid var(--border)",
          overflow: "auto",
        }}
      >
        <header style={{ padding: "16px 12px", borderBottom: "1px solid var(--border)" }}>
          <h1 style={{ fontSize: 18, margin: 0 }}>Domus</h1>
          <p style={{ color: "var(--muted)", fontSize: 12, margin: "4px 0 0" }}>
            {error ? `DB error: ${error}` : `${rows.length} listings`}
          </p>
        </header>
        <ListingList listings={rows} />
      </aside>
      <section style={{ padding: 8 }}>
        <Map markers={markers} />
      </section>
    </main>
  );
}
