import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config();

/**
 * Security audit: proves multi-tenant isolation on every domain table and that
 * the application role has no privilege escape hatch. Exits non-zero on any
 * failure (used locally + in CI).
 */
const DOMAIN_TABLES = ["listings", "leads", "viewings"] as const;

async function main() {
  const adminUrl = process.env.DATABASE_URL;
  const appUrl = process.env.APP_DATABASE_URL;
  if (!adminUrl || !appUrl) throw new Error("DATABASE_URL / APP_DATABASE_URL required");

  const admin = postgres(adminUrl, { max: 1 });
  const app = postgres(appUrl, { max: 1 });
  const failures: string[] = [];

  // ── Role privilege check: app role must not be able to bypass RLS ─────────
  const [role] = await admin<{ rolsuper: boolean; rolbypassrls: boolean; rolname: string }[]>`
    select rolname, rolsuper, rolbypassrls from pg_roles where rolname = 'domus_app'`;
  if (!role) failures.push("app role not found");
  else {
    if (role.rolsuper) failures.push(`app role ${role.rolname} IS superuser`);
    if (role.rolbypassrls) failures.push(`app role ${role.rolname} has BYPASSRLS`);
    console.log(`role ${role?.rolname}: superuser=${role?.rolsuper} bypassrls=${role?.rolbypassrls}`);
  }

  // ── Two tenants ───────────────────────────────────────────────────────────
  const [a] = await admin<{ id: string }[]>`
    insert into agencies (name, slug) values ('Audit A', 'audit-a')
    on conflict (slug) do update set name = excluded.name returning id`;
  const [b] = await admin<{ id: string }[]>`
    insert into agencies (name, slug) values ('Audit B', 'audit-b')
    on conflict (slug) do update set name = excluded.name returning id`;

  async function visibleCount(agencyId: string | null, table: string) {
    return app.begin(async (tx) => {
      await tx`select set_config('app.current_agency', ${agencyId}, true)`;
      const [{ n }] = await tx.unsafe(`select count(*)::int n from ${table}
        where agency_id in ('${a.id}','${b.id}')`);
      return n as number;
    });
  }

  for (const table of DOMAIN_TABLES) {
    await admin.unsafe(`delete from ${table} where agency_id in ('${a.id}','${b.id}')`);
    await admin.unsafe(`insert into ${table} (agency_id) values ('${a.id}'),('${b.id}')`);

    const asA = await visibleCount(a.id, table);
    const asB = await visibleCount(b.id, table);
    const asNone = await visibleCount(null, table);
    const ok = asA === 1 && asB === 1 && asNone === 0;
    console.log(`${table}: A=${asA} B=${asB} none=${asNone}  ${ok ? "PASS" : "FAIL"}`);
    if (!ok) failures.push(`${table} isolation (A=${asA} B=${asB} none=${asNone})`);
  }

  // Cleanup
  for (const table of DOMAIN_TABLES) {
    await admin.unsafe(`delete from ${table} where agency_id in ('${a.id}','${b.id}')`);
  }
  await admin`delete from agencies where id in (${a.id}, ${b.id})`;
  await admin.end();
  await app.end();

  if (failures.length) {
    console.error("\nSECURITY AUDIT: FAIL ❌");
    for (const f of failures) console.error("  - " + f);
    process.exit(1);
  }
  console.log("\nSECURITY AUDIT: PASS ✅  (RLS isolation on all domain tables; app role non-privileged)");
}

main().catch((err) => {
  console.error("security-audit failed:", err);
  process.exit(1);
});
