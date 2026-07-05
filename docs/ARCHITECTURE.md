# Domus — Architecture

Domus is an internal operations tool for a real-estate agency: free-text lead
triage, hybrid property matching on a map, viewing-route planning, and
comps-based valuation. It runs on open data only and is the real-estate
instantiation of the Locus geo-AI template.

The design goal is **grounded AI over private, tenant-isolated data**: every
LLM answer is backed by a retrieval or tool call against the agency's own
catalog — never free-form generation.

## System overview

```
                         ┌──────────────────────────────────────────────┐
   Browser (MapLibre) ── │  Next.js 16 App Router  (force-dynamic, Node) │
                         │                                               │
                         │  /api/agent      tool-calling assistant       │
                         │  /api/leads/*    triage → structured brief    │
                         │  /api/match      hybrid search                │
                         │  /api/route/plan viewing-route optimizer      │
                         │  /api/valuation  comps AVM                    │
                         │  /api/visual-search  CLIP image search        │
                         └───────┬───────────────────────┬──────────────┘
                                 │                        │
              ┌──────────────────┴───────┐      ┌─────────┴───────────┐
              │  AI layer                │      │  Retrieval / geo    │
              │  • Gemini 2.5 Flash      │      │  • hybrid RRF        │
              │    (Vercel AI SDK v7)    │      │  • pgvector kNN      │
              │  • generateObject        │      │  • pg_trgm lexical   │
              │    (brief extraction)    │      │  • PostGIS spatial   │
              │  • generateText + tools  │      │  • OSRM routing+TSP  │
              │    (agent)               │      │  • Transformers.js   │
              │  • Langfuse tracing      │      │    embeddings (local)│
              └──────────────┬───────────┘      └─────────┬───────────┘
                             │                            │
                    ┌────────┴────────────────────────────┴────────┐
                    │  Postgres 16  (RLS, fail-closed per agency)   │
                    │  PostGIS · pgvector · pg_trgm · pg-boss queue │
                    └───────────────────────┬──────────────────────┘
                                            │
                    ┌───────────────────────┴──────────────────────┐
                    │  Ingest pipeline (pg-boss, idempotent)        │
                    │  ingest → geocode → embed.text → embed.image  │
                    │        → enrich   (retried w/ backoff)        │
                    └──────────────────────────────────────────────┘
```

## Data & tenancy

- **Postgres 16** with `postgis`, `vector` (pgvector), `pg_trgm`.
- **Row-Level Security, fail-closed.** Every query runs through
  `withTenant(agencyId, sql => …)` (`src/lib/db/tenant.ts`), which sets the
  agency GUC the RLS policies key off. Listings are a shared demo catalog;
  leads are private per signed-in user. RLS isolation is asserted in CI
  (`pnpm security:audit`).
- **Listings** carry `geom` (PostGIS point), `text_embedding` (384-d,
  `bge-small-en-v1.5`), `image_embedding` (512-d, `clip-vit-base-patch32`),
  price, bedrooms, property_type, status, tags.

## Retrieval — hybrid RRF

`src/lib/retrieval/hybrid.ts` fuses three independent ranked signals with
Reciprocal Rank Fusion (`score = Σ 1 / (k + rankᵢ)`, k = 60), all in one SQL
statement against the tenant-scoped connection:

| Signal | Mechanism |
| ------ | --------- |
| Dense (semantic) | pgvector cosine kNN on `text_embedding` |
| Lexical (keyword) | `pg_trgm` similarity on `description` |
| Spatial | PostGIS distance from a query point |

Hard filters (price / beds / type / radius / excludes) constrain the candidate
set **before** fusion. Retrieval quality is measured offline in `evals/`
(precision@k, recall@k, MRR); AVM accuracy via leave-one-out MAPE.

## AI layer

Two distinct patterns, both on Gemini 2.5 Flash via the Vercel AI SDK v7:

1. **Structured extraction** (`src/lib/leads/extract.ts`) — `generateObject`
   with a Zod schema turns a free-text enquiry into a typed search brief. The
   brief then drives a *deterministic* `hybridMatch`; the LLM never selects
   listings itself.
2. **Tool-calling agent** (`src/lib/agent/`) — `generateText` with a bound
   tool set (`search_listings`, `value_property`, `plan_viewing_route`,
   `geocode_place`). The model plans which tools to call; each tool executes
   real retrieval/geo/valuation code against the tenant. This keeps answers
   grounded: the agent can only surface what the tools return.

Prompt-injection posture: extraction is schema-bound (a jailbreak can only
produce a valid brief, never leak the system prompt or secrets); SQL is fully
parameterized via `postgres.js` tagged templates; agent tools return typed data
only. Verified by adversarial testing.

## Routing

`src/lib/routing/` plans an optimized viewing route: a travel-time matrix from
self-hosted **OSRM**, solved as a TSP (exact Held-Karp for N ≤ 12,
nearest-neighbour + 2-opt above). When a point falls outside the loaded OSRM
region (or OSRM is down), legs fall back to a haversine estimate and the plan is
flagged `degraded: true` so the UI can show rough ETAs honestly. The default
extract is Dolnośląskie (Wrocław); set `REGION_URL` to widen it.

## Ingest pipeline

A pg-boss (Postgres-backed, no Redis) pipeline stages each listing through
`ingest → geocode → embed.text → embed.image → enrich`, each step retried with
exponential backoff. Permanent errors (e.g. an ungeocodable address) mark the
listing `failed`; transient errors retry. The pipeline is idempotent, so a
re-run never duplicates work.

## Observability & quality gates

- **Langfuse** traces LLM generations (input/output/usage), no-op without keys.
- **CI** (`.github/workflows/ci.yml`): typecheck · lint · **test (Vitest)** ·
  build, plus a DB job that applies migrations and runs the RLS security audit.
- **Health** (`/api/health`) reports DB + PostGIS status; returns 503 when the
  DB is unreachable. OSRM is a soft dependency (degraded fallback), not a gate.

## Request flow — lead triage (example)

```
enquiry text
  → /api/leads/triage
  → extractBrief()            Gemini → { propertyType, budget, beds, location, … }
  → geocodePlace(location)    Nominatim, countrycodes=pl
  → embedText(semanticBrief)  local 384-d vector
  → withTenant(agency, hybridMatch(...))   RRF over dense+lexical+spatial
  → { brief, location, results[] }   (lead persisted only for signed-in users)
```
