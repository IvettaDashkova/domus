-- Multi-tenancy core: agencies, users, memberships, roles.

create table if not exists agencies (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id         uuid primary key default gen_random_uuid(),
  email      citext not null unique,
  name       text,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'membership_role') then
    create type membership_role as enum ('owner', 'admin', 'agent', 'viewer');
  end if;
end
$$;

create table if not exists memberships (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  agency_id  uuid not null references agencies(id) on delete cascade,
  role       membership_role not null default 'agent',
  created_at timestamptz not null default now(),
  unique (user_id, agency_id)
);

create index if not exists memberships_agency_idx on memberships(agency_id);
create index if not exists memberships_user_idx on memberships(user_id);

-- App role needs to read tenancy tables (no RLS on these in Phase 0).
grant select, insert, update, delete on agencies, users, memberships to domus_app;
