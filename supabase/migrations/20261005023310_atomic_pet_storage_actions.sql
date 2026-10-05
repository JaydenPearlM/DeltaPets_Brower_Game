-- Browser storage writes are replaced with a service-only, atomic action.
-- Existing rows, balance values, caps, timer rules and Velune triggers are preserved.
begin;

create or replace function public.apply_pet_storage_action(
  p_user_id uuid, p_action text, p_pet_id uuid default null,
  p_slot_index integer default null
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  v_pet public.pets%rowtype;
  v_displaced public.pets%rowtype;
  v_current public.party_slots%rowtype;
  v_target public.party_slots%rowtype;
  v_hatch_slot public.hatchery_slots%rowtype;
  v_to_store uuid;
  v_to_store_egg boolean := false;
  v_active uuid;
  v_fallback uuid;
  v_total integer;
  v_eggs integer;
  v_pets integer;
  v_party_count integer;
  v_target_slot integer := p_slot_index;
  v_hatch_minutes integer;
  v_hatch_ends timestamptz;
begin
  if p_user_id is null or p_action is null or p_action not in (
    'assign_party', 'return_party', 'store_pet', 'set_active',
    'incubate_storage', 'incubate_inventory', 'incubate_legacy',
    'store_inventory_egg', 'store_hatchery_egg'
  ) then raise exception 'Invalid storage action.'; end if;
  if p_action in ('assign_party', 'return_party')
     and (p_slot_index is null or p_slot_index not between 1 and 4) then
    raise exception 'Party slot must be between 1 and 4.';
  end if;

  -- Common lock order with hatch completion/rewards: player before pet.
  perform 1 from public.profiles where user_id = p_user_id for update;
  if not found then raise exception 'Player profile not found.'; end if;
  perform id from public.pets where user_id = p_user_id order by id for update;
  perform id from public.party_slots where user_id = p_user_id order by id for update;
  perform id from public.hatchery_slots where user_id = p_user_id order by id for update;

  if p_action = 'return_party' then
    select * into v_current from public.party_slots
      where user_id = p_user_id and slot_index = p_slot_index;
    if not found then return jsonb_build_object('success', true); end if;
    select * into v_pet from public.pets
      where id = v_current.pet_id and user_id = p_user_id;
  else
    select * into v_pet from public.pets
      where id = p_pet_id and user_id = p_user_id;
  end if;
  if not found then raise exception 'Pet not found.'; end if;
  if v_pet.runaway_at is not null or coalesce(v_pet.ran_away, false) then
    raise exception 'Runaway pets cannot be moved or activated.';
  end if;

  select id into v_active from public.pets
    where user_id = p_user_id and is_active is true order by id limit 1;
  select count(*) into v_party_count from public.party_slots s
    join public.pets p on p.id = s.pet_id and p.user_id = s.user_id
    where s.user_id = p_user_id and p.stage::text <> 'egg'
      and p.runaway_at is null and not coalesce(p.ran_away, false);

  if p_action in ('assign_party', 'set_active', 'store_pet', 'return_party') then
    if v_pet.stage::text = 'egg' then raise exception 'Eggs cannot join the Main Team.'; end if;
    if v_pet.location::text not in ('storage', 'active', 'party') then
      raise exception 'That pet is not in storage or the Main Team.';
    end if;
  end if;

  if p_action = 'assign_party' then
    select * into v_current from public.party_slots
      where user_id = p_user_id and pet_id = v_pet.id;
    if (select count(*) from public.party_slots where user_id = p_user_id) = 1
       and v_current.id is not null then v_target_slot := 1; end if;
    select * into v_target from public.party_slots
      where user_id = p_user_id and slot_index = v_target_slot;
    if v_current.id is null and v_target.id is not null then
      select * into v_displaced from public.pets
        where id = v_target.pet_id and user_id = p_user_id;
      if not found then raise exception 'Target slot pet not found.'; end if;
      v_to_store := v_displaced.id;
      v_to_store_egg := v_displaced.stage::text = 'egg';
    end if;
  elsif p_action in ('store_pet', 'return_party') then
    if v_pet.location::text = 'storage' and not exists (
      select 1 from public.party_slots where user_id = p_user_id and pet_id = v_pet.id
    ) then return jsonb_build_object('success', true); end if;
    if exists (select 1 from public.party_slots where user_id = p_user_id and pet_id = v_pet.id)
       and v_party_count <= 1 then
      raise exception 'Your Main Team must always keep at least 1 Delta.';
    end if;
    v_to_store := v_pet.id;
  elsif p_action in ('store_inventory_egg', 'store_hatchery_egg') then
    if v_pet.stage::text <> 'egg' or
       v_pet.location::text <> (case when p_action = 'store_inventory_egg' then 'inventory' else 'hatchery' end) then
      raise exception 'That egg is not in the expected location.';
    end if;
    v_to_store := v_pet.id;
    v_to_store_egg := true;
  elsif p_action in ('incubate_storage', 'incubate_inventory', 'incubate_legacy') then
    if v_pet.stage::text <> 'egg'
       or v_pet.location::text not in ('storage', 'inventory')
       or (p_action = 'incubate_storage' and v_pet.location::text <> 'storage')
       or (p_action = 'incubate_inventory' and v_pet.location::text <> 'inventory') then
      raise exception 'That egg is not in the expected location.';
    end if;
    if exists (select 1 from public.pets where user_id = p_user_id
      and stage::text = 'egg' and location::text = 'hatchery' and id <> v_pet.id) then
      raise exception 'Only one egg can be in the incubator at a time.';
    end if;
    select * into v_hatch_slot from public.hatchery_slots
      where user_id = p_user_id and unlocked is true and pet_id is null
      order by slot_index limit 1;
    if not found then raise exception 'No open hatchery slot is available right now.'; end if;
    -- This is the existing pending duration / 3-minute fallback, now using DB time.
    v_hatch_minutes := coalesce(v_pet.pending_hatch_minutes, 3);
    v_hatch_ends := clock_timestamp() + make_interval(mins => v_hatch_minutes);
    update public.pets set location = 'hatchery', is_active = false,
      hatch_ends_at = v_hatch_ends, pending_hatch_minutes = null
      where id = v_pet.id and user_id = p_user_id;
    update public.hatchery_slots set pet_id = v_pet.id
      where id = v_hatch_slot.id and user_id = p_user_id and pet_id is null;
    if not found then raise exception 'Hatchery slot is no longer available.'; end if;
    return jsonb_build_object('success', true, 'slot_index', v_hatch_slot.slot_index,
      'hatch_ends_at', v_hatch_ends);
  end if;

  if v_to_store is not null then
    -- Match the existing UI storage buckets, including orphaned active/team pets.
    select count(*), count(*) filter (where p.stage::text = 'egg'),
      count(*) filter (where p.stage::text is distinct from 'egg')
      into v_total, v_eggs, v_pets
      from public.pets p where p.user_id = p_user_id
        and p.runaway_at is null and not coalesce(p.ran_away, false)
        and (p.location::text = 'storage' or
          (p.location::text in ('active', 'party') and not exists (
            select 1 from public.party_slots s where s.user_id = p_user_id and s.pet_id = p.id
          )));
    if v_total + 1 > 50 then raise exception 'Storage is full. Max 50 stored creatures.'; end if;
    if v_to_store_egg and v_eggs + 1 > 20 then
      raise exception 'Egg storage is full. Max 20 stored eggs.';
    end if;
    if not v_to_store_egg and v_pets + 1 > 30 then
      raise exception 'Pet storage is full. Max 30 stored pets.';
    end if;
  end if;

  if p_action = 'assign_party' then
    if v_current.id is not null and v_current.slot_index = v_target_slot then
      update public.pets set location = 'active' where id = v_pet.id and user_id = p_user_id;
    elsif v_current.id is not null and v_target.id is not null then
      delete from public.party_slots where user_id = p_user_id and id in (v_current.id, v_target.id);
      insert into public.party_slots(user_id, slot_index, pet_id) values
        (p_user_id, v_target_slot, v_pet.id),
        (p_user_id, v_current.slot_index, v_target.pet_id);
      update public.pets set location = 'active'
        where user_id = p_user_id and id in (v_pet.id, v_target.pet_id);
    elsif v_current.id is not null then
      update public.party_slots set slot_index = v_target_slot
        where id = v_current.id and user_id = p_user_id;
      update public.pets set location = 'active' where id = v_pet.id and user_id = p_user_id;
    else
      if v_target.id is not null then
        delete from public.party_slots where id = v_target.id and user_id = p_user_id;
      end if;
      insert into public.party_slots(user_id, slot_index, pet_id)
        values (p_user_id, v_target_slot, v_pet.id);
      update public.pets set location = 'active' where id = v_pet.id and user_id = p_user_id;
      if v_to_store is not null then
        update public.pets set location = 'storage', is_active = false
          where id = v_to_store and user_id = p_user_id;
      end if;
      if v_active is null or v_active = v_to_store then
        update public.pets set is_active = false where user_id = p_user_id and is_active is true;
        update public.pets set location = 'active', is_active = true
          where id = v_pet.id and user_id = p_user_id;
      end if;
    end if;
  elsif p_action = 'set_active' then
    update public.pets set is_active = false where user_id = p_user_id and is_active is true;
    update public.pets set location = 'active', is_active = true where id = v_pet.id and user_id = p_user_id;
  else
    delete from public.party_slots where user_id = p_user_id and pet_id = v_pet.id;
    update public.pets set location = 'storage', is_active = false where id = v_pet.id and user_id = p_user_id;
    if p_action = 'store_hatchery_egg' then
      update public.hatchery_slots set pet_id = null where user_id = p_user_id and pet_id = v_pet.id;
    end if;
    if v_active = v_pet.id then
      select p.id into v_fallback from public.party_slots s
        join public.pets p on p.id = s.pet_id and p.user_id = s.user_id
        where s.user_id = p_user_id and p.id <> v_pet.id and p.stage::text <> 'egg'
          and p.runaway_at is null and not coalesce(p.ran_away, false)
        order by s.slot_index limit 1;
      if v_fallback is null then
        select id into v_fallback from public.pets where user_id = p_user_id
          and id <> v_pet.id and location::text = 'storage' and stage::text <> 'egg'
          and runaway_at is null and not coalesce(ran_away, false)
          order by coalesce(hatched_at, created_at) desc, coalesce(name, '') limit 1;
      end if;
      update public.pets set is_active = false where user_id = p_user_id and is_active is true;
      if v_fallback is not null then
        update public.pets set location = 'active', is_active = true where id = v_fallback and user_id = p_user_id;
      end if;
    end if;
  end if;
  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.apply_pet_storage_action(uuid, text, uuid, integer) from public, anon, authenticated;
grant execute on function public.apply_pet_storage_action(uuid, text, uuid, integer) to service_role;

commit;
