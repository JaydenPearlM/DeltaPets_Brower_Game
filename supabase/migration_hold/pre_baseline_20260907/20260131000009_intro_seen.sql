-- Tracks whether the player has already watched the first-login intro cutscene.

alter table if exists public.profiles
  add column if not exists intro_seen boolean not null default false;
