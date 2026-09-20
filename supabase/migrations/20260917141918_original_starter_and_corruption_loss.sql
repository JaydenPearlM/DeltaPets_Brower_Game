-- Local migration only. No historical starter inference or corruption backfill.
BEGIN;

ALTER TABLE public.eggs
  ADD COLUMN is_original_starter boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX eggs_one_original_starter_per_user
  ON public.eggs (user_id) WHERE is_original_starter;

-- Clients may still use legacy egg rows, but cannot create or change provenance.
ALTER POLICY eggs_write_own ON public.eggs
  USING (user_id = auth.uid() AND NOT is_original_starter)
  WITH CHECK (user_id = auth.uid() AND NOT is_original_starter);

ALTER TABLE public.trainer_progression
  ADD COLUMN corrupted_eggs_lost integer NOT NULL DEFAULT 0
  CHECK (corrupted_eggs_lost >= 0);

-- Only the authenticated server calls this function. Species, element, traits,
-- timer and base stats come from the existing validated starter definitions.
CREATE FUNCTION public.ensure_original_starter(
  p_user_id uuid, p_pet jsonb, p_stats jsonb, p_starter_names text[]
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_record public.eggs%ROWTYPE;
  v_pet public.pets%ROWTYPE;
  v_input public.pets%ROWTYPE;
BEGIN
  -- A durable per-player lock serializes simultaneous first requests.
  SELECT * INTO v_profile FROM public.profiles
    WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player profile not found'; END IF;

  SELECT * INTO v_record FROM public.eggs
    WHERE user_id = p_user_id AND is_original_starter;
  IF FOUND THEN
    SELECT * INTO v_pet FROM public.pets
      WHERE id = v_record.pet_id AND user_id = p_user_id;
    RETURN jsonb_build_object('existing', true, 'pet', to_jsonb(v_pet),
      'resolved_line', v_record.starter_element);
  END IF;

  -- Existing pets are returned for compatibility, never used to invent history.
  SELECT * INTO v_pet FROM public.pets
    WHERE user_id = p_user_id AND name = ANY(p_starter_names)
    ORDER BY created_at, id LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('existing', true, 'pet', to_jsonb(v_pet),
      'resolved_line', v_pet.line);
  END IF;
  IF v_profile.intro_seen OR v_profile.intro_cutscene_completed
    OR EXISTS (SELECT 1 FROM public.pets WHERE user_id = p_user_id)
    OR EXISTS (SELECT 1 FROM public.eggs WHERE user_id = p_user_id)
    OR EXISTS (SELECT 1 FROM public.user_kith_discoveries WHERE user_id = p_user_id)
  THEN
    RAISE EXCEPTION 'Original starter history unavailable; cannot create a replacement';
  END IF;

  v_input := jsonb_populate_record(NULL::public.pets, p_pet);
  IF v_input.user_id IS DISTINCT FROM p_user_id
    OR v_input.name IS DISTINCT FROM 'Prismatic Egg'
    OR v_input.stage IS DISTINCT FROM 'egg'::public.pet_stage
    OR v_input.species IS NULL OR v_input.line IS NULL
    OR v_input.hatch_ends_at IS NULL
  THEN RAISE EXCEPTION 'Invalid original starter payload'; END IF;

  INSERT INTO public.pets (
    user_id, name, species, rarity, line, stage, energy, hatch_ends_at,
    is_active, location, personality_key, passive_trait_id, passive_trait_key,
    hatch_time_alignment, growth_strong_stats, growth_weak_stat, mutation_capacity
  ) VALUES (
    p_user_id, 'Prismatic Egg', v_input.species, 'epic', v_input.line, 'egg',
    100, v_input.hatch_ends_at, false, 'hatchery', v_input.personality_key,
    v_input.passive_trait_id, v_input.passive_trait_key,
    v_input.hatch_time_alignment, v_input.growth_strong_stats,
    v_input.growth_weak_stat, 1
  ) RETURNING * INTO v_pet;

  INSERT INTO public.pet_stats
    (pet_id, base_hp, base_atk, base_magi, base_def, base_spd, base_mana, base_total)
  VALUES (v_pet.id, (p_stats->>'hp')::integer, (p_stats->>'atk')::integer,
    (p_stats->>'magi')::integer, (p_stats->>'def')::integer,
    (p_stats->>'spd')::integer, (p_stats->>'mana')::integer,
    (p_stats->>'base_total')::integer);

  INSERT INTO public.eggs
    (user_id, starter_element, hatch_ready_at, pet_id, is_original_starter)
  VALUES (p_user_id, v_pet.line, v_pet.hatch_ends_at, v_pet.id, true);

  RETURN jsonb_build_object('existing', false, 'pet', to_jsonb(v_pet),
    'resolved_line', v_pet.line);
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_original_starter(uuid, jsonb, jsonb, text[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_original_starter(uuid, jsonb, jsonb, text[])
  TO service_role;

CREATE FUNCTION public.consume_corrupted_egg(p_user_id uuid, p_egg_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_egg public.pets%ROWTYPE;
BEGIN
  -- Competes with the normal hatch UPDATE on the same pet row. A retry or a
  -- normal hatch that won the race cannot be counted as another loss.
  SELECT * INTO v_egg FROM public.pets
    WHERE id = p_egg_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_egg.stage <> 'egg' OR v_egg.hatch_ends_at IS NULL
    OR v_egg.hatch_ends_at > now()
  THEN RETURN false; END IF;

  INSERT INTO public.trainer_progression (user_id, corrupted_eggs_lost)
  VALUES (p_user_id, 1)
  ON CONFLICT (user_id) DO UPDATE
    SET corrupted_eggs_lost = public.trainer_progression.corrupted_eggs_lost + 1,
        updated_at = now();

  UPDATE public.hatchery_slots SET pet_id = NULL
    WHERE user_id = p_user_id AND pet_id = p_egg_id;
  DELETE FROM public.pets WHERE id = p_egg_id AND user_id = p_user_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_corrupted_egg(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_corrupted_egg(uuid, uuid) TO service_role;

COMMIT;
