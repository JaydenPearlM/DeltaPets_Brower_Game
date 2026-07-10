-- 20260710000003_add_pending_hatch_minutes.sql
-- Kithna roam eggs roll a hatch duration (rollNonStarterEggQuality) the
-- moment they're found, but now sit in "inventory" until the player
-- chooses to start incubating them. This column carries that rolled
-- duration forward so the timer is only started (hatch_ends_at set) once
-- the egg actually enters a hatchery slot, not at find time.

alter table public.pets
  add column if not exists pending_hatch_minutes int;

comment on column public.pets.pending_hatch_minutes is
  'Rolled incubation length in minutes for an egg sitting in inventory or storage, not yet started. Cleared once hatch_ends_at is set.';

-- Rollback:
-- alter table public.pets drop column if exists pending_hatch_minutes;

-- Verification:
-- select id, location, stage, pending_hatch_minutes, hatch_ends_at
-- from public.pets where stage = 'egg';
