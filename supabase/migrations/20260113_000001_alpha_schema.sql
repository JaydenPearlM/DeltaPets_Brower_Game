/* ============================================================================
   DeltaPets — Alpha Schema (Levels 0–10)
   Postgres / Supabase-ready, single-file, organized + idempotent-ish.

   Notes:
   - I fixed a BIG issue in your paste: you had DO $$ blocks *inside* CREATE TABLE pets.
     That’s invalid SQL. All types/enums are defined up top now.
   - Enums are normalized to lowercase (earth/shadow/etc) to avoid future pain.
   - RLS policies are included and grouped.
   - Your later “Adding:” / “Alter approach” / view are included at the end as a
     migration-friendly section.

   Run this in Supabase SQL Editor (in one go).
============================================================================ */

/* =========================
   0) Extensions
========================= */
create extension if not exists pgcrypto;

/* =========================
   1) Enums / Types
========================= */

do $$ begin
  create type public.elemental_line as enum (
    'water','fire','earth','air','ice','storm','light','shadow'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.pet_stage as enum ('egg','sprout');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.item_type as enum ('care','battle_food','material','equipment','currency_pack');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.fight_kind as enum ('normal','boss');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.currency_kind as enum ('dots','crystals');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.age_stage as enum ('baby','teen','adult','late_adult','legion');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.personality_trait as enum (
    'friendly','honest','deceiver','loyal','cowardly','brave','vengeful','impulsive',
    'reasonable','lazy','diligent','naive','cruel','optimistic','pessimistic',
    'arrogant','humble','snob','respectful','greedy','generous','kind'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.element_kind as enum (
    'null','water','fire','earth','air','ice','storm','light','shadow'
  );
exception when duplicate_object then null;
end $$;

/* =========================
   2) Helpers
========================= */

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

/* =========================
   3) Core Tables
========================= */

-- 3.1 Profiles (tied to auth.users)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- 3.2 Pets (one active pet per user for Alpha)
create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  name text,
  line public.elemental_line not null,
  stage public.pet_stage not null default 'egg',

  -- progression
  level int not null default 1 check (level between 1 and 10),
  xp int not null default 0,

  -- timers/state
  hatched_at timestamptz,
  hatch_ends_at timestamptz, -- egg sits 20 minutes, then hatchable

  -- care meters (0-100)
  hunger int not null default 50 check (hunger between 0 and 100),
  cleanliness int not null default 50 check (cleanliness between 0 and 100),
  happiness int not null default 50 check (happiness between 0 and 100),
  energy int not null default 100 check (energy between 0 and 100),

  -- quick combat stats (simple for Alpha; totals computed later via views if desired)
  atk int not null default 5,
  def int not null default 5,
  spd int not null default 5,
  hp_max int not null default 30,
  hp_cur int not null default 30,

  -- added later (kept here to avoid split migrations)
  age public.age_stage not null default 'baby',
  personality public.personality_trait not null default 'friendly',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists pets_one_per_user_alpha
on public.pets(user_id);

drop trigger if exists trg_pets_updated_at on public.pets;
create trigger trg_pets_updated_at
before update on public.pets
for each row execute function public.set_updated_at();

-- 3.3 Item catalog
create table if not exists public.item_defs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,              -- e.g. "basic_kibble"
  name text not null,
  type public.item_type not null,
  description text,
  rarity int not null default 1 check (rarity between 1 and 5),
  stack_limit int not null default 999,
  effects jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_item_defs_updated_at on public.item_defs;
create trigger trg_item_defs_updated_at
before update on public.item_defs
for each row execute function public.set_updated_at();

-- 3.4 Inventory
create table if not exists public.inventory (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.item_defs(id) on delete restrict,
  qty int not null default 0 check (qty >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- 3.5 Wallets + ledger (prevents currency bugs)
create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dots int not null default 0 check (dots >= 0),
  gems int not null default 0 check (gems >= 0),
  crystals int not null default 0 check (crystals >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  currency public.currency_kind not null,
  delta int not null,              -- can be + or -
  reason text not null,            -- "battle_reward", "shop_purchase", "admin_grant"
  ref_id uuid,                     -- optional pointer to battle_run, etc.
  created_at timestamptz not null default now()
);

-- 3.6 Battle runs (5 fights + 1 boss)
create table if not exists public.battle_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,

  status text not null default 'active' check (status in ('active','won','lost')),
  current_fight int not null default 1 check (current_fight between 1 and 6),

  started_at timestamptz not null default now(),
  ended_at timestamptz,

  created_at timestamptz not null default now()
);

create table if not exists public.battle_run_fights (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.battle_runs(id) on delete cascade,
  fight_number int not null check (fight_number between 1 and 6),
  kind public.fight_kind not null default 'normal',

  enemy_level int not null default 1,
  enemy_line public.elemental_line,
  result text not null check (result in ('pending','won','lost')),
  reward jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  unique (run_id, fight_number)
);

/* =========================
   4) Config + Pet Deep Stats
========================= */

-- 4.1 Game config
create table if not exists public.game_config (
  key text primary key,
  value jsonb not null
);

-- Default stat rules (seed once)
insert into public.game_config(key, value)
values
  ('stat_rules', jsonb_build_object(
    'base_total', 30,
    'points_per_level', 27,
    'min_per_stat', 1,
    'max_per_stat', 999
  ))
on conflict (key) do nothing;

-- 4.2 Birth stats (pet_stats) — later we’ll rename these to base_* via migration section
create table if not exists public.pet_stats (
  pet_id uuid primary key references public.pets(id) on delete cascade,

  hp int not null default 5,
  atk int not null default 5,
  magic int not null default 5,
  def int not null default 5,
  spd int not null default 5,
  mana int not null default 5,

  base_total int not null default 30,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (hp >= 0 and atk >= 0 and magic >= 0 and def >= 0 and spd >= 0 and mana >= 0)
);

drop trigger if exists trg_pet_stats_updated_at on public.pet_stats;
create trigger trg_pet_stats_updated_at
before update on public.pet_stats
for each row execute function public.set_updated_at();

-- 4.3 Level-up allocations (player picks 1 point per level)
create table if not exists public.pet_stat_allocations (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  level int not null check (level between 1 and 10),

  hp int not null default 0,
  atk int not null default 0,
  magic int not null default 0,
  def int not null default 0,
  spd int not null default 0,
  mana int not null default 0,

  created_at timestamptz not null default now(),

  check (hp >= 0 and atk >= 0 and magic >= 0 and def >= 0 and spd >= 0 and mana >= 0),
  unique (pet_id, level)
);

-- 4.4 Element affinity buckets (for later unlock requirements)
create table if not exists public.pet_elements (
  pet_id uuid primary key references public.pets(id) on delete cascade,

  null int not null default 0,
  water int not null default 0,
  fire int not null default 0,
  earth int not null default 0,
  air int not null default 0,
  ice int not null default 0,
  storm int not null default 0,
  light int not null default 0,
  shadow int not null default 0,

  check (
    null >= 0 and water >= 0 and fire >= 0 and earth >= 0 and air >= 0 and
    ice >= 0 and storm >= 0 and light >= 0 and shadow >= 0
  )
);

-- 4.5 Skills
create table if not exists public.skill_defs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  required_level int not null default 1,
  requirements jsonb not null default '{}'::jsonb, -- e.g. {"elements":{"fire":20,"storm":20}}
  created_at timestamptz not null default now()
);

create table if not exists public.pet_skills (
  pet_id uuid not null references public.pets(id) on delete cascade,
  skill_id uuid not null references public.skill_defs(id) on delete restrict,
  equipped boolean not null default false,
  unlocked_at timestamptz not null default now(),
  primary key (pet_id, skill_id)
);

/* =========================
   5) Row Level Security (RLS)
========================= */

alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.item_defs enable row level security;
alter table public.inventory enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.battle_runs enable row level security;
alter table public.battle_run_fights enable row level security;

alter table public.game_config enable row level security;
alter table public.pet_stats enable row level security;
alter table public.pet_stat_allocations enable row level security;
alter table public.pet_elements enable row level security;
alter table public.skill_defs enable row level security;
alter table public.pet_skills enable row level security;

-- -------------------------
-- profiles
-- -------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- -------------------------
-- pets
-- -------------------------
drop policy if exists "pets_crud_own" on public.pets;
create policy "pets_crud_own"
on public.pets
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- -------------------------
-- item_defs (readable by all authed)
-- -------------------------
drop policy if exists "item_defs_read_all" on public.item_defs;
create policy "item_defs_read_all"
on public.item_defs for select
using (auth.role() = 'authenticated');

-- -------------------------
-- inventory
-- -------------------------
drop policy if exists "inventory_crud_own" on public.inventory;
create policy "inventory_crud_own"
on public.inventory
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- -------------------------
-- wallets
-- -------------------------
drop policy if exists "wallets_crud_own" on public.wallets;
create policy "wallets_crud_own"
on public.wallets
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- -------------------------
-- wallet_ledger (select own only)
-- -------------------------
drop policy if exists "ledger_select_own" on public.wallet_ledger;
create policy "ledger_select_own"
on public.wallet_ledger for select
using (auth.uid() = user_id);

-- -------------------------
-- battle_runs
-- -------------------------
drop policy if exists "battle_runs_crud_own" on public.battle_runs;
create policy "battle_runs_crud_own"
on public.battle_runs
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- -------------------------
-- battle_run_fights (select own via run ownership)
-- -------------------------
drop policy if exists "battle_fights_select_own" on public.battle_run_fights;
create policy "battle_fights_select_own"
on public.battle_run_fights for select
using (
  exists (
    select 1 from public.battle_runs r
    where r.id = run_id and r.user_id = auth.uid()
  )
);

-- Optional: allow inserting fights client-side (fine for Alpha)
drop policy if exists "battle_fights_insert_own" on public.battle_run_fights;
create policy "battle_fights_insert_own"
on public.battle_run_fights for insert
with check (
  exists (
    select 1 from public.battle_runs r
    where r.id = run_id and r.user_id = auth.uid()
  )
);

-- -------------------------
-- game_config (readable by authenticated)
-- -------------------------
drop policy if exists "game_config_read" on public.game_config;
create policy "game_config_read"
on public.game_config for select
using (auth.role() = 'authenticated');

-- -------------------------
-- pet_stats owned via pet
-- -------------------------
drop policy if exists "pet_stats_own" on public.pet_stats;
create policy "pet_stats_own"
on public.pet_stats for all
using (
  exists (select 1 from public.pets p where p.id = pet_id and p.user_id = auth.uid())
)
with check (
  exists (select 1 from public.pets p where p.id = pet_id and p.user_id = auth.uid())
);

-- -------------------------
-- pet_stat_allocations owned via pet
-- -------------------------
drop policy if exists "pet_alloc_own" on public.pet_stat_allocations;
create policy "pet_alloc_own"
on public.pet_stat_allocations for all
using (
  exists (select 1 from public.pets p where p.id = pet_id and p.user_id = auth.uid())
)
with check (
  exists (select 1 from public.pets p where p.id = pet_id and p.user_id = auth.uid())
);

-- -------------------------
-- pet_elements owned via pet
-- -------------------------
drop policy if exists "pet_elements_own" on public.pet_elements;
create policy "pet_elements_own"
on public.pet_elements for all
using (
  exists (select 1 from public.pets p where p.id = pet_id and p.user_id = auth.uid())
)
with check (
  exists (select 1 from public.pets p where p.id = pet_id and p.user_id = auth.uid())
);

-- -------------------------
-- skill_defs readable by authenticated
-- -------------------------
drop policy if exists "skills_read_all" on public.skill_defs;
create policy "skills_read_all"
on public.skill_defs for select
using (auth.role() = 'authenticated');

-- -------------------------
-- pet_skills owned via pet
-- -------------------------
drop policy if exists "pet_skills_own" on public.pet_skills;
create policy "pet_skills_own"
on public.pet_skills for all
using (
  exists (select 1 from public.pets p where p.id = pet_id and p.user_id = auth.uid())
)
with check (
  exists (select 1 from public.pets p where p.id = pet_id and p.user_id = auth.uid())
);

/* ============================================================================
   6) Alpha Stat Rule Update + Birth-Stats Migration
   (This is your “Adding:” section, organized and made safer.)
============================================================================ */

-- 6.1 Update stat_rules to your new intended rules
update public.game_config
set value = jsonb_build_object(
  'base_total', 25,
  'birth_stat_cap', 10,
  'points_per_level', 1,
  'max_level', 10
)
where key = 'stat_rules';

-- 6.2 Convert pet_stats columns to explicit birth stats: base_*
--     (Renames will error if the old column already renamed, so we guard them.)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='pet_stats' and column_name='hp'
  ) then
    alter table public.pet_stats rename column hp to base_hp;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='pet_stats' and column_name='atk'
  ) then
    alter table public.pet_stats rename column atk to base_atk;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='pet_stats' and column_name='magic'
  ) then
    alter table public.pet_stats rename column magic to base_magic;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='pet_stats' and column_name='def'
  ) then
    alter table public.pet_stats rename column def to base_def;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='pet_stats' and column_name='spd'
  ) then
    alter table public.pet_stats rename column spd to base_spd;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='pet_stats' and column_name='mana'
  ) then
    alter table public.pet_stats rename column mana to base_mana;
  end if;
