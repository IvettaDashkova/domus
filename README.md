# Domus

[![CI](https://github.com/IvettaDashkova/domus/actions/workflows/ci.yml/badge.svg)](https://github.com/IvettaDashkova/domus/actions/workflows/ci.yml)

Internal operations tool for a real-estate agency — lead triage, smart property
matching on a map, viewing-route planning, comps/valuation, listing enrichment,
and a **tool-calling AI assistant** (`/api/agent`) that grounds every answer in
the agency's live catalog. Built on open data only. Real-estate instantiation of
the Locus geo-AI template.

📐 **[Architecture & design →](docs/ARCHITECTURE.md)**

## What it does

- **Lead triage** — a free-text buyer enquiry → structured brief (Gemini) → grounded matches.
- **Hybrid search** — semantic (pgvector) + keyword (pg_trgm) + spatial (PostGIS), fused with Reciprocal Rank Fusion.
- **Viewing-route planner** — TSP over real OSRM driving times, with a straight-line fallback (flagged `degraded`) outside the routing region.
- **Valuation** — inverse-distance-weighted AVM from nearby comparable sales.
- **AI assistant** (`/api/agent`) — a tool-calling agent that decides which of the above to call, grounded in the tenant's catalog (no fabrication).
- **Visual search** — CLIP image-embedding lookup.

Multi-tenant by Postgres RLS (fail-closed). CI keeps `typecheck · lint · test · build`
green and audits RLS isolation on every push.

## Stack

| Concern        | Choice                                                         |
| -------------- | -------------------------------------------------------------- |
| App            | Next.js 16 (App Router) + TypeScript, pnpm                     |
| Data           | Postgres 16 + PostGIS + pgvector + pg_trgm                     |
| Dev DB         | Docker Postgres on **5434** (5433 is the Locus project)        |
| Prod DB        | Supabase (free tier)                                           |
| Queue          | pg-boss (Postgres-backed, no Redis)                            |
| Routing        | self-hosted OSRM (Docker) on **5001**                          |
| Embeddings     | Transformers.js — text `bge-small-en-v1.5` (384-d, **locked**), image `clip-vit-base-patch32` (512-d) |
| LLM            | Gemini 2.5 Flash via Vercel AI SDK v7 — structured extraction + tool-calling agent |
| Map            | MapLibre + OpenFreeMap                                         |
| Tracing        | Langfuse                                                       |
| Multi-tenancy  | Postgres Row-Level Security (agency-scoped, fail-closed)       |

## Quick start

```bash
pnpm install
cp .env.example .env.local            # dev values already match docker-compose
pnpm osrm:prepare                     # downloads + processes the Dolnośląskie (Wrocław) extract (once)
docker compose up -d                  # Postgres (5434) + OSRM (5001)
pnpm db:migrate                       # apply migrations
pnpm db:seed                          # ~300 real listings + embeddings
pnpm dev                              # http://localhost:3007
```

## Quality gates

| Gate | Command                                   |
| ---- | ----------------------------------------- |
| Unit tests           | `pnpm test` (Vitest)              |
| Build/lint/types     | `pnpm build` · `pnpm lint` · `pnpm typecheck` |
| RLS isolation audit  | `pnpm db:rls-check` · `pnpm security:audit` |
| Retrieval / AVM evals| `pnpm evals` (precision@k · recall@k · MRR · MAPE) |
| Migrations + ext.    | `pnpm db:migrate` · `\dx`         |
| Queue smoke job      | `pnpm smoke:job`                  |
| OSRM route           | `curl localhost:5001/route/v1/driving/17.0333,51.1093;17.07,51.12` |
| Health route         | `curl localhost:3007/api/health` |

`typecheck · lint · test · build` and the RLS audit run on every push via [CI](.github/workflows/ci.yml).

## Ingest pipeline

Idempotent pg-boss pipeline: `ingest → geocode → embed.text → embed.image →
enrich`, each stage retried with exponential backoff. Permanent errors (bad
postcode) mark the listing `failed`; transient errors retry.

```bash
pnpm worker                 # run the pipeline worker (registers all queues)
pnpm ingest 1000 --poison   # enqueue a run (--poison adds one ungeocodable row)
pnpm pipeline:status        # status breakdown + failures + cache
pnpm retry:proof            # prove retry/backoff (fails 3x, then succeeds)
```

## Layout

```
db/migrations   SQL migrations (extensions, tenancy, domain, RLS, indexes)
db/seed         real Polish listings (open data) + geocoding
scripts         migrate / rls-check / security-audit / seed / ingest runners
src/app         App Router pages + /api (agent, match, triage, route, valuation, …) + SEO routes
src/lib         db/RLS, embeddings, retrieval, routing, valuation, geocode, jobs, ai, agent, seo
tests           Vitest unit tests (geo, TSP, retrieval metrics, matrix, schemas)
evals           brief→listing dataset + precision@k / recall@k / MRR; AVM MAPE
docs            ARCHITECTURE.md · DEPLOY.md
osrm            OSM extract + OSRM artifacts (gitignored)
```

## Deploying

See [`docs/DEPLOY.md`](docs/DEPLOY.md). Key points: Supabase for the DB,
URL-encode special chars in the password, set Vercel env per scope, and DB-touching
routes use `dynamic = "force-dynamic"` + `runtime = "nodejs"` with lazy client init.

## Data provenance

Open data only — see [`db/seed/README.md`](db/seed/README.md).
