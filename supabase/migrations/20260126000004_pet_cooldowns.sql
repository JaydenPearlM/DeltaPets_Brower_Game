-- 20260126_000004_pet_cooldowns.sql
-- Adds server-authoritative cooldown timestamps for Alpha.

alter table public.pets
  add column if not exists cd_feed_ends_at timestamptz,
  add column if not exists cd_clean_ends_at timestamptz,
  add column if not exists cd_play_ends_at timestamptz;

-- Optional: index if you ever query "ready pets"
create index if not exists pets_cd_feed_ends_at_idx on public.pets (cd_feed_ends_at);
create index if not exists pets_cd_clean_ends_at_idx on public.pets (cd_clean_ends_at);
create index if not exists pets_cd_play_ends_at_idx on public.pets (cd_play_ends_at);