end $$;

-- Ensure correct default for base_total
alter table public.pet_stats
  alter column base_total set default 25;

-- Birth stat caps (0..10) + must sum to base_total
alter table public.pet_stats
  drop constraint if exists pet_stats_birth_caps;
alter table public.pet_stats
  add constraint pet_stats_birth_caps check (
    base_hp between 0 and 10 and
    base_atk between 0 and 10 and
    base_magic between 0 and 10 and
    base_def between 0 and 10 and
    base_spd between 0 and 10 and
    base_mana between 0 and 10
  );

alter table public.pet_stats
  drop constraint if exists pet_stats_birth_sum;
alter table public.pet_stats
  add constraint pet_stats_birth_sum check (
    base_hp + base_atk + base_magic + base_def + base_spd + base_mana = base_total
  );

-- 6.3 Enforce “1 point per level” allocation rule
alter table public.pet_stat_allocations
  drop constraint if exists pet_alloc_one_point_per_level;

alter table public.pet_stat_allocations
  add constraint pet_alloc_one_point_per_level check (
    (hp + atk + magic + def + spd + mana) = 1
  );

-- 6.4 View: total stats = birth + allocations
create or replace view public.v_pet_total_stats as
select
  s.pet_id,
  (s.base_hp    + coalesce(sum(a.hp),    0)) as hp,
  (s.base_atk   + coalesce(sum(a.atk),   0)) as atk,
  (s.base_magic + coalesce(sum(a.magic), 0)) as magic,
  (s.base_def   + coalesce(sum(a.def),   0)) as def,
  (s.base_spd   + coalesce(sum(a.spd),   0)) as spd,
  (s.base_mana  + coalesce(sum(a.mana),  0)) as mana,
  s.base_total,
  coalesce(count(a.*), 0) as allocated_levels
