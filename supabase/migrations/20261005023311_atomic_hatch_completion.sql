-- REQUIRED ROLLOUT: pause hatch traffic before this migration and keep it paused
-- until the new backend is deployed. The old HTTP handler performs writes before
-- its RPC; retaining successful legacy calls would also duplicate Delta rewards.
-- Data-compatible: no existing pets, eggs, stats or balances are rewritten.
BEGIN;
CREATE OR REPLACE FUNCTION "public"."hatch_pet"("p_user_id" "uuid", "p_egg_id" "uuid", "p_iv_hp" integer, "p_iv_atk" integer, "p_iv_def" integer, "p_iv_spd" integer, "p_iv_magi" integer, "p_iv_mana" integer, "p_gender" "text", "p_personality_id" "uuid", "p_personality_key" "text", "p_hatchling_name" "text", "p_description" "text", "p_growth_strong_stats" "text"[], "p_growth_weak_stat" "text", "p_hatch_time_alignment" "text", "p_line" "public"."elemental_line") RETURNS TABLE(pet_row public.pets, success boolean, error_message text)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'Hatch endpoint upgrade required; use the atomic hatch context signature';
END;
$$;

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

REVOKE ALL ON FUNCTION public.hatch_pet(uuid, uuid, integer, integer, integer, integer, integer, integer, text, uuid, text, text, text, text[], text, text, public.elemental_line) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hatch_pet(uuid, uuid, integer, integer, integer, integer, integer, integer, text, uuid, text, text, text, text[], text, text, public.elemental_line) TO service_role;
REVOKE ALL ON FUNCTION public.hatch_pet(uuid, uuid, integer, integer, integer, integer, integer, integer, text, uuid, text, text, text, text[], text, text, public.elemental_line, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hatch_pet(uuid, uuid, integer, integer, integer, integer, integer, integer, text, uuid, text, text, text, text[], text, text, public.elemental_line, jsonb) TO service_role;
COMMIT;
