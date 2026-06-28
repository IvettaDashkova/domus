# Seed data — provenance

All open data. Raw files live in `db/seed/data/` (gitignored; regenerated locally).

## Sources

- **HM Land Registry — Price Paid Data** (monthly update file). Open Government
  Licence v3.0. Provides real address / postcode / price / property type /
  tenure. Downloaded by the seed on first run.
  <http://prod.publicdata.landregistry.gov.uk.s3-website-eu-west-1.amazonaws.com/pp-monthly-update-new-version.csv>
- **postcodes.io** — free postcode → lat/lng geocoding, no API key.
  <https://postcodes.io>

## What the seed does

1. Parse ~200 Land Registry rows with valid postcodes.
2. Bulk-geocode postcodes via postcodes.io (100/request).
3. Synthesize a description from the real attributes (type, tenure, location,
   price) — the prose is templated, the **embeddings are real**
   (`bge-small-en-v1.5`, 384-d, mean-pooled + L2-normalized).
4. Insert tenant-scoped listings with `geography(Point,4326)` + `text_embedding`.
5. Embed one image via CLIP (`clip-vit-base-patch32`, 512-d) to prove the
   multimodal path end-to-end.

Re-runnable: the seed clears the demo agency's listings and re-inserts.

> Note: Land Registry rows have no bedroom count or agent description — those
> arrive with the richer ingest sources in Phase 1.