from public.pet_stats s
left join public.pet_stat_allocations a
  on a.pet_id = s.pet_id
group by
  s.pet_id,
  s.base_hp, s.base_atk, s.base_magic, s.base_def, s.base_spd, s.base_mana,
  s.base_total;

/* ============================================================================
   Done.
============================================================================ */


-- /* ============================================================================
--    DeltaPets Alpha — Minimal Ownership RLS (based on your schema)
--    - Correct > perfect
--    - Two-policy vibe: SELECT own + WRITE own
--    - Uses your actual columns: user_id, pet_id, run_id
-- ============================================================================ */

-- -- 0) Enable RLS (idempotent)
-- alter table public.profiles enable row level security;
-- alter table public.pets enable row level security;
-- alter table public.inventory enable row level security;
-- alter table public.wallets enable row level security;
-- alter table public.wallet_ledger enable row level security;
-- alter table public.battle_runs enable row level security;
-- alter table public.battle_run_fights enable row level security;
-- alter table public.pet_stats enable row level security;
-- alter table public.pet_stat_allocations enable row level security;
-- alter table public.pet_elements enable row level security;
-- alter table public.pet_skills enable row level security;

-- -- Global read tables
-- alter table public.item_defs enable row level security;
-- alter table public.skill_defs enable row level security;
-- alter table public.game_config enable row level security;

-- -- 1) Nuke existing policies (avoid duplicates / contradictions)
-- do $$
-- declare r record;
-- begin
--   for r in
--     select schemaname, tablename, policyname
--     from pg_policies
--     where schemaname = 'public'
--       and tablename in (
--         'profiles','pets','inventory','wallets','wallet_ledger',
--         'battle_runs','battle_run_fights',
--         'pet_stats','pet_stat_allocations','pet_elements','pet_skills',
--         'item_defs','skill_defs','game_config'
--       )
--   loop
--     execute format('drop policy if exists %I on %I.%I;', r.policyname, r.schemaname, r.tablename);
--   end loop;
-- end $$;

-- -- 2) PROFILES (owned by user_id)
-- create policy "profiles_select_own"
-- on public.profiles
-- for select
-- to authenticated
-- using (auth.uid() = user_id);

-- create policy "profiles_write_own"
-- on public.profiles
-- for all
-- to authenticated
-- using (auth.uid() = user_id)
-- with check (auth.uid() = user_id);

-- -- 3) PETS (owned by user_id)
-- create policy "pets_select_own"
-- on public.pets
-- for select
-- to authenticated
-- using (auth.uid() = user_id);

-- create policy "pets_write_own"
-- on public.pets
-- for all
-- to authenticated
-- using (auth.uid() = user_id)
-- with check (auth.uid() = user_id);

-- -- 4) INVENTORY (owned by user_id)
-- create policy "inventory_select_own"
-- on public.inventory
-- for select
-- to authenticated
-- using (auth.uid() = user_id);

-- create policy "inventory_write_own"
-- on public.inventory
-- for all
-- to authenticated
-- using (auth.uid() = user_id)
-- with check (auth.uid() = user_id);

-- -- 5) WALLETS (owned by user_id)
-- create policy "wallets_select_own"
-- on public.wallets
-- for select
-- to authenticated
-- using (auth.uid() = user_id);

-- create policy "wallets_write_own"
-- on public.wallets
-- for all
-- to authenticated
-- using (auth.uid() = user_id)
-- with check (auth.uid() = user_id);

-- -- 6) WALLET LEDGER (owned by user_id)
-- create policy "wallet_ledger_select_own"
-- on public.wallet_ledger
-- for select
-- to authenticated
-- using (auth.uid() = user_id);

-- create policy "wallet_ledger_write_own"
-- on public.wallet_ledger
-- for all
-- to authenticated
-- using (auth.uid() = user_id)
-- with check (auth.uid() = user_id);

-- -- 7) BATTLE RUNS (owned by user_id)
-- create policy "battle_runs_select_own"
-- on public.battle_runs
-- for select
-- to authenticated
-- using (auth.uid() = user_id);

-- create policy "battle_runs_write_own"
-- on public.battle_runs
-- for all
-- to authenticated
-- using (auth.uid() = user_id)
-- with check (auth.uid() = user_id);

-- -- 8) BATTLE RUN FIGHTS (owned via run_id -> battle_runs.user_id)
-- create policy "battle_run_fights_select_own"
-- on public.battle_run_fights
-- for select
-- to authenticated
-- using (
--   exists (
--     select 1
--     from public.battle_runs r
--     where r.id = battle_run_fights.run_id
--       and r.user_id = auth.uid()
--   )
-- );

