# Common pitfalls building geo + AI + real-estate + multi-tenant apps — and how Domus solves them

A field guide to the problems that actually bite when you build an app in this
space, drawn from building Domus end-to-end. Each item is *problem → solution as
implemented here*.

## Serverless & build

1. **Env evaluated at build time.** A DB client that reads `DATABASE_URL` at
   module load breaks the serverless build (`ERR_INVALID_URL`).
   → `export const dynamic = "force-dynamic"` + `runtime = "nodejs"`, and init
   the client lazily *inside* the handler.

2. **Native ML runtime on serverless.** `onnxruntime-node` / Transformers.js
   `.so` files aren't traced into the function ("libonnxruntime.so.1 not found"),
   and the filesystem is read-only so the model cache can't be written.
   → `outputFileTracingIncludes` (linux/x64 binaries only), point the model
   cache at `/tmp`, enable large functions.

3. **Large binaries in the deploy.** A 121 MB OSM `.pbf` exceeds the 100 MB
   per-file limit; committing many images bloats the upload.
   → `.vercelignore` for OSRM data; keep routing data in a separate service.

4. **Framework churn.** Next `middleware`→`proxy`, ESLint 10 dropping plugin
   compatibility, pnpm moving the build-script allowlist to `pnpm-workspace.yaml`.
   → pin versions, adapt configs, keep CI green as the canary.

## Data & multi-tenancy

5. **RLS leaking tenant context through a pool.** If `set_config('app.current_agency', …)`
   isn't transaction-local, the GUC leaks across pooled connections and one
   tenant sees another's rows.
   → `withTenant()` wraps every op in a transaction with `set_config(…, true)`;
   `FORCE ROW LEVEL SECURITY`; fail-closed `nullif(current_setting(…, true), '')::uuid`.
   A `security:audit` script proves isolation on every domain table in CI.

6. **Demo vs. real data.** Deciding what a signed-out visitor can see without
   exposing real records.
   → a public **demo agency** (the catalogue) for reads, **per-user agencies**
   (created on first login) for private leads; auth degrades to demo cleanly
   when the keys are absent.

7. **Provider connection limits.** Supabase's session pooler caps at ~15
   connections; pg-boss needs session mode (not the transaction pooler).
   → small pools, run the pipeline against the session pooler, don't fan out.

## Geocoding & routing

8. **Geocoder rate limits.** Nominatim / postcodes.io throttle (HTTP 429) at
   scale.
   → a Postgres-backed cache (`postcode_cache`), batching, backoff, a real
   `User-Agent`, and known-city-centroid fallback for synthetic data.

9. **Self-hosted routing can't run on serverless.** OSRM needs a long-running
   process, an OSM extract and RAM.
   → a separate Docker service (Render) running `osrm-routed` (MLD), sized to a
   region that fits the plan; the app reaches it via `OSRM_URL`. Free tiers cold-
   start after idle — acceptable for a demo, not for SLAs.

## AI / retrieval / valuation

10. **Embedding model & dimension lock-in.** Mixing models or dims corrupts the
    vector column; an English model embeds Polish text poorly.
    → lock the model + dim behind a migration; for non-English, plan a
    multilingual model (and a dimension migration).

11. **Retrieval with no metrics = flying blind.** Is hybrid actually better than
    dense? Naive lexical fusion hurts negation queries ("not a studio").
    → RRF over dense + keyword + spatial, an evals harness (precision@k / MRR /
    MAPE) with regression thresholds wired into CI; measured honestly (it once
    showed hybrid ≈ dense on a tiny set — and we said so).

12. **Structured LLM output & intent.** Free text needs to become filters;
    negations must actually exclude.
    → `generateObject` + a Zod schema for the brief; excludes become a negative
    SQL filter. Traced in Langfuse.

13. **AVM on sparse open data.** No floor area, no sale dates → large error;
    outliers wreck MAPE.
    → inverse-distance-weighted comps, a confidence score from dispersion, and
    honest **median-APE** reporting via leave-one-out.

14. **Async work without Redis.** Idempotency, retries, transient vs permanent
    failures.
    → pg-boss (Postgres-backed), `singletonKey`, retry + backoff, permanent data
    errors marked `failed` instead of retried forever.

## Product honesty & localisation

15. **Synthetic vs. real data + licensing.** Descriptions, bedroom counts and
    photos may be estimated; CC images need attribution; EU deployments imply
    GDPR.
    → label estimates ("beds est."), keep a photo `manifest.json` with licences,
    and document the limits rather than hiding them.

16. **Localisation.** Currency (`zł` vs `£`), address formats (`ul. …`), number
    and date formatting, city names in the geocoder.
    → an `Intl`-based money helper, Polish city centroids, locale-aware
    formatting, and prompts that speak the local market.
