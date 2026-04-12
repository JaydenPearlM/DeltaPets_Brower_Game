-- supabase/migrations/20260412_000021_add_gender_personality_to_pets.sql
--
-- Adds three columns visible in the DB schema that were missing from migrations:
--   gender         — rolled at hatch (male / female / null_gender)
--   personality_id — FK to personalities lookup table
--   personality_key— plain text key for quick reads without a join
--
-- Also creates the personalities lookup table.

begin;

-- 1) pet_gender enum
do $$ begin
  create type public.pet_gender as enum ('male', 'female', 'null_gender');
exception when duplicate_object then null;
end $$;

-- 2) gender column on pets
alter table public.pets
  add column if not exists gender public.pet_gender not null default 'null_gender';

-- 3) personalities lookup table
create table if not exists public.personalities (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

-- Seed all personality_trait enum values
insert into public.personalities (key, name) values
  ('friendly',    'Friendly'),
  ('honest',      'Honest'),
  ('deceiver',    'Deceiver'),
  ('loyal',       'Loyal'),
  ('cowardly',    'Cowardly'),
  ('brave',       'Brave'),
  ('vengeful',    'Vengeful'),
  ('impulsive',   'Impulsive'),
  ('reasonable',  'Reasonable'),
  ('lazy',        'Lazy'),
  ('diligent',    'Diligent'),
  ('naive',       'Naive'),
  ('cruel',       'Cruel'),
  ('optimistic',  'Optimistic'),
  ('pessimistic', 'Pessimistic'),
  ('arrogant',    'Arrogant'),
  ('humble',      'Humble'),
  ('snob',        'Snob'),
  ('respectful',  'Respectful'),
  ('greedy',      'Greedy'),
  ('generous',    'Generous'),
  ('kind',        'Kind')
on conflict (key) do nothing;

-- 4) personality_id + personality_key on pets
alter table public.pets
  add column if not exists personality_id  uuid references public.personalities(id) on delete set null,
  add column if not exists personality_key text;

-- 5) RLS — personalities is a public read-only lookup
alter table public.personalities enable row level security;

drop policy if exists "personalities_select_all" on public.personalities;
create policy "personalities_select_all"
  on public.personalities for select
  using (true);

-- 6) Index
create index if not exists idx_personalities_key
  on public.personalities (key);

commit;
