begin;

-- Keep committed migrations aligned with columns already used by the app/live types.
alter table public.pets
  add column if not exists species text,
  add column if not exists description text,
  add column if not exists magi integer not null default 0,
  add column if not exists mana integer not null default 0,
  add column if not exists hatch_time_alignment text,
  add column if not exists hatchery_slot_index integer,
  add column if not exists last_cared_at timestamptz,
  add column if not exists cd_pet_ends_at timestamptz;

create index if not exists pets_cd_pet_ends_at_idx
on public.pets (cd_pet_ends_at);

-- Lock client writes to real source-of-truth inventory and combat stat tables.
drop policy if exists "inventory_crud_own" on public.inventory;
drop policy if exists "inventory_select_own" on public.inventory;

create policy "inventory_select_own"
on public.inventory
for select
using (auth.uid() = user_id);

drop policy if exists "pet_stats_own" on public.pet_stats;
drop policy if exists "pet_stats_select_own" on public.pet_stats;

create policy "pet_stats_select_own"
on public.pet_stats
for select
using (
  exists (
    select 1
    from public.pets p
    where p.id = pet_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "pet_alloc_own" on public.pet_stat_allocations;
drop policy if exists "pet_stat_allocations_own" on public.pet_stat_allocations;
drop policy if exists "pet_stat_allocations_select_own" on public.pet_stat_allocations;

create policy "pet_stat_allocations_select_own"
on public.pet_stat_allocations
for select
using (
  exists (
    select 1
    from public.pets p
    where p.id = pet_id
      and p.user_id = auth.uid()
  )
);

-- Battle runs are not persisted by the current PVE route yet, but do not leave
-- a forgeable write policy waiting for later.
drop policy if exists "battle_runs_crud_own" on public.battle_runs;
drop policy if exists "battle_runs_select_own" on public.battle_runs;

create policy "battle_runs_select_own"
on public.battle_runs
for select
using (auth.uid() = user_id);

-- Harden wallet mutation RPC while preserving backend service-role access.
create or replace function public.increment_wallet(
  p_user_id uuid,
  p_dots int default 0,
  p_crystals int default 0
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized to increment this wallet';
  end if;

  insert into public.wallets (user_id, dots, crystals)
  values (p_user_id, greatest(p_dots, 0), greatest(p_crystals, 0))
  on conflict (user_id) do update
    set
      dots = public.wallets.dots + greatest(p_dots, 0),
      crystals = public.wallets.crystals + greatest(p_crystals, 0),
      updated_at = now();
end;
$$;

revoke execute on function public.increment_wallet(uuid, int, int) from public;
revoke execute on function public.increment_wallet(uuid, int, int) from anon;
revoke execute on function public.increment_wallet(uuid, int, int) from authenticated;
grant execute on function public.increment_wallet(uuid, int, int) to service_role;

commit;