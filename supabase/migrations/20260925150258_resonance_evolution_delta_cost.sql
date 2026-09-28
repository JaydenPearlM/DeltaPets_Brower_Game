-- Local migration: apply separately before enabling level-15 evolution.
-- Adds the approved Rare Voidborne Delta. No level-cap, drop-rate,
-- existing item, or player-data changes.
BEGIN;

INSERT INTO public.item_defs (slug, name, type, description, rarity, effects)
VALUES (
  'voidborne-delta',
  'Voidborne Delta',
  'material',
  'A Delta symbol infused with Voidborne energy. Used for Voidborne evolution.',
  3,
  '{"element": "null_element"}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

CREATE FUNCTION public.commit_resonance_evolution(
  p_user_id uuid, p_pet_id uuid, p_species text, p_next_name text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_pet public.pets%ROWTYPE;
  v_item_id uuid;
  v_slug text;
  v_cost integer;
  v_previous_hp integer;
  v_previous_hp_max integer;
BEGIN
  -- Lock first so repeated requests cannot charge for the same evolution twice.
  SELECT * INTO v_pet FROM public.pets
    WHERE id = p_pet_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kith not found.');
  END IF;
  IF v_pet.stage::text <> 'hatchling' OR v_pet.ran_away THEN
    RETURN jsonb_build_object('success', false, 'error', 'This Kith is not an available hatchling.');
  END IF;
  IF v_pet.level IS NULL OR v_pet.level < 15 THEN
    RETURN jsonb_build_object('success', false, 'error', 'This Kith must be level 15 or higher before Resonance Evolution.');
  END IF;
  IF v_pet.hp_cur IS NULL OR v_pet.hp_cur <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'This Kith must be conscious before Resonance Evolution.');
  END IF;
  -- The authenticated server resolves the name from the species registry.
  IF v_pet.species IS DISTINCT FROM p_species OR p_species IS NULL
     OR p_next_name IS NULL OR btrim(p_next_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Evolution identity changed. Refresh and try again.');
  END IF;

  IF v_pet.line::text IN ('null_element', 'voidborne') THEN
    v_slug := 'voidborne-delta';
    v_cost := 15;
  ELSIF v_pet.line::text IN ('water', 'fire', 'earth', 'air', 'ice', 'storm', 'light', 'shadow') THEN
    v_slug := v_pet.line::text || '-delta';
    v_cost := 10;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'This element has no configured evolution Delta.');
  END IF;

  SELECT id INTO v_item_id FROM public.item_defs WHERE slug = v_slug;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'The matching evolution Delta is not configured.');
  END IF;

  -- This conditional update also serializes competing charges for different pets.
  UPDATE public.inventory SET qty = qty - v_cost
    WHERE user_id = p_user_id AND item_id = v_item_id AND qty >= v_cost;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error',
      format('Evolution requires %s matching %s items.', v_cost, v_slug));
  END IF;

  v_previous_hp := v_pet.hp_cur;
  v_previous_hp_max := v_pet.hp_max;
  UPDATE public.pets SET stage = 'lowform', name = p_next_name, hp_cur = 1
    WHERE id = p_pet_id AND user_id = p_user_id
    RETURNING * INTO v_pet;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evolution could not be saved';
  END IF;
  -- An exception rolls back the item charge as well as the pet update.
  RETURN jsonb_build_object(
    'success', true,
    'pet', jsonb_build_object(
      'id', v_pet.id, 'name', v_pet.name, 'species', v_pet.species,
      'line', v_pet.line, 'stage', v_pet.stage, 'hp_cur', v_pet.hp_cur,
      'hp_max', v_pet.hp_max, 'xp', v_pet.xp
    ),
    'previous_hp', v_previous_hp, 'previous_hp_max', v_previous_hp_max,
    'consumed_deltas', v_cost, 'delta_slug', v_slug
  );
END;
$$;

-- Player browsers must use the authenticated API, never supply a name/user here.
REVOKE ALL ON FUNCTION public.commit_resonance_evolution(uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_resonance_evolution(uuid, uuid, text, text)
  TO service_role;

COMMIT;
