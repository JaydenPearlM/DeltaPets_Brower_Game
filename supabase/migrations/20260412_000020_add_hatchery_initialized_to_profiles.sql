-- supabase/migrations/20260412_000020_add_hatchery_initialized_to_profiles.sql
-- Adds hatchery_initialized boolean to profiles.
-- When true, fetchHatcherySlots / fetchHatcheryShelfSlots skip the ensure
-- SELECT on every page load and go straight to the data query.
-- Defaults false so all existing users go through ensure exactly once more,
-- after which it flips to true and stays there.

begin;

alter table public.profiles
  add column if not exists hatchery_initialized boolean not null default false;

commit;