-- create policy "battle_run_fights_write_own"
-- on public.battle_run_fights
-- for all
-- to authenticated
-- using (
--   exists (
--     select 1
--     from public.battle_runs r
--     where r.id = battle_run_fights.run_id
--       and r.user_id = auth.uid()
--   )
-- )
-- with check (
--   exists (
--     select 1
--     from public.battle_runs r
--     where r.id = battle_run_fights.run_id
--       and r.user_id = auth.uid()
--   )
-- );

-- -- 9) PET-CHILD TABLES (owned via pet_id -> pets.user_id)

-- -- pet_stats (pk pet_id)
-- create policy "pet_stats_select_own"
-- on public.pet_stats
-- for select
-- to authenticated
-- using (
--   exists (
--     select 1
--     from public.pets p
--     where p.id = pet_stats.pet_id
--       and p.user_id = auth.uid()
--   )
-- );

-- create policy "pet_stats_write_own"
-- on public.pet_stats
-- for all
-- to authenticated
-- using (
--   exists (
--     select 1
--     from public.pets p
--     where p.id = pet_stats.pet_id
--       and p.user_id = auth.uid()
--   )
-- )
-- with check (
--   exists (
--     select 1
--     from public.pets p
--     where p.id = pet_stats.pet_id
--       and p.user_id = auth.uid()
--   )
-- );

-- -- pet_stat_allocations
-- create policy "pet_stat_allocations_select_own"
-- on public.pet_stat_allocations
-- for select
-- to authenticated
-- using (
--   exists (
--     select 1
--     from public.pets p
--     where p.id = pet_stat_allocations.pet_id
--       and p.user_id = auth.uid()
--   )
-- );

-- create policy "pet_stat_allocations_write_own"
-- on public.pet_stat_allocations
-- for all
-- to authenticated
-- using (
--   exists (
--     select 1
--     from public.pets p
--     where p.id = pet_stat_allocations.pet_id
--       and p.user_id = auth.uid()
--   )
-- )
-- with check (
--   exists (
--     select 1
--     from public.pets p
--     where p.id = pet_stat_allocations.pet_id
--       and p.user_id = auth.uid()
--   )
-- );

-- -- pet_elements (pk pet_id)
-- create policy "pet_elements_select_own"
-- on public.pet_elements
-- for select
-- to authenticated
-- using (
--   exists (
--     select 1
--     from public.pets p
--     where p.id = pet_elements.pet_id
--       and p.user_id = auth.uid()
--   )
-- );

-- create policy "pet_elements_write_own"
-- on public.pet_elements
-- for all
-- to authenticated
-- using (
--   exists (
--     select 1
--     from public.pets p
--     where p.id = pet_elements.pet_id
--       and p.user_id = auth.uid()
--   )
-- )
-- with check (
--   exists (
--     select 1
--     from public.pets p
--     where p.id = pet_elements.pet_id
--       and p.user_id = auth.uid()
--   )
-- );

-- -- pet_skills (pk pet_id+skill_id)
-- create policy "pet_skills_select_own"
-- on public.pet_skills
-- for select
-- to authenticated
-- using (
--   exists (
--     select 1
--     from public.pets p
--     where p.id = pet_skills.pet_id
--       and p.user_id = auth.uid()
--   )
-- );

-- create policy "pet_skills_write_own"
-- on public.pet_skills
-- for all
-- to authenticated
-- using (
--   exists (
--     select 1
--     from public.pets p
--     where p.id = pet_skills.pet_id
--       and p.user_id = auth.uid()
--   )
-- )
-- with check (
--   exists (
--     select 1
--     from public.pets p
--     where p.id = pet_skills.pet_id
--       and p.user_id = auth.uid()
--   )
-- );

-- -- 10) GLOBAL READ TABLES (definitions/config)
-- -- item_defs
-- create policy "item_defs_read_authed"
-- on public.item_defs
-- for select
-- to authenticated
-- using (true);

-- -- skill_defs
-- create policy "skill_defs_read_authed"
-- on public.skill_defs
-- for select
-- to authenticated
-- using (true);

-- -- game_config
-- create policy "game_config_read_authed"
-- on public.game_config
-- for select
-- to authenticated
-- using (true);
