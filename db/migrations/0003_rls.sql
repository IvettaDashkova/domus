-- Row-Level Security: tenant isolation on every domain table.
--
-- The app sets `app.current_agency` per transaction via
-- set_config('app.current_agency', <uuid>, true). Policies read it back with
-- current_setting(..., true) which returns NULL when unset -> fail-closed
-- (zero rows). FORCE makes even the table owner subject to RLS.

-- listings -------------------------------------------------------------------
alter table listings enable row level security;
alter table listings force row level security;
drop policy if exists listings_tenant_isolation on listings;
create policy listings_tenant_isolation on listings
  using (agency_id = nullif(current_setting('app.current_agency', true), '')::uuid)
  with check (agency_id = nullif(current_setting('app.current_agency', true), '')::uuid);

-- leads ----------------------------------------------------------------------
alter table leads enable row level security;
alter table leads force row level security;
drop policy if exists leads_tenant_isolation on leads;
create policy leads_tenant_isolation on leads
  using (agency_id = nullif(current_setting('app.current_agency', true), '')::uuid)
  with check (agency_id = nullif(current_setting('app.current_agency', true), '')::uuid);

-- viewings -------------------------------------------------------------------
alter table viewings enable row level security;
alter table viewings force row level security;
drop policy if exists viewings_tenant_isolation on viewings;
create policy viewings_tenant_isolation on viewings
  using (agency_id = nullif(current_setting('app.current_agency', true), '')::uuid)
  with check (agency_id = nullif(current_setting('app.current_agency', true), '')::uuid);
