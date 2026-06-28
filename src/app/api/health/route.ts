import { NextResponse } from "next/server";

// DB-touching route: never evaluate DATABASE_URL at build time.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  // Lazy import + lazy client init — nothing DB-related runs at build.
  const { getAdminDb } = await import("@/lib/db/client");
  try {
    const sql = getAdminDb();
    const [row] = await sql<{ now: Date; postgis: string | null }[]>`
      select now() as now, postgis_version() as postgis
    `;
    return NextResponse.json({
      status: "ok",
      db: "up",
      time: row.now,
      postgis: row.postgis,
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", db: "down", error: (err as Error).message },
      { status: 503 },
    );
  }
}
