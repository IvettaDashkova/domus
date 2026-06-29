import Workspace, { type WorkspaceRow } from "@/components/Workspace";

// DB-touching page: keep it dynamic and Node, init the client lazily.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function loadInitial(): Promise<WorkspaceRow[]> {
  try {
    const { getAdminDb } = await import("@/lib/db/client");
    const { withTenant } = await import("@/lib/db/tenant");
    const admin = getAdminDb();
    const [agency] = await admin<{ id: string }[]>`
      select id from agencies order by created_at limit 1`;
    if (!agency) return [];
    return await withTenant(agency.id, (sql) =>
      sql<WorkspaceRow[]>`
        select id, address, price, bedrooms, property_type,
               st_x(geom::geometry) as lng, st_y(geom::geometry) as lat
        from listings
        where status = 'enriched'
        order by created_at desc
        limit 100`,
    );
  } catch {
    return [];
  }
}

export default async function Home() {
  const initial = await loadInitial();
  return <Workspace initial={initial} />;
}
