# Deploy — Phase 0 production gate

Goal: Vercel deploy succeeds and `/api/health` returns 200 in prod against a
Supabase database.

## 1. Supabase (prod DB)

1. Create a free Supabase project.
2. Enable extensions (SQL editor): `create extension if not exists postgis; vector; pg_trgm;`
   — or just run the migrations, which create them.
3. Get the connection string (Project → Database → Connection string → URI).
   Use the **session pooler** / direct connection for migrations.
4. **URL-encode special characters in the password** inside `DATABASE_URL`
   (e.g. `@` → `%40`, `#` → `%23`).

Apply schema + seed against Supabase from your machine:

```bash
DATABASE_URL="postgres://postgres:<encoded-pw>@<host>:5432/postgres" pnpm db:migrate
DATABASE_URL="postgres://postgres:<encoded-pw>@<host>:5432/postgres" pnpm db:seed   # optional in prod
```

> Phase 0 prod uses the Supabase `postgres` superuser, which bypasses RLS — fine
> for the health gate. A dedicated `domus_app` role for prod RLS comes with auth
> in a later phase.

## 2. Vercel

Install + link:

```bash
npm i -g vercel
vercel link
```

Set env vars **per scope** (Production / Preview / Development):

```bash
vercel env add DATABASE_URL production      # the Supabase URI (encoded password)
# repeat for preview/development as needed
```

Deploy:

```bash
vercel deploy --prod
```

## 3. Verify

```bash
curl -s https://<your-app>.vercel.app/api/health
# → {"status":"ok","db":"up","postgis":"3.x ...", ...}
```

## Build-safety invariants (already in the code)

- DB-touching routes set `export const dynamic = "force-dynamic"` and
  `export const runtime = "nodejs"`.
- The DB client is created lazily **inside** the handler — `DATABASE_URL` is
  never evaluated at build time (avoids `ERR_INVALID_URL` on Vercel).
- Heavy native deps (`@huggingface/transformers`, `onnxruntime-node`, `sharp`,
  `pg-boss`, `postgres`) are in `serverExternalPackages` so they are not bundled.

> The pg-boss **worker** (`pnpm worker`) is a long-running process — it does not
> run on Vercel's request model. In prod it runs as a separate worker (Phase 1).
