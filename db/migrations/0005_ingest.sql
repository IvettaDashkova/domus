-- Phase 1: ingest pipeline state, postcode cache, ingest runs.

-- Per-listing processing state machine.
-- status: ingested -> geocoded -> embedded -> enriched ; or 'failed'.
alter table listings add column if not exists status text not null default 'ingested';
alter table listings add column if not exists image_url text;
alter table listings add column if not exists failure_reason text;
alter table listings add column if not exists geocoded_at timestamptz;
alter table listings add column if not exists embedded_at timestamptz;
alter table listings add column if not exists enriched_at timestamptz;
alter table listings add column if not exists ingest_run_id uuid;

create index if not exists listings_status_idx on listings(agency_id, status);

-- Reconcile Phase 0 rows: anything already embedded is effectively enriched.
update listings
   set status = 'enriched',
       geocoded_at = coalesce(geocoded_at, created_at),
       embedded_at = coalesce(embedded_at, created_at),
       enriched_at = coalesce(enriched_at, created_at)
 where text_embedding is not null and status = 'ingested';

-- Postcode geocoding cache (shared across listings + runs; idempotent).
create table if not exists postcode_cache (
  postcode   text primary key,
  lat        double precision,
  lng        double precision,
  found      boolean not null,
  fetched_at timestamptz not null default now()
);

-- One ingest run = one batch enqueued from a source.
create table if not exists ingest_runs (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references agencies(id) on delete cascade,
  source      text not null,
  requested   int not null default 0,
  created_at  timestamptz not null default now(),
  finished_at timestamptz
);

grant select, insert, update, delete on postcode_cache, ingest_runs to domus_app;
