import { config } from "dotenv";
import { getAdminDb, closeDb } from "@/lib/db/client";
import { findComps } from "@/lib/valuation/comps";
import { valuate } from "@/lib/valuation/avm";

config({ path: ".env.local" });
config();

/**
 * Leave-one-out AVM accuracy. For a sample of sold listings, estimate each from
 * its neighbours (the subject is excluded from its own comps) and compare to the
 * real sold price. Reports MAPE / median APE / coverage / hit rates.
 */
async function main() {
  const sql = getAdminDb();
  const sample = await sql<
    {
      id: string;
      price: number;
      bedrooms: number | null;
      property_type: string | null;
      lng: number;
      lat: number;
    }[]
  >`
    select id, price, bedrooms, property_type,
           st_x(geom::geometry) as lng, st_y(geom::geometry) as lat
    from listings
    where status = 'enriched' and price is not null and geom is not null
    order by id limit 150`;

  const apes: number[] = [];
  let evaluated = 0;
  for (const s of sample) {
    const { comps, radiusM } = await findComps(
      sql,
      { id: s.id, lng: s.lng, lat: s.lat, propertyType: s.property_type, bedrooms: s.bedrooms },
      { minComps: 5 },
    );
    if (comps.length < 3) continue;
    const v = valuate(comps, s, radiusM, s.price);
    if (v.errorPct != null) {
      apes.push(v.errorPct);
      evaluated++;
    }
  }

  apes.sort((a, b) => a - b);
  const mean = apes.reduce((a, b) => a + b, 0) / (apes.length || 1);
  const median = apes.length ? apes[Math.floor(apes.length / 2)] : 0;
  const within = (t: number) => (apes.filter((a) => a <= t).length / (apes.length || 1)) * 100;

  console.log(`\nAVM leave-one-out accuracy · sample ${sample.length}\n`);
  console.log(`evaluated (>=3 comps): ${evaluated}  (coverage ${Math.round((evaluated / sample.length) * 100)}%)`);
  console.log(`MAPE        : ${mean.toFixed(1)}%`);
  console.log(`median APE  : ${median.toFixed(1)}%`);
  console.log(`within ±10% : ${within(10).toFixed(0)}%`);
  console.log(`within ±20% : ${within(20).toFixed(0)}%`);
  console.log(`\n(open-data sold prices, no floor area or recency — directional, not RICS.)\n`);

  await closeDb();
}

main().catch((err) => {
  console.error("avm eval failed:", err);
  process.exit(1);
});
