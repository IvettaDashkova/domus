import postgres from "postgres";
import { appDatabaseUrl, databaseUrl } from "@/lib/env";

/**
 * Lazy postgres.js singletons. The client is created on first use INSIDE a
 * handler/script — never at import time — so the build never evaluates a URL.
 */

let appSql: postgres.Sql | null = null;
let adminSql: postgres.Sql | null = null;

/** App-role connection (subject to RLS). Use for all tenant-scoped queries. */
export function getDb(): postgres.Sql {
  if (!appSql) {
    appSql = postgres(appDatabaseUrl(), {
      max: 5,
      prepare: false, // pgbouncer/supabase-friendly
    });
  }
  return appSql;
}

/** Superuser connection (migrations, seeding). Bypasses RLS as table owner. */
export function getAdminDb(): postgres.Sql {
  if (!adminSql) {
    adminSql = postgres(databaseUrl(), { max: 5 });
  }
  return adminSql;
}

export async function closeDb(): Promise<void> {
  await Promise.all([
    appSql?.end({ timeout: 5 }),
    adminSql?.end({ timeout: 5 }),
  ]);
  appSql = null;
  adminSql = null;
}
