-- Extensions + the non-superuser application role.
-- Run as superuser (DATABASE_URL).

create extension if not exists postgis;
create extension if not exists vector;
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists citext;

-- Application role: subject to RLS (NOT a superuser, no BYPASSRLS).
-- The app connects as this role; migrations/seed connect as superuser.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'domus_app') then
    create role domus_app login password 'domus_app';
  end if;
end
$$;

-- Grant CONNECT on whatever database we're in (domus locally, postgres on Supabase).
do $$
begin
  execute format('grant connect on database %I to domus_app', current_database());
end
$$;
grant usage on schema public to domus_app;

-- Default privileges so the app role can use future tables (RLS still applies).
alter default privileges in schema public
  grant select, insert, update, delete on tables to domus_app;
alter default privileges in schema public
  grant usage, select on sequences to domus_app;
