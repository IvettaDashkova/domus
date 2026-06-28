-- Indexes: spatial (GiST), vector kNN (HNSW, cosine), fuzzy text (GIN trgm).

-- Spatial
create index if not exists listings_geom_gist on listings using gist (geom);

-- Vector kNN — HNSW with cosine ops (matches normalized embeddings).
create index if not exists listings_text_embedding_hnsw
  on listings using hnsw (text_embedding vector_cosine_ops);
create index if not exists listings_image_embedding_hnsw
  on listings using hnsw (image_embedding vector_cosine_ops);

-- Fuzzy / trigram text search
create index if not exists listings_address_trgm
  on listings using gin (address gin_trgm_ops);
create index if not exists listings_description_trgm
  on listings using gin (description gin_trgm_ops);

-- Tenant-scoped lookups
create index if not exists listings_agency_idx on listings(agency_id);
create index if not exists leads_agency_idx on leads(agency_id);
create index if not exists viewings_agency_idx on viewings(agency_id);
