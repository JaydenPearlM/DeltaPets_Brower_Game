-- Forward compatibility completion against the reviewed 2026-11-12 schema.
-- No existing player rows are changed when this migration is applied.
-- Preserve existing merchant prices/limits: basket delegates to deployed single-item trade.
-- Rescue traffic must not mix legacy unlocked writers with the new atomic handler.
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $preflight$
BEGIN
  IF (SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace
      AND md5(pg_get_functiondef(oid)) IN ('1d6e6ea48328e7539f8f446005f8a2e9','708aa0adceda05ed628bb3fa0a07dc61','6408b87cc99025e0bf6558c3efb4c7c1','884b63c3d72c82404b2791930b28bdcb','f2c30b285c5907826aed6b07ef43d8ff','b3cd6d8ba52b88b0fbefab56ec0a37d6','347ba93dd4251ce34030755970954237')) <> 7 THEN
    RAISE EXCEPTION 'Reviewed dependency definitions changed; re-review before applying.';
  END IF;
  IF to_regprocedure('public.grant_rescue_egg(uuid,jsonb,jsonb)') IS NOT NULL
    OR to_regprocedure('public.trade_assanti_basket(uuid,integer,jsonb)') IS NOT NULL THEN
    RAISE EXCEPTION 'New RPCs already exist; inspect migration history before applying.';
  END IF;
END;
$preflight$;

-- Source preserved in migration_archive/20261024013421_require_hatchery_slot_to_hatch.sql
-- BUG-041: require owned, unlocked Hatchery placement before hatching.
-- Preserves existing eggs, timers, slot capacity, grants and hatch behavior.
CREATE OR REPLACE FUNCTION "public"."hatch_pet"("p_user_id" "uuid", "p_egg_id" "uuid", "p_iv_hp" integer, "p_iv_atk" integer, "p_iv_def" integer, "p_iv_spd" integer, "p_iv_magi" integer, "p_iv_mana" integer, "p_gender" "text", "p_personality_id" "uuid", "p_personality_key" "text", "p_hatchling_name" "text", "p_description" "text", "p_growth_strong_stats" "text"[], "p_growth_weak_stat" "text", "p_hatch_time_alignment" "text", "p_line" "public"."elemental_line", p_hatch_context jsonb) RETURNS TABLE(pet_row public.pets, success boolean, error_message text,
  party_slot_assigned integer, trainer_level integer, active_gameplay_locked boolean)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_base_hp int;
  v_base_atk int;
  v_base_def int;
  v_base_spd int;
  v_base_magi int;
  v_base_mana int;
  v_total_hp int;
  v_total_atk int;
  v_total_def int;
  v_total_spd int;
  v_total_magi int;
  v_total_mana int;
  v_hp_max int;
  v_now timestamptz;
  v_egg public.pets%ROWTYPE;
  v_base jsonb;
  v_delta_id uuid;
  v_slot integer;
  v_has_active boolean;
  v_required_level integer;
