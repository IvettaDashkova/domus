-- Phase 6: vision auto-tags. image_url + image_embedding already exist (0002).

alter table listings add column if not exists tags text[];

create index if not exists listings_tags_gin on listings using gin (tags);
