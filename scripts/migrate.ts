import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "db", "migrations");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const sql = postgres(url, { max: 1 });

  await sql`
    create table if not exists _migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const [done] = await sql`select 1 from _migrations where name = ${file}`;
    if (done) {
      console.log(`= skip ${file}`);
      continue;
    }
    const content = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    console.log(`+ apply ${file}`);
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`insert into _migrations (name) values (${file})`;
    });
  }

  console.log("migrations complete");
  await sql.end();
}

main().catch((err) => {
  console.error("migration failed:", err);
  process.exit(1);
});
