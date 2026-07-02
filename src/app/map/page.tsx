import Workspace, { type WorkspaceRow } from "@/components/Workspace";
import { currentUserEmail } from "@/lib/supabase/server";

// DB-touching page: keep it dynamic and Node, init the client lazily.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function agencyListings(agencyId: string): Promise<WorkspaceRow[]> {
  const { withTenant } = await import("@/lib/db/tenant");
  return withTenant(agencyId, (sql) =>
    sql<WorkspaceRow[]>`
      select id, address, price, bedrooms, property_type, image_url, tags,
             st_x(geom::geometry) as lng, st_y(geom::geometry) as lat
      from listings
      where status = 'enriched'
      order by created_at desc
      limit 100`,
  );
}

async function loadInitial(): Promise<WorkspaceRow[]> {
  try {
    const { demoAgencyId, resolveSession } = await import("@/lib/auth");
    const [demoId, session] = await Promise.all([demoAgencyId(), resolveSession()]);

    // Shared public demo catalog (foreign listings everyone can browse).
    const demo = demoId ? await agencyListings(demoId) : [];

    // The signed-in agent's own listings (private to their agency).
    const own =
      session && session.agencyId !== demoId
        ? (await agencyListings(session.agencyId)).map((r) => ({ ...r, own: true }))
        : [];

    // Own listings first so they're immediately visible.
    return [...own, ...demo];
  } catch {
    return [];
  }
}

export default async function MapPage() {
  const [initial, userEmail] = await Promise.all([loadInitial(), currentUserEmail()]);
  return <Workspace initial={initial} userEmail={userEmail} />;
}
