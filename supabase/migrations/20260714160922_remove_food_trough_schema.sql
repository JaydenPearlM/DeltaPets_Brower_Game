begin;

create schema if not exists admin;

revoke all on schema admin from public;
revoke all on schema admin from anon;
revoke all on schema admin from authenticated;

drop view if exists admin.profiles_with_starter_pet;

alter table public.profiles
  drop column if exists food_trough_unlocked;

alter table public.user_resources
  drop column if exists trough_capacity,
  drop column if exists trough_fill;

create view admin.profiles_with_starter_pet as
with starter_egg as (
  select distinct on (e.user_id)
    e.user_id,
    e.id as egg_id,
    e.pet_id,
    e.starter_element,
    e.created_at as egg_created_at,
    e.hatched_at as egg_hatched_at
  from public.eggs e
  order by e.user_id, e.created_at asc
),
first_pet as (
  select distinct on (p.user_id)
    p.user_id,
    p.id as pet_id,
    p.name,
    p.nickname,
    p.species,
    p.line,
    p.stage,
    p.created_at,
    p.hatched_at
  from public.pets p
  order by p.user_id, p.created_at asc
)
select
  pr.user_id,
  pr.username,
  pr.display_name,
  pr.email,
  pr.is_admin,
  pr.role,
  pr.created_at,
  pr.updated_at,
  pr.alpha_ribbon_awarded,
  pr.daily_care_completed_at,
  pr.timezone,
  pr.intro_seen,
  pr.intro_cutscene_completed,
  pr.hatchery_initialized,
  se.egg_id as starter_egg_id,
  se.pet_id as starter_egg_pet_id,
  coalesce(ep.id, fp.pet_id) as starter_pet_id,
  coalesce(ep.species, fp.species) as starter_pet_species,
  coalesce(ep.nickname, ep.name, fp.nickname, fp.name) as starter_pet_name,
  coalesce(ep.line::text, fp.line::text, se.starter_element::text) as starter_pet_element,
  coalesce(ep.stage::text, fp.stage::text) as starter_pet_stage,
  se.starter_element::text as starter_egg_element,
  se.egg_hatched_at,
  coalesce(ep.hatched_at, fp.hatched_at) as starter_pet_hatched_at,
  case
    when pr.username is null and pr.display_name is null and pr.email is null then 'profile_identity_null'
    when se.user_id is null and fp.pet_id is null then 'no_egg_no_pet'
    when se.pet_id is null and fp.pet_id is null then 'egg_exists_pet_id_null'
    when se.pet_id is not null and ep.id is null then 'egg_pet_link_broken'
    when coalesce(ep.species, fp.species) is null then 'pet_exists_species_null'
    else 'ok'
  end as starter_pet_status
from public.profiles pr
left join starter_egg se
  on se.user_id = pr.user_id
left join public.pets ep
  on ep.id = se.pet_id
left join first_pet fp
  on fp.user_id = pr.user_id;

commit;