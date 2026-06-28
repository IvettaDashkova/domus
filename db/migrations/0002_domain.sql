-- Domain tables. Every row is tenant-scoped via agency_id (RLS in 0003).

create table if not exists listings (
  id              uuid primary key default gen_random_uuid(),
  agency_id       uuid not null references agencies(id) on delete cascade,
  source          text,
  external_id     text,
  address         text,
  postcode        text,
  geom            geography(Point, 4326),
  price           numeric,
  bedrooms        int,
  property_type   text,
  description     text,
  text_embedding  vector(384),   -- bge-small-en-v1.5 (LOCKED)
  image_embedding vector(512),   -- clip-vit-base-patch32
  created_at      timestamptz not null default now(),
  unique (agency_id, source, external_id)
);

create table if not exists leads (
  id           uuid primary key default gen_random_uuid(),
  agency_id    uuid not null references agencies(id) on delete cascade,
  raw_text     text,
  contact      text,
  status       text not null default 'new',
  requirements jsonb,            -- structured by the triage LLM in Phase 3
  created_at   timestamptz not null default now()
);

create table if not exists viewings (
  id           uuid primary key default gen_random_uuid(),
  agency_id    uuid not null references agencies(id) on delete cascade,
  lead_id      uuid references leads(id) on delete set null,
  listing_id   uuid references listings(id) on delete set null,
  scheduled_at timestamptz,
  status       text not null default 'planned',
  created_at   timestamptz not null default now()
);

grant select, insert, update, delete on listings, leads, viewings to domus_app;
