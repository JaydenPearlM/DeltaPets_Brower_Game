begin;

-- =========================================================
-- 1) pets compatibility columns expected by app code
-- =========================================================

alter table if exists public.pets
  add column if not exists is_active boolean not null default false;

alter table if exists public.pets
  add column if not exists nickname text;

alter table if exists public.pets
  add column if not exists last_hunger_decay_at timestamptz;

create index if not exists pets_user_is_active_idx
  on public.pets (user_id, is_active);

-- Ensure at most one active pet per user
create unique index if not exists pets_one_active_per_user_idx
  on public.pets (user_id)
  where is_active = true;

-- Backfill active pet for existing non-egg pets if none is active yet
with latest_non_egg as (
  select distinct on (user_id)
    id,
    user_id
  from public.pets
  where stage <> 'egg'
  order by user_id, coalesce(hatched_at, created_at) desc, created_at desc
)
update public.pets p
set is_active = true
from latest_non_egg l
where p.id = l.id
  and not exists (
    select 1
    from public.pets p2
    where p2.user_id = l.user_id
      and p2.is_active = true
  );

-- Eggs should not be active
update public.pets
set is_active = false
where stage = 'egg' and is_active = true;

-- =========================================================
-- 2) pet_stat_allocations compatibility column expected by rewards route
-- =========================================================

alter table if exists public.pet_stat_allocations
  add column if not exists xp int not null default 0;

-- =========================================================
-- 3) Helpful compatibility view for old frontend pet_stats shape
--    This does NOT replace the table; it just gives you an easy
--    path if you later decide to query totals instead.
-- =========================================================

create or replace view public.v_pet_storage_stats as
select
  s.pet_id,
  s.base_hp as hp,
  s.base_atk as atk,
  s.base_magi as magi,
  s.base_def as def,
  s.base_spd as spd,
  s.base_mana as mana,
  s.base_total
from public.pet_stats s;

commit;