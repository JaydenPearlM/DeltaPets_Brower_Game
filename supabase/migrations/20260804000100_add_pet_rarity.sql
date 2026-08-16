-- Adds species rarity to eggs and hatched pets.
-- Starter species remain Epic regardless of their shortened onboarding timer.

alter table public.pets
  add column if not exists rarity text;

alter table public.pets
  drop constraint if exists pets_rarity_check;

alter table public.pets
  add constraint pets_rarity_check
  check (
    rarity is null
    or rarity in ('common', 'uncommon', 'rare', 'epic')
  );

update public.pets
set rarity = 'epic'
where species in (
  'water_starter',
  'fire_starter',
  'earth_starter',
  'air_starter',
  'ice_starter',
  'storm_starter',
  'light_starter',
  'shadow_night_bad',
  'shadow_day_good'
)
and rarity is distinct from 'epic';

comment on column public.pets.rarity is
  'Species rarity: common, uncommon, rare, or epic. Starter species are always epic.';