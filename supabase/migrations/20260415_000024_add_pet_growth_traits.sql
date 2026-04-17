-- Store hatch-time growth traits so the pets page can match the egg preview exactly.
alter table public.pets
  add column if not exists growth_strong_stats text[] not null default '{}'::text[],
  add column if not exists growth_weak_stat text null;

comment on column public.pets.growth_strong_stats is 'Stat strengths rolled from the egg preview and locked in at hatch.';
comment on column public.pets.growth_weak_stat is 'Stat weakness rolled from the egg preview and locked in at hatch.';