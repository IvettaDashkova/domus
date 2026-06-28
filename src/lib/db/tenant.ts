import type postgres from "postgres";
import { getDb } from "@/lib/db/client";

/**
 * Run a callback with the tenant (agency) RLS context set.
 *
 * Uses a transaction + `set_config(..., true)` so the GUC is transaction-LOCAL
 * and never leaks across pooled connections. RLS policies read
 * `current_setting('app.current_agency', true)`.
 */
export async function withTenant<T>(
  agencyId: string,
  fn: (sql: postgres.Sql) => Promise<T>,
): Promise<T> {
  const sql = getDb();
  return sql.begin(async (tx) => {
    await tx`select set_config('app.current_agency', ${agencyId}, true)`;
    return fn(tx as unknown as postgres.Sql);
  }) as Promise<T>;
}