BEGIN
  -- Coordinate with storage actions and starter creation. Never write before
  -- ownership, readiness and the one-way egg transition are checked under lock.
  PERFORM 1 FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player profile not found'; END IF;
  SELECT * INTO v_egg FROM public.pets
    WHERE id = p_egg_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND OR v_egg.stage <> 'egg' THEN
    RETURN QUERY SELECT NULL::public.pets, false, 'Egg not found or already hatched'::text,
      NULL::integer, 1, false;
    RETURN;
  END IF;
  -- Storage actions use the same profile lock, serializing placement changes.
  PERFORM id FROM public.hatchery_slots
    WHERE user_id = p_user_id AND pet_id = p_egg_id AND unlocked IS TRUE
    FOR UPDATE;
  IF NOT FOUND OR v_egg.location::text IS DISTINCT FROM 'hatchery' THEN
    RETURN QUERY SELECT NULL::public.pets, false,
      'Egg must occupy an unlocked Hatchery slot.'::text,
      NULL::integer, 1, false;
    RETURN;
  END IF;
  v_now := clock_timestamp();
  IF v_egg.hatch_ends_at IS NULL OR v_egg.hatch_ends_at > v_now THEN
    RETURN QUERY SELECT NULL::public.pets, false, 'Egg is not ready to hatch'::text,
      NULL::integer, 1, false;
    RETURN;
  END IF;
  v_base := p_hatch_context->'base_stats';
  IF jsonb_typeof(v_base) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Missing hatch base stats';
  END IF;
  v_base_hp := (v_base->>'hp')::integer;
  v_base_atk := (v_base->>'atk')::integer;
  v_base_def := (v_base->>'def')::integer;
  v_base_spd := (v_base->>'spd')::integer;
  v_base_magi := (v_base->>'magi')::integer;
  v_base_mana := (v_base->>'mana')::integer;
  INSERT INTO public.pet_stats
    (pet_id, base_hp, base_atk, base_def, base_spd, base_magi, base_mana, base_total)
  VALUES (p_egg_id, v_base_hp, v_base_atk, v_base_def, v_base_spd,
    v_base_magi, v_base_mana, (v_base->>'base_total')::integer)
  ON CONFLICT (pet_id) DO UPDATE SET
    base_hp = EXCLUDED.base_hp, base_atk = EXCLUDED.base_atk,
    base_def = EXCLUDED.base_def, base_spd = EXCLUDED.base_spd,
    base_magi = EXCLUDED.base_magi, base_mana = EXCLUDED.base_mana,
    base_total = EXCLUDED.base_total;
  INSERT INTO public.pet_stat_allocations (
    pet_id,
    level,
    hp,
    atk,
    def,
    spd,
    magi,
    mana
  ) VALUES (
    p_egg_id,
    1,
    p_iv_hp,
    p_iv_atk,
    p_iv_def,
    p_iv_spd,
    p_iv_magi,
    p_iv_mana
  )
  ON CONFLICT (pet_id, level) DO UPDATE SET
    hp = EXCLUDED.hp,
    atk = EXCLUDED.atk,
    def = EXCLUDED.def,
    spd = EXCLUDED.spd,
    magi = EXCLUDED.magi,
    mana = EXCLUDED.mana;

  v_total_hp := v_base_hp + p_iv_hp;
  v_total_atk := v_base_atk + p_iv_atk;
  v_total_def := v_base_def + p_iv_def;
  v_total_spd := v_base_spd + p_iv_spd;
  v_total_magi := v_base_magi + p_iv_magi;
  v_total_mana := v_base_mana + p_iv_mana;
  v_hp_max := GREATEST(1, v_total_hp * 2);

  UPDATE public.pets
  SET
    name = p_hatchling_name,
    line = p_line,
    stage = 'hatchling',
    hatched_at = v_now,
    hatch_ends_at = NULL,
    unspent_points = 0,
    is_active = false,
    location = 'storage',
    gender = coalesce(nullif(p_gender, ''), 'null_gender')::public.pet_gender,
    atk = v_total_atk,
    def = v_total_def,
    spd = v_total_spd,
    magi = v_total_magi,
    mana = v_total_mana,
    hp_max = v_hp_max,
    hp_cur = v_hp_max,
    hunger = 50,
    clean = 50,
    happy = 50,
    comfort = 50,
    rest = 50,
    energy = 100,
    bond = 0,
    neglect_hours = 0,
    ran_away = false,
    runaway_at = NULL,
    last_care_decay_at = v_now,
    passive_trait_id = CASE WHEN v_egg.passive_trait_id IS NULL AND v_egg.passive_trait_key IS NULL
      THEN NULLIF(p_hatch_context->>'passive_trait_id', '')::uuid ELSE v_egg.passive_trait_id END,
    passive_trait_key = CASE WHEN v_egg.passive_trait_id IS NULL AND v_egg.passive_trait_key IS NULL
      THEN NULLIF(p_hatch_context->>'passive_trait_key', '') ELSE v_egg.passive_trait_key END,
    personality_id = p_personality_id,
    personality_key = p_personality_key,
    description = p_description,
    hatch_time_alignment = p_hatch_time_alignment,
    growth_strong_stats = p_growth_strong_stats,
    growth_weak_stat = p_growth_weak_stat,
    updated_at = v_now
  WHERE id = p_egg_id
    AND user_id = p_user_id
    AND stage = 'egg'
  RETURNING * INTO pet_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Locked egg changed unexpectedly';
  END IF;

  INSERT INTO public.pet_elements (
    pet_id,
    null_element,
    water,
    fire,
    earth,
    air,
    ice,
    storm,
    light,
    shadow
  )
  VALUES (
    p_egg_id,
    0,
    CASE WHEN p_line::text = 'water' THEN 1 ELSE 0 END,
    CASE WHEN p_line::text = 'fire' THEN 1 ELSE 0 END,
    CASE WHEN p_line::text = 'earth' THEN 1 ELSE 0 END,
    CASE WHEN p_line::text = 'air' THEN 1 ELSE 0 END,
    CASE WHEN p_line::text = 'ice' THEN 1 ELSE 0 END,
    CASE WHEN p_line::text = 'storm' THEN 1 ELSE 0 END,
    CASE WHEN p_line::text = 'light' THEN 1 ELSE 0 END,
    CASE WHEN p_line::text = 'shadow' THEN 1 ELSE 0 END
  )
  ON CONFLICT (pet_id) DO UPDATE SET
    water = GREATEST(public.pet_elements.water, EXCLUDED.water),
    fire = GREATEST(public.pet_elements.fire, EXCLUDED.fire),
    earth = GREATEST(public.pet_elements.earth, EXCLUDED.earth),
    air = GREATEST(public.pet_elements.air, EXCLUDED.air),
    ice = GREATEST(public.pet_elements.ice, EXCLUDED.ice),
    storm = GREATEST(public.pet_elements.storm, EXCLUDED.storm),
    light = GREATEST(public.pet_elements.light, EXCLUDED.light),
    shadow = GREATEST(public.pet_elements.shadow, EXCLUDED.shadow);

  -- Existing hatch reward: exactly one native elemental Delta, no balance change.
  IF p_line::text IN ('water', 'fire', 'earth', 'air', 'ice', 'storm', 'light', 'shadow') THEN
    SELECT id INTO v_delta_id FROM public.item_defs WHERE slug = p_line::text || '-delta';
    IF NOT FOUND THEN RAISE EXCEPTION 'Hatch Delta item definition missing'; END IF;
    INSERT INTO public.inventory AS owned (user_id, item_id, qty)
      VALUES (p_user_id, v_delta_id, 1)
    ON CONFLICT (user_id, item_id) DO UPDATE SET qty = owned.qty + 1, updated_at = v_now;
  END IF;
  UPDATE public.hatchery_slots SET pet_id = NULL
    WHERE user_id = p_user_id AND pet_id = p_egg_id;

  trainer_level := 1;
  v_required_level := NULLIF(p_hatch_context->>'required_trainer_level', '')::integer;
  -- Retain the database's existing legendary activation floor as well.
  IF v_egg.species = 'velune' THEN v_required_level := greatest(coalesce(v_required_level, 10), 10); END IF;
  IF v_required_level IS NOT NULL THEN
    SELECT coalesce(tp.trainer_level, 1) INTO trainer_level
      FROM public.trainer_progression tp WHERE user_id = p_user_id;
    trainer_level := coalesce(trainer_level, 1);
  END IF;
  active_gameplay_locked := v_required_level IS NOT NULL AND trainer_level < v_required_level;
  party_slot_assigned := NULL;
  IF NOT active_gameplay_locked THEN
    SELECT ps.slot_index INTO v_slot FROM public.party_slots ps
      WHERE ps.user_id = p_user_id AND ps.pet_id = p_egg_id LIMIT 1;
    IF NOT FOUND THEN
      SELECT available.slot_index INTO v_slot FROM generate_series(1, 4) AS available(slot_index)
      WHERE NOT EXISTS (SELECT 1 FROM public.party_slots ps
        WHERE ps.user_id = p_user_id AND ps.slot_index = available.slot_index)
      ORDER BY available.slot_index LIMIT 1;
      IF v_slot IS NOT NULL THEN
        INSERT INTO public.party_slots (user_id, pet_id, slot_index)
          VALUES (p_user_id, p_egg_id, v_slot);
      END IF;
    END IF;
    IF v_slot IS NOT NULL THEN
      SELECT EXISTS (SELECT 1 FROM public.pets
        WHERE user_id = p_user_id AND is_active AND id <> p_egg_id) INTO v_has_active;
      UPDATE public.pets SET location = 'active', is_active = NOT v_has_active
        WHERE id = p_egg_id AND user_id = p_user_id RETURNING * INTO pet_row;
      party_slot_assigned := v_slot;
    END IF;
  END IF;
  RETURN QUERY SELECT pet_row, true, NULL::text, party_slot_assigned, trainer_level, active_gameplay_locked;
END;

$$;

-- Source preserved in migration_archive/20261025030424_require_main_team_before_activation.sql
-- BUG-040: require Main Team membership before explicit activation.
-- No existing player rows are changed by this migration.
-- Browser storage writes are replaced with a service-only, atomic action.
-- Existing rows, balance values, caps, timer rules and Velune triggers are preserved.
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
    -- Main Team membership is checked under the existing player/party locks.
    if not exists (
      select 1 from public.party_slots
      where user_id = p_user_id and pet_id = v_pet.id
    ) then
      raise exception 'Add this Kith to your Main Team before making it active.';
    end if;
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

-- Source preserved in migration_archive/20261025043221_enforce_daily_reward_stack_limits.sql
-- BUG-039: reject item rewards that exceed the configured stack limit.
-- Existing inventory is not trimmed; failed claims retain existing timing/streak rules.
-- Day 7 grants 100 Dots; existing Closed Alpha awards remain untouched.
-- Preserve the Day 5 eligibility fix, claim locks, and existing grants.
CREATE OR REPLACE FUNCTION public.claim_daily_login_reward(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v_claim public.daily_login_rewards%ROWTYPE;
  v_now timestamptz;
  v_diff integer;
  v_reset boolean;
  v_streak integer;
  v_day integer;
  v_reward jsonb;
  v_dots integer;
  v_slug text;
  v_qty integer;
  v_item uuid;
  v_stack_limit integer;
  v_pet uuid;
BEGIN
  PERFORM 1 FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player profile missing.';
  END IF;

  INSERT INTO public.daily_login_rewards (id) VALUES (p_user_id)
  ON CONFLICT (id) DO NOTHING;
  SELECT * INTO STRICT v_claim FROM public.daily_login_rewards
  WHERE id = p_user_id FOR UPDATE;

  -- Sample time after waiting for the lock, including across UTC midnight.
  v_now := clock_timestamp();
  v_diff := CASE WHEN v_claim.last_claimed_at IS NULL THEN 999
    ELSE (v_now AT TIME ZONE 'UTC')::date
       - (v_claim.last_claimed_at AT TIME ZONE 'UTC')::date END;
  IF v_diff = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Already claimed today.');
  END IF;

  v_reset := v_diff >= 4;
  v_streak := CASE WHEN v_reset THEN 0 ELSE v_claim.streak END + 1;
  v_day := (v_streak - 1) % 7;
  CASE v_day
    WHEN 0 THEN
      v_dots := 300;
      v_reward := '{"kind":"dots","amount":300,"label":"300 Dots"}'::jsonb;
    WHEN 1 THEN
      v_dots := 200;
      v_reward := '{"kind":"dots","amount":200,"label":"200 Dots"}'::jsonb;
    WHEN 2 THEN
      v_slug := 'haiku_scroll_50';
      v_qty := 1;
      v_reward := '{"kind":"item","slug":"haiku_scroll_50","qty":1,"label":"Haiku Scroll #50"}'::jsonb;
    WHEN 3 THEN
      v_slug := 'potion_small';
      v_qty := 3;
      v_reward := '{"kind":"item","slug":"potion_small","qty":3,"label":"Potions x3"}'::jsonb;
    WHEN 4 THEN
      v_reward := '{"kind":"xp","amount":100,"label":"EXP +100"}'::jsonb;
    WHEN 5 THEN
      v_dots := 500;
      v_reward := '{"kind":"dots","amount":500,"label":"500 Dots"}'::jsonb;
    WHEN 6 THEN
      v_dots := 100;
      v_reward := '{"kind":"dots","amount":100,"label":"100 Dots"}'::jsonb;
    ELSE
      RAISE EXCEPTION 'Invalid daily reward streak.';
  END CASE;

  IF v_dots IS NOT NULL THEN
    -- Preserve increment_wallet's missing-row behavior and existing currencies.
    INSERT INTO public.wallets AS owned (user_id, dots, crystals)
    VALUES (p_user_id, v_dots, 0)
    ON CONFLICT (user_id) DO UPDATE
      SET dots = owned.dots + EXCLUDED.dots, updated_at = v_now;
  ELSIF v_slug IS NOT NULL THEN
    SELECT id, stack_limit INTO STRICT v_item, v_stack_limit
    FROM public.item_defs WHERE slug = v_slug FOR SHARE;
    IF v_stack_limit IS NULL THEN
      RAISE EXCEPTION 'Reward item stack limit is missing.';
    END IF;
    IF v_qty > v_stack_limit THEN
      RETURN jsonb_build_object('ok', false,
        'error', 'Make room for the full item reward before claiming.');
    END IF;
    INSERT INTO public.inventory AS owned (user_id, item_id, qty)
    VALUES (p_user_id, v_item, v_qty)
    ON CONFLICT (user_id, item_id) DO UPDATE
      SET qty = owned.qty + EXCLUDED.qty, updated_at = v_now
      WHERE owned.qty <= v_stack_limit - EXCLUDED.qty;
    IF NOT FOUND THEN
      -- No quantity or claim advancement occurs when the entire reward cannot fit.
      RETURN jsonb_build_object('ok', false,
        'error', 'Make room for the full item reward before claiming.');
    END IF;
  ELSIF v_day = 4 THEN
    SELECT id INTO v_pet FROM public.pets
    WHERE user_id = p_user_id AND is_active = true AND ran_away = false
    FOR UPDATE;
    -- Keep the reward available until an eligible active Kith can receive it.
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false,
        'error', 'Activate a non-runaway Kith before claiming this XP reward.');
    END IF;
    UPDATE public.pets SET xp = COALESCE(xp, 0) + 100
    WHERE id = v_pet AND user_id = p_user_id;
  END IF;

  -- Keep historical potato_received untouched. Any failure rolls back the reward.
  UPDATE public.daily_login_rewards SET streak = v_streak, last_claimed_at = v_now
  WHERE id = p_user_id;
  RETURN jsonb_build_object('ok', true, 'reward', v_reward, 'streak', v_streak,
    'dayIndex', v_day, 'reset', v_reset);
END;
$$;

-- Source preserved in migration_archive/20261025031316_atomic_rescue_egg.sql
-- BUG-038: deploy this function before the updated rescue route.
-- Pause rescue traffic until all old backend instances have been replaced:
-- old handlers do not participate in the player lock.
-- No existing player rows are rewritten by applying this migration.
CREATE FUNCTION public.grant_rescue_egg(p_user_id uuid, p_egg jsonb, p_base_stats jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_input public.pets%ROWTYPE;
  v_pet public.pets%ROWTYPE;
  v_slot public.hatchery_slots%ROWTYPE;
BEGIN
  -- Same lock order as hatch completion and storage actions.
  PERFORM 1 FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player profile not found.'; END IF;
  PERFORM id FROM public.pets WHERE user_id = p_user_id ORDER BY id FOR UPDATE;

  IF EXISTS (SELECT 1 FROM public.pets WHERE user_id = p_user_id
    AND NOT coalesce(ran_away, false) AND stage::text = 'egg' AND is_rescue_reroll IS TRUE) THEN
    RETURN jsonb_build_object('success', false, 'status_code', 409,
      'error', 'You already have a rescue egg waiting to hatch.');
  END IF;
  IF EXISTS (SELECT 1 FROM public.pets WHERE user_id = p_user_id
    AND NOT coalesce(ran_away, false) AND stage::text IS DISTINCT FROM 'egg') THEN
    RETURN jsonb_build_object('success', false, 'status_code', 400,
      'error', 'You still have a Delta. The rescue egg is only for when every Delta has run away.');
  END IF;

  SELECT * INTO v_slot FROM public.hatchery_slots
    WHERE user_id = p_user_id AND unlocked IS TRUE AND pet_id IS NULL
    ORDER BY slot_index LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'status_code', 400,
      'error', 'No open hatchery slot is available for a rescue egg.');
  END IF;

  IF jsonb_typeof(p_egg) IS DISTINCT FROM 'object'
    OR jsonb_typeof(p_base_stats) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Missing rescue generation data.';
  END IF;
  SELECT * INTO v_input FROM jsonb_populate_record(NULL::public.pets, p_egg);
  -- Only generated identity/traits are accepted; ownership and placement are fixed here.
  INSERT INTO public.pets (
    user_id, name, species, line, stage, energy, hatch_ends_at, is_active, location,
    passive_trait_id, passive_trait_key, hatch_time_alignment,
    growth_strong_stats, growth_weak_stat, mutation_capacity, is_rescue_reroll
  ) VALUES (
    p_user_id, v_input.name, v_input.species, v_input.line, 'egg', 100,
    v_input.hatch_ends_at, false, 'hatchery', v_input.passive_trait_id,
    v_input.passive_trait_key, v_input.hatch_time_alignment,
    v_input.growth_strong_stats, v_input.growth_weak_stat, 1, true
  ) RETURNING * INTO v_pet;
  IF v_pet.species IS DISTINCT FROM v_input.species
    OR v_pet.line IS DISTINCT FROM v_input.line THEN
    RAISE EXCEPTION 'Rescue egg identity was not stored correctly.';
  END IF;

  INSERT INTO public.pet_stats
    (pet_id, base_hp, base_atk, base_def, base_spd, base_magi, base_mana, base_total)
  VALUES (v_pet.id, (p_base_stats->>'hp')::integer, (p_base_stats->>'atk')::integer,
    (p_base_stats->>'def')::integer, (p_base_stats->>'spd')::integer,
    (p_base_stats->>'magi')::integer, (p_base_stats->>'mana')::integer,
    (p_base_stats->>'base_total')::integer)
  ON CONFLICT (pet_id) DO UPDATE SET
    base_hp = EXCLUDED.base_hp, base_atk = EXCLUDED.base_atk,
    base_def = EXCLUDED.base_def, base_spd = EXCLUDED.base_spd,
    base_magi = EXCLUDED.base_magi, base_mana = EXCLUDED.base_mana,
    base_total = EXCLUDED.base_total;

  UPDATE public.hatchery_slots SET pet_id = v_pet.id
    WHERE id = v_slot.id AND user_id = p_user_id AND unlocked IS TRUE AND pet_id IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Hatchery slot is no longer available.'; END IF;
  UPDATE public.pets SET runaway_at = NULL WHERE user_id = p_user_id AND ran_away IS TRUE;

  RETURN jsonb_build_object('success', true, 'pet', to_jsonb(v_pet), 'slot_index', v_slot.slot_index);
END;
$$;

REVOKE ALL ON FUNCTION public.grant_rescue_egg(uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_rescue_egg(uuid, jsonb, jsonb) TO service_role;

-- Only the compatible basket wrapper; no catalog, stock or potion rule changes.
CREATE FUNCTION public.trade_assanti_basket(p_user_id uuid, p_delta_day integer, p_lines jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
DECLARE v_line record; v_result jsonb; v_cost bigint := 0; v_value bigint := 0;
BEGIN
  IF p_user_id IS NULL OR p_delta_day IS NULL OR p_delta_day < 0
    OR jsonb_typeof(p_lines) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid trade basket.' USING ERRCODE='22023';
  END IF;
  IF jsonb_array_length(p_lines) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Invalid trade basket.' USING ERRCODE='22023';
  END IF;
  FOR v_line IN SELECT value AS item FROM jsonb_array_elements(p_lines) LOOP
    IF jsonb_typeof(v_line.item) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Invalid trade basket.' USING ERRCODE='22023';
    END IF;
    IF jsonb_typeof(v_line.item->'slug') IS DISTINCT FROM 'string'
      OR jsonb_typeof(v_line.item->'buy') IS DISTINCT FROM 'number'
      OR jsonb_typeof(v_line.item->'sell') IS DISTINCT FROM 'number'
      OR length(v_line.item->>'slug') NOT BETWEEN 1 AND 100
      OR (v_line.item - 'slug' - 'buy' - 'sell') <> '{}'::jsonb THEN
      RAISE EXCEPTION 'Invalid trade basket.' USING ERRCODE='22023';
    END IF;
    IF (v_line.item->>'buy')::numeric NOT BETWEEN 0 AND 50
      OR (v_line.item->>'sell')::numeric NOT BETWEEN 0 AND 429496729
      OR trunc((v_line.item->>'buy')::numeric) <> (v_line.item->>'buy')::numeric
      OR trunc((v_line.item->>'sell')::numeric) <> (v_line.item->>'sell')::numeric
      OR (v_line.item->>'buy')::numeric + (v_line.item->>'sell')::numeric = 0 THEN
      RAISE EXCEPTION 'Invalid trade basket.' USING ERRCODE='22023';
    END IF;
  END LOOP;
  IF (SELECT count(DISTINCT value->>'slug') FROM jsonb_array_elements(p_lines))
    <> jsonb_array_length(p_lines) THEN
    RAISE EXCEPTION 'Invalid trade basket.' USING ERRCODE='22023';
  END IF;
  -- Match the legacy lock order, once for the entire basket.
  PERFORM 1 FROM public.wallets WHERE user_id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player wallet missing.'; END IF;
  PERFORM public.ensure_assanti_food_day(p_delta_day);
  PERFORM 1 FROM public.assanti_food_days WHERE delta_day=p_delta_day FOR UPDATE;
  FOR v_line IN SELECT * FROM jsonb_to_recordset(p_lines) AS x(slug text,buy numeric,sell numeric) ORDER BY slug LOOP
    IF v_line.buy > 0 THEN
      v_result := public.trade_assanti_food_on_day(p_user_id,v_line.slug,v_line.buy::integer,'purchase',p_delta_day);
      v_cost := v_cost + (v_result->>'cost')::bigint;
    END IF;
  END LOOP;
  FOR v_line IN SELECT * FROM jsonb_to_recordset(p_lines) AS x(slug text,buy numeric,sell numeric) ORDER BY slug LOOP
    IF v_line.sell > 0 THEN
      v_result := public.trade_assanti_food_on_day(p_user_id,v_line.slug,v_line.sell::integer,'sell',p_delta_day);
      v_value := v_value + (v_result->>'value')::bigint;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('ok',true,'cost',v_cost,'value',v_value);
END;
$function$;
REVOKE ALL ON FUNCTION public.trade_assanti_basket(uuid,integer,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.trade_assanti_basket(uuid,integer,jsonb) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
