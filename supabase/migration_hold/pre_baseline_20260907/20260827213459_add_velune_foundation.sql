-- Velune's durable, server-owned encounter, reward, and Trainer Level lock.
-- The 45% sighting gate matches Kithna's existing roaming encounter frequency;
-- a sighting then receives the separately confirmed 5% Legendary Egg roll.

create table if not exists public.trainer_progression (
  user_id uuid primary key references auth.users(id) on delete cascade,
  trainer_level integer not null default 1 check (trainer_level >= 1),
  trainer_xp bigint not null default 0 check (trainer_xp >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.trainer_progression is
  'Server-owned player progression. Kith level and elemental training remain separate systems.';

create table if not exists public.legendary_kith_event_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  legendary_key text not null,
  last_attempt_at timestamptz,
  sighting_count integer not null default 0 check (sighting_count >= 0),
  egg_obtained_at timestamptz,
  egg_pet_id uuid references public.pets(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, legendary_key),
  constraint legendary_kith_event_state_completion_check check (
    (egg_obtained_at is null and egg_pet_id is null)
    or (egg_obtained_at is not null and egg_pet_id is not null)
  ),
  constraint legendary_kith_event_state_velune_key_check check (
    legendary_key = 'velune'
  )
);

create unique index if not exists legendary_kith_event_state_egg_pet_id_key
  on public.legendary_kith_event_state (egg_pet_id)
  where egg_pet_id is not null;

comment on table public.legendary_kith_event_state is
  'Durable server-owned eligibility and completion state for one-time Legendary Kith events.';

alter table public.trainer_progression enable row level security;
alter table public.legendary_kith_event_state enable row level security;

drop policy if exists "Trainer progression is readable by owner"
  on public.trainer_progression;

create policy "Trainer progression is readable by owner"
  on public.trainer_progression
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Legendary event state is readable by owner"
  on public.legendary_kith_event_state;

create policy "Legendary event state is readable by owner"
  on public.legendary_kith_event_state
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.trainer_progression from anon, authenticated;
revoke all on public.legendary_kith_event_state from anon, authenticated;

grant select on public.trainer_progression to authenticated;
grant select on public.legendary_kith_event_state to authenticated;

grant select, insert, update, delete on public.trainer_progression
  to service_role;
grant select, insert, update, delete on public.legendary_kith_event_state
  to service_role;

create or replace function public.roll_velune_encounter(
  p_user_id uuid,
  p_location_key text,
  p_sighting_roll integer,
  p_egg_roll integer,
  p_bypass_cooldown boolean default false
)
returns table (
  attempted boolean,
  sighted boolean,
  egg_awarded boolean,
  reason text,
  retry_after_ms integer,
  egg_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state public.legendary_kith_event_state%rowtype;
  v_now timestamptz := now();
  v_retry_ms integer;
  v_egg_id uuid;
  v_existing_velune_id uuid;
  v_affinity_count integer;
begin
  if p_user_id is null then
    raise exception 'Authenticated user id is required.';
  end if;

  if p_location_key not in (
    '/cities/kithna',
    '/kithna/food',
    '/kithna/health',
    '/kithna/armor',
    '/kithna/weapons',
    '/hatchery',
    '/pet',
    '/gym',
    '/farm',
    '/kithna/farm',
    '/kithna/farm/dungeon'
  ) then
    return query select false, false, false, 'ineligible_location'::text, 0, null::uuid;
    return;
  end if;

  if p_sighting_roll not between 0 and 99 or p_egg_roll not between 0 and 99 then
    raise exception 'Velune rolls must be between 0 and 99.';
  end if;

  insert into public.trainer_progression (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  insert into public.legendary_kith_event_state (user_id, legendary_key)
  values (p_user_id, 'velune')
  on conflict (user_id, legendary_key) do nothing;

  select *
  into v_state
  from public.legendary_kith_event_state
  where user_id = p_user_id
    and legendary_key = 'velune'
  for update;

  -- Treat any pre-existing Velune egg or hatchling as completion. This closes
  -- the only gap where an account could own Velune before its event-state row
  -- existed (for example, an authorized test grant).
  select id
  into v_existing_velune_id
  from public.pets
  where user_id = p_user_id
    and species = 'velune'
  order by created_at
  limit 1;

  if v_existing_velune_id is not null and v_state.egg_obtained_at is null then
    update public.legendary_kith_event_state
    set egg_obtained_at = v_now,
        egg_pet_id = v_existing_velune_id,
        updated_at = v_now
    where user_id = p_user_id
      and legendary_key = 'velune';

    return query select false, false, false, 'completed'::text, 0, v_existing_velune_id;
    return;
  end if;

  if v_state.egg_obtained_at is not null then
    return query select false, false, false, 'completed'::text, 0, v_state.egg_pet_id;
    return;
  end if;

  if not p_bypass_cooldown
     and v_state.last_attempt_at is not null
     and v_state.last_attempt_at > v_now - interval '60 seconds' then
    v_retry_ms := greatest(
      0,
      ceil(extract(epoch from (
        v_state.last_attempt_at + interval '60 seconds' - v_now
      )) * 1000)::integer
    );

    return query select false, false, false, 'cooldown'::text, v_retry_ms, null::uuid;
    return;
  end if;

  update public.legendary_kith_event_state
  set last_attempt_at = v_now,
      updated_at = v_now
  where user_id = p_user_id
    and legendary_key = 'velune';

  if p_sighting_roll >= 45 then
    return query select true, false, false, 'no_sighting'::text, 0, null::uuid;
    return;
  end if;

  update public.legendary_kith_event_state
  set sighting_count = sighting_count + 1,
      updated_at = v_now
  where user_id = p_user_id
    and legendary_key = 'velune';

  if p_egg_roll >= 5 then
    return query select true, true, false, 'sighting'::text, 0, null::uuid;
    return;
  end if;

  insert into public.pets (
    user_id,
    name,
    species,
    rarity,
    line,
    stage,
    level,
    xp,
    energy,
    hatch_ends_at,
    pending_hatch_minutes,
    is_active,
    location
  ) values (
    p_user_id,
    'Legendary Egg',
    'velune',
    null,
    'air',
    'egg',
    1,
    0,
    100,
    null,
    45,
    false,
    'storage'
  )
  returning id into v_egg_id;

  insert into public.pet_stats (
    pet_id,
    base_hp,
    base_atk,
    base_magi,
    base_def,
    base_spd,
    base_mana,
    base_total
  ) values (
    v_egg_id,
    2,
    2,
    3,
    2,
    3,
    2,
    14
  );

  insert into public.pet_element_affinities (
    pet_id,
    element_id,
    affinity,
    updated_at
  )
  select
    v_egg_id,
    element.id,
    5,
    v_now
  from public.element_defs as element
  where element.key in ('light', 'ice', 'air', 'storm');

  select count(*)
  into v_affinity_count
  from public.pet_element_affinities
  where pet_id = v_egg_id;

  if v_affinity_count <> 4 then
    raise exception 'Velune requires Light, Ice, Air, and Storm element definitions.';
  end if;

  update public.legendary_kith_event_state
  set egg_obtained_at = v_now,
      egg_pet_id = v_egg_id,
      updated_at = v_now
  where user_id = p_user_id
    and legendary_key = 'velune';

  return query select true, true, true, 'egg_awarded'::text, 0, v_egg_id;
end;
$$;

revoke all on function public.roll_velune_encounter(uuid, text, integer, integer, boolean)
  from public, anon, authenticated;

grant execute on function public.roll_velune_encounter(uuid, text, integer, integer, boolean)
  to service_role;

create or replace function public.prevent_locked_velune_party_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_species text;
  v_trainer_level integer;
begin
  select species
  into v_species
  from public.pets
  where id = new.pet_id
    and user_id = new.user_id;

  if v_species = 'velune' then
    select trainer_level
    into v_trainer_level
    from public.trainer_progression
    where user_id = new.user_id;

    if coalesce(v_trainer_level, 1) < 10 then
      raise exception 'Trainer Level 10 required to use Mythical Legendary Kith.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_locked_velune_party_assignment
  on public.party_slots;

create trigger prevent_locked_velune_party_assignment
before insert or update of pet_id, user_id
on public.party_slots
for each row
execute function public.prevent_locked_velune_party_assignment();

create or replace function public.prevent_locked_velune_activation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trainer_level integer;
begin
  if new.species = 'velune'
     and (new.is_active is true or new.location::text in ('active', 'party')) then
    select trainer_level
    into v_trainer_level
    from public.trainer_progression
    where user_id = new.user_id;

    if coalesce(v_trainer_level, 1) < 10 then
      raise exception 'Trainer Level 10 required to use Mythical Legendary Kith.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_locked_velune_activation
  on public.pets;

create trigger prevent_locked_velune_activation
before insert or update of is_active, location, species
on public.pets
for each row
execute function public.prevent_locked_velune_activation();

revoke all on function public.prevent_locked_velune_party_assignment()
  from public, anon, authenticated;
revoke all on function public.prevent_locked_velune_activation()
  from public, anon, authenticated;
