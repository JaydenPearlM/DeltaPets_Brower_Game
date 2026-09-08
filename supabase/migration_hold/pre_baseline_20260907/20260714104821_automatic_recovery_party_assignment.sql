begin;

create or replace function public.recover_runaway_pet_to_party(
  p_user_id uuid,
  p_pet_id uuid
)
returns table (
  party_slot integer,
  destination text,
  message text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_runaway_at timestamptz;
  v_is_runaway boolean;
  v_slot integer;
  v_now timestamptz := now();
  v_has_active_pet boolean;
begin
  -- Prevent two simultaneous requests from taking the same party slot.
  perform pg_advisory_xact_lock(
    hashtextextended(p_user_id::text, 0)
  );

  select
    p.runaway_at,
    coalesce(p.ran_away, false)
  into
    v_runaway_at,
    v_is_runaway
  from public.pets p
  where p.id = p_pet_id
    and p.user_id = p_user_id
  for update;

  if not found then
    raise exception 'That Delta was not found.';
  end if;

  if not v_is_runaway or v_runaway_at is null then
    raise exception 'That Delta has not run away.';
  end if;

  if v_now - v_runaway_at >= interval '48 hours' then
    raise exception 'The recovery window for that Delta has expired.';
  end if;

  -- Remove any stale party assignment left behind when it ran away.
  delete from public.party_slots
  where user_id = p_user_id
    and pet_id = p_pet_id;

  -- Restore the same existing pet. Never recreate or duplicate it.
  update public.pets
  set
    ran_away = false,
    runaway_at = null,
    is_active = false,
    location = 'storage',

    hunger = 50,
    clean = 50,
    happy = 50,
    comfort = 50,
    rest = 50,
    energy = 100,
    neglect_hours = 0,

    last_care_decay_at = v_now,
    last_cared_at = v_now,
    last_fed_at = v_now,
    last_hunger_decay_at = v_now,
    updated_at = v_now
  where id = p_pet_id
    and user_id = p_user_id;

  -- Find the first open slot from 1 through 4.
  select available.slot_index
  into v_slot
  from generate_series(1, 4) as available(slot_index)
  where not exists (
    select 1
    from public.party_slots ps
    where ps.user_id = p_user_id
      and ps.slot_index = available.slot_index
  )
  order by available.slot_index
  limit 1;

  -- All four slots are full. Keep the pet in Storage.
  if v_slot is null then
    return query
    select
      null::integer,
      'storage'::text,
      'Pet has returned to storage, stats all care maxed.'::text;

    return;
  end if;

  insert into public.party_slots (
    user_id,
    pet_id,
    slot_index
  )
  values (
    p_user_id,
    p_pet_id,
    v_slot
  );

  -- Do not steal focus from an existing active pet.
  select exists (
    select 1
    from public.party_slots ps
    join public.pets p
      on p.id = ps.pet_id
    where ps.user_id = p_user_id
      and p.id <> p_pet_id
      and p.is_active = true
      and coalesce(p.ran_away, false) = false
      and lower(coalesce(p.stage::text, '')) <> 'egg'
  )
  into v_has_active_pet;

  update public.pets
  set
    location = 'active',
    is_active = not v_has_active_pet,
    updated_at = v_now
  where id = p_pet_id
    and user_id = p_user_id;

  return query
  select
    v_slot,
    'party'::text,
    'Pet has returned home, stats all care maxed.'::text;
end;
$$;

revoke all
on function public.recover_runaway_pet_to_party(uuid, uuid)
from public, anon, authenticated;

grant execute
on function public.recover_runaway_pet_to_party(uuid, uuid)
to service_role;

commit;