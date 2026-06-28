import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config();

/**
 * RLS proof. Seeds two agencies (A, B) with one listing each as superuser,
 * then connects as the non-superuser app role and shows that tenant context
 * A sees only A's row, B sees only B's, and no context sees zero.
 */
async function main() {
  const adminUrl = process.env.DATABASE_URL;
  const appUrl = process.env.APP_DATABASE_URL;
  if (!adminUrl || !appUrl) throw new Error("DATABASE_URL/APP_DATABASE_URL not set");

  const admin = postgres(adminUrl, { max: 1 });
  const app = postgres(appUrl, { max: 1 });

  // Arrange: two tenants, one listing each (superuser bypasses RLS).
  const [a] = await admin<{ id: string }[]>`
    insert into agencies (name, slug) values ('RLS Tenant A', 'rls-test-a')
    on conflict (slug) do update set name = excluded.name returning id`;
  const [b] = await admin<{ id: string }[]>`
    insert into agencies (name, slug) values ('RLS Tenant B', 'rls-test-b')
    on conflict (slug) do update set name = excluded.name returning id`;

  await admin`delete from listings where agency_id in (${a.id}, ${b.id})`;
  await admin`
    insert into listings (agency_id, source, external_id, address)
    values (${a.id}, 'rls', 'a1', 'A-only listing'),
           (${b.id}, 'rls', 'b1', 'B-only listing')`;

  // Helper: count listings visible to the app role under a tenant context.
  async function visibleAs(agencyId: string | null) {
    return app.begin(async (tx) => {
      await tx`select set_config('app.current_agency', ${agencyId}, true)`;
      const rows = await tx<{ address: string }[]>`select address from listings`;
      return rows.map((r) => r.address);
    });
  }

  const asA = await visibleAs(a.id);
  const asB = await visibleAs(b.id);
  const asNone = await visibleAs(null);

  console.log("as tenant A :", asA);
  console.log("as tenant B :", asB);
  console.log("no context  :", asNone);

  const pass =
    asA.length === 1 &&
    asA[0] === "A-only listing" &&
    asB.length === 1 &&
    asB[0] === "B-only listing" &&
    asNone.length === 0;

  // Cleanup
  await admin`delete from listings where agency_id in (${a.id}, ${b.id})`;
  await admin`delete from agencies where id in (${a.id}, ${b.id})`;
  await admin.end();
  await app.end();

  console.log(pass ? "\nRLS PROOF: PASS ✅" : "\nRLS PROOF: FAIL ❌");
  if (!pass) process.exit(1);
}

main().catch((err) => {
  console.error("rls-check failed:", err);
  process.exit(1);
});
