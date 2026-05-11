-- supabase/migrations/20260412000021_add_gender_personality_to_pets.sql

begin;

do $$ begin
  create type public.pet_gender as enum ('male', 'female', 'null_gender');
exception when duplicate_object then null;
end $$;

alter table public.pets
  add column if not exists gender public.pet_gender not null default 'null_gender';

create table if not exists public.personalities (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  name        text not null,
  description text,
  definition  text not null default '',
  modifiers   jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

alter table public.personalities
  add column if not exists definition text not null default '',
  add column if not exists modifiers jsonb not null default '{}'::jsonb;

-- Personality seed skipped.
-- Remote personalities table already contains full personality data.

alter table public.pets
  add column if not exists personality_id  uuid references public.personalities(id) on delete set null,
  add column if not exists personality_key text;

alter table public.personalities enable row level security;

drop policy if exists "personalities_select_all" on public.personalities;
create policy "personalities_select_all"
  on public.personalities for select
  using (true);

create index if not exists idx_personalities_key
  on public.personalities (key);

commit;