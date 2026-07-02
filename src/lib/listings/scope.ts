import { getAdminDb } from "@/lib/db/client";

/**
 * The set of agencies a request should read listings from: the signed-in agent's
 * own agency (private) plus the shared public demo catalog. Falls back to the
 * oldest agency when nothing else resolves (unauthenticated / misconfigured).
 *
 * `own` marks the caller's private listings so the UI can badge them.
 */
export async function scopedAgencies(): Promise<{ id: string; own: boolean }[]> {
  const { demoAgencyId, resolveSession } = await import("@/lib/auth");
  const [demoId, session] = await Promise.all([demoAgencyId(), resolveSession()]);

  const out: { id: string; own: boolean }[] = [];
  if (session?.agencyId && session.agencyId !== demoId) {
    out.push({ id: session.agencyId, own: true });
  }
  if (demoId) out.push({ id: demoId, own: false });

  if (out.length === 0) {
    const [a] = await getAdminDb()<{ id: string }[]>`
      select id from agencies order by created_at limit 1`;
    if (a) out.push({ id: a.id, own: false });
  }
  return out;
}

/** Locate which scoped agency actually holds a given listing id. */
export async function agencyForListing(
  listingId: string,
): Promise<{ id: string; own: boolean } | null> {
  const { withTenant } = await import("@/lib/db/tenant");
  for (const a of await scopedAgencies()) {
    const found = await withTenant(a.id, (sql) =>
      sql<{ id: string }[]>`select id from listings where id = ${listingId} limit 1`,
    );
    if (found.length) return a;
  }
  return null;
}
