import Map, { type MapMarker } from "@/components/Map";
import ListingList, { type ListingRow } from "@/components/ListingList";
import Logo from "@/components/Logo";
import { categoryColor } from "@/lib/ui/category";

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
      color: categoryColor(r.property_type),
    }));

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <Logo />
          Domus
        </div>
        <div className="search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input placeholder="Search listings, leads, areas…" disabled />
        </div>
        <div className="topbar-spacer" />
        <div className="avatar">DA</div>
      </header>

      <div className="body">
        <aside className="panel">
          <div className="panel-head">
            <span className="panel-title">Listings</span>
            <span className="count-pill">
              {error ? "DB error" : `${rows.length}`}
            </span>
          </div>
          {error ? (
            <div className="empty">{error}</div>
          ) : (
            <ListingList listings={rows} />
          )}
        </aside>

        <section className="panel map-wrap">
          <div className="map-overlay">
            <div className="map-badge">
              <span className="dot" style={{ background: "var(--pin-green)" }} />
              {markers.length} on map
            </div>
          </div>
          <Map markers={markers} />
        </section>
      </div>
    </div>
  );
}
