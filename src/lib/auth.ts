import { getAdminDb } from "@/lib/db/client";
import { currentUserEmail } from "@/lib/supabase/server";

export interface Session {
  email: string;
  agencyId: string;
}

/** The shared, public demo agency (the seeded open-data catalog). */
export async function demoAgencyId(): Promise<string | null> {
  const sql = getAdminDb();
  const [a] = await sql<{ id: string }[]>`
    select id from agencies where slug = 'domus-demo' limit 1`;
  return a?.id ?? null;
}

/**
 * Resolve the signed-in user's own agency, creating user + agency + membership
 * on first login. Returns null when unauthenticated (demo mode).
 */
export async function resolveSession(): Promise<Session | null> {
  const email = await currentUserEmail();
  if (!email) return null;

  const sql = getAdminDb();
  const [user] = await sql<{ id: string }[]>`
    insert into users (email) values (${email})
    on conflict (email) do update set email = excluded.email
    returning id`;

  const [membership] = await sql<{ agency_id: string }[]>`
    select agency_id from memberships where user_id = ${user.id} limit 1`;
  if (membership) return { email, agencyId: membership.agency_id };

  const slug = `u-${user.id.slice(0, 8)}`;
  const name = `${email.split("@")[0]}'s agency`;
  const [agency] = await sql<{ id: string }[]>`
    insert into agencies (name, slug) values (${name}, ${slug})
    on conflict (slug) do update set name = excluded.name
    returning id`;
  await sql`
    insert into memberships (user_id, agency_id, role)
    values (${user.id}, ${agency.id}, 'owner')
    on conflict (user_id, agency_id) do nothing`;

  return { email, agencyId: agency.id };
}
