# Domus

[![CI](https://github.com/IvettaDashkova/domus/actions/workflows/ci.yml/badge.svg)](https://github.com/IvettaDashkova/domus/actions/workflows/ci.yml)

Internal operations tool for a real-estate agency — lead triage, smart property
matching on a map, viewing-route planning, comps/valuation, listing enrichment.
Built on open data only. Real-estate instantiation of the Locus geo-AI template.

> **Phase 0** establishes a production-shaped skeleton with every verification
> gate green. Feature logic lands in later phases.

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
| LLM            | Gemini free tier via Vercel AI SDK (wired; used from Phase 3)  |
| Map            | MapLibre + OpenFreeMap (Deck.gl layers later)                 |
| Tracing        | Langfuse                                                       |
| Multi-tenancy  | Postgres Row-Level Security (agency-scoped, fail-closed)       |

## Quick start

```bash
pnpm install
cp .env.example .env.local            # dev values already match docker-compose
pnpm osrm:prepare                     # downloads + processes a small OSM extract (once)
docker compose up -d                  # Postgres (5434) + OSRM (5001)
pnpm db:migrate                       # apply migrations
pnpm db:seed                          # ~200 real listings + embeddings
pnpm dev                              # http://localhost:3000
```

## Verification gates (Phase 0)

| Gate | Command                                   |
| ---- | ----------------------------------------- |
| Infra healthy        | `docker compose ps`               |
| Migrations + ext.    | `pnpm db:migrate` · `\dx`         |
| RLS isolation        | `pnpm db:rls-check`               |
| Seed + embeddings    | `pnpm db:seed`                    |
| Queue smoke job      | `pnpm smoke:job`                  |
| OSRM route           | `curl localhost:5001/route/v1/driving/-1.2917,50.7000;-1.16,50.729` |
| Evals harness        | `pnpm evals`                      |
| Build/lint/types     | `pnpm build` · `pnpm lint` · `pnpm typecheck` |
| Health route         | `curl localhost:3000/api/health` |

## Ingest pipeline (Phase 1)

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
db/seed         real-data seed (Land Registry + postcodes.io geocoding)
scripts         migrate / rls-check / smoke-job runners
src/app         App Router pages + /api/health
src/lib         db client + tenant RLS helper, embeddings, retrieval, jobs, ai, tracing
evals           brief→listing dataset + precision@k / recall@k / MRR
osrm            OSM extract + OSRM artifacts (gitignored)
```

## Deploying (Phase 0 prod gate)

See [`docs/DEPLOY.md`](docs/DEPLOY.md). Key points: Supabase for the DB,
URL-encode special chars in the password, set Vercel env per scope, and DB-touching
routes use `dynamic = "force-dynamic"` + `runtime = "nodejs"` with lazy client init.

## Data provenance

Open data only — see [`db/seed/README.md`](db/seed/README.md).
