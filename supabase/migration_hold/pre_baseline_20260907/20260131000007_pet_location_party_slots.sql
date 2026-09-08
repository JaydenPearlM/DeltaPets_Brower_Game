-- supabase/migrations/20260131_000005_pet_location_party_slots.sql
-- Adds:
-- - pet_location enum + pets.location
-- - pets.unspent_points (used by hatch reward)
-- - party_slots table (4 battle pets)
-- - RLS for party_slots

begin;

-- 1) pet_location enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'pet_location') then
    create type public.pet_location as enum ('hatchery', 'active', 'storage');
  end if;
end $$;

-- 2) pets.location + pets.unspent_points
alter table public.pets
  add column if not exists location public.pet_location not null default 'active';

alter table public.pets
  add column if not exists unspent_points int not null default 0;

-- 3) backfill location for existing rows (safe defaults)
update public.pets
set location = case
  when stage = 'egg' then 'hatchery'::public.pet_location
  else 'active'::public.pet_location
end
where location is null;

-- 4) party_slots (3 pet battle party)
create table if not exists public.party_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slot_index int not null check (slot_index between 1 and 4),
  pet_id uuid not null references public.pets(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slot_index),
  unique (user_id, pet_id)
);

-- If you already have set_updated_at() from earlier migrations, use it.
do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    drop trigger if exists trg_party_slots_updated_at on public.party_slots;
    create trigger trg_party_slots_updated_at
    before update on public.party_slots
    for each row execute function public.set_updated_at();
  end if;
end $$;

-- 5) RLS for party_slots
alter table public.party_slots enable row level security;

drop policy if exists "party_slots_select_own" on public.party_slots;
create policy "party_slots_select_own"
on public.party_slots
for select
using (user_id = auth.uid());

drop policy if exists "party_slots_insert_own" on public.party_slots;
create policy "party_slots_insert_own"
on public.party_slots
for insert
with check (user_id = auth.uid());

drop policy if exists "party_slots_update_own" on public.party_slots;
create policy "party_slots_update_own"
on public.party_slots
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "party_slots_delete_own" on public.party_slots;
create policy "party_slots_delete_own"
on public.party_slots
for delete
using (user_id = auth.uid());

commit;
