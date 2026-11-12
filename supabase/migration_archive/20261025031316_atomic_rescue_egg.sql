-- BUG-038: deploy this function before the updated rescue route.
-- Pause rescue traffic until all old backend instances have been replaced:
-- old handlers do not participate in the player lock.
-- No existing player rows are rewritten by applying this migration.
BEGIN;

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
COMMIT;
