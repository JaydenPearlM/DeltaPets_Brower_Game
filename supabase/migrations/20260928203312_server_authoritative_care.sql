BEGIN;

-- Reads and backend writes remain available. Browser ownership is not write authority.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON public.wallets, public.wallet_ledger, public.inventory FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.spend_wallet(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spend_wallet(uuid, integer, integer) TO service_role;

CREATE TABLE public.assanti_food_claims (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_claimed_at timestamptz NOT NULL
);
ALTER TABLE public.assanti_food_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.assanti_food_claims FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.assanti_food_claims TO authenticated;
GRANT ALL ON public.assanti_food_claims TO service_role;
CREATE POLICY assanti_food_claims_read_own ON public.assanti_food_claims
FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

-- These already exist in reference data. Do not overwrite names/effects or grant stock.
INSERT INTO public.item_defs (slug, name, type, description, rarity, stack_limit, effects)
VALUES
  ('kithna-food-pack', 'Kithna Food Pack', 'care', 'A simple meal for restoring hunger.', 1, 99, '{"careCategory":"food"}'),
  ('soft-cleaning-brush', 'Soft Cleaning Brush', 'care', 'A gentle brush for restoring clean.', 1, 99, '{"careCategory":"soap"}'),
  ('spark-jingle-toy', 'Spark Jingle Toy', 'care', 'A tiny toy for restoring mood.', 1, 99, '{"careCategory":"toy"}'),
  ('moon-nap-pillow', 'Moon Nap Pillow', 'care', 'A soft pillow for restoring comfort.', 1, 99, '{"careCategory":"bed"}')
ON CONFLICT (slug) DO NOTHING;

-- Keep existing client party/location updates, but close direct care/cooldown edits.
CREATE FUNCTION public.guard_server_care() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Pet creation requires the backend.' USING ERRCODE = '42501';
    END IF;
    IF ROW(NEW.hunger, NEW.clean, NEW.happy, NEW.comfort, NEW.rest, NEW.energy,
           NEW.bond, NEW.neglect_hours, NEW.ran_away, NEW.runaway_at,
           NEW.last_care_decay_at, NEW.cd_feed_ends_at, NEW.cd_clean_ends_at,
           NEW.cd_play_ends_at, NEW.cd_bond_ends_at)
       IS DISTINCT FROM
       ROW(OLD.hunger, OLD.clean, OLD.happy, OLD.comfort, OLD.rest, OLD.energy,
           OLD.bond, OLD.neglect_hours, OLD.ran_away, OLD.runaway_at,
           OLD.last_care_decay_at, OLD.cd_feed_ends_at, OLD.cd_clean_ends_at,
           OLD.cd_play_ends_at, OLD.cd_bond_ends_at) THEN
      RAISE EXCEPTION 'Care updates require the backend.' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_server_care() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_server_care() TO service_role;
CREATE TRIGGER guard_server_care BEFORE INSERT OR UPDATE ON public.pets
FOR EACH ROW EXECUTE FUNCTION public.guard_server_care();

-- The backend computes the existing TypeScript care/decay rules. A snapshot check
-- under lock prevents a stale calculation overwriting another successful action.
CREATE FUNCTION public.perform_owned_care(
  p_user_id uuid, p_pet_id uuid, p_action text, p_expected jsonb, p_patch jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v_pet public.pets%ROWTYPE;
  v_next public.pets%ROWTYPE;
  v_item_id uuid;
  v_slug text;
  v_category text;
  v_key text;
  v_value jsonb;
  v_cooldown timestamptz;
BEGIN
  IF p_action IS NULL OR p_action NOT IN ('feed', 'clean', 'play', 'pet', 'bond')
     OR p_expected IS NULL OR p_patch IS NULL THEN
    RAISE EXCEPTION 'Invalid care action.' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_pet FROM public.pets
  WHERE id = p_pet_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND OR v_pet.stage = 'egg' THEN RAISE EXCEPTION 'CARE_NO_PET'; END IF;
  IF v_pet.ran_away THEN RAISE EXCEPTION 'CARE_RUNAWAY'; END IF;

  FOR v_key, v_value IN SELECT * FROM jsonb_each(p_expected) LOOP
    IF v_key IN ('last_care_decay_at', 'runaway_at', 'cd_feed_ends_at',
                 'cd_clean_ends_at', 'cd_play_ends_at', 'cd_bond_ends_at') THEN
      IF ((to_jsonb(v_pet)->>v_key)::timestamptz)
           IS DISTINCT FROM ((p_expected->>v_key)::timestamptz) THEN
        RAISE EXCEPTION 'CARE_STALE';
      END IF;
    ELSIF (to_jsonb(v_pet)->v_key) IS DISTINCT FROM v_value THEN
      RAISE EXCEPTION 'CARE_STALE';
    END IF;
  END LOOP;

  v_cooldown := CASE p_action
    WHEN 'clean' THEN v_pet.cd_clean_ends_at
    WHEN 'play' THEN v_pet.cd_play_ends_at
    WHEN 'bond' THEN v_pet.cd_bond_ends_at ELSE NULL END;
  IF v_cooldown > clock_timestamp() THEN RAISE EXCEPTION 'CARE_COOLDOWN'; END IF;
  v_category := CASE p_action WHEN 'feed' THEN 'food' WHEN 'clean' THEN 'soap'
    WHEN 'play' THEN 'toy' WHEN 'pet' THEN 'bed' ELSE NULL END;
  IF v_category IS NOT NULL THEN
    SELECT i.item_id, d.slug INTO v_item_id, v_slug
    FROM public.inventory i JOIN public.item_defs d ON d.id = i.item_id
    WHERE i.user_id = p_user_id AND i.qty > 0 AND d.type = 'care'
      AND d.effects->>'careCategory' = v_category
    ORDER BY d.slug LIMIT 1 FOR UPDATE OF i;
    IF NOT FOUND THEN RAISE EXCEPTION 'CARE_NO_ITEM'; END IF;
    UPDATE public.inventory SET qty = qty - 1, updated_at = now()
    WHERE user_id = p_user_id AND item_id = v_item_id AND qty > 0;
    IF NOT FOUND THEN RAISE EXCEPTION 'CARE_NO_ITEM'; END IF;
  END IF;

  v_next := jsonb_populate_record(v_pet, p_patch);
  UPDATE public.pets SET
    hunger = v_next.hunger, clean = v_next.clean, happy = v_next.happy,
    comfort = v_next.comfort, rest = v_next.rest, energy = v_next.energy,
    bond = v_next.bond, neglect_hours = v_next.neglect_hours,
    ran_away = v_next.ran_away, runaway_at = v_next.runaway_at,
    last_care_decay_at = v_next.last_care_decay_at,
    cd_feed_ends_at = v_next.cd_feed_ends_at, cd_clean_ends_at = v_next.cd_clean_ends_at,
    cd_play_ends_at = v_next.cd_play_ends_at, cd_bond_ends_at = v_next.cd_bond_ends_at
  WHERE id = p_pet_id AND user_id = p_user_id RETURNING * INTO v_next;
  IF NOT FOUND THEN RAISE EXCEPTION 'CARE_NO_PET'; END IF;
  RETURN jsonb_build_object('pet', to_jsonb(v_next), 'consumed_slug', v_slug);
END;
$$;
REVOKE ALL ON FUNCTION public.perform_owned_care(uuid, uuid, text, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.perform_owned_care(uuid, uuid, text, jsonb, jsonb) TO service_role;

CREATE FUNCTION public.claim_assanti_daily_food(p_user_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v_last timestamptz;
  v_item record;
  v_count integer := 0;
BEGIN
  -- The same wallet-first lock order as merchant/package operations.
  PERFORM 1 FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player wallet missing.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.player_quests
    WHERE user_id = p_user_id AND quest_key = 'assanti_food_trouble' AND status = 'completed') THEN
    RAISE EXCEPTION 'Daily Food is still locked.';
  END IF;
  SELECT last_claimed_at INTO v_last FROM public.assanti_food_claims WHERE user_id = p_user_id;
  IF v_last > now() - interval '24 hours' THEN
    RAISE EXCEPTION 'Daily Food is already claimed.';
  END IF;
  FOR v_item IN SELECT id, stack_limit FROM public.item_defs
    WHERE slug IN ('alpha-meat', 'alpha-vegetables') AND type = 'care' ORDER BY slug
  LOOP
    IF v_item.stack_limit < 10 THEN RAISE EXCEPTION 'Not enough room for the full food reward.'; END IF;
    INSERT INTO public.inventory AS owned (user_id, item_id, qty)
    VALUES (p_user_id, v_item.id, 10)
    ON CONFLICT (user_id, item_id) DO UPDATE SET qty = owned.qty + 10, updated_at = now()
    WHERE owned.qty <= v_item.stack_limit - 10;
    IF NOT FOUND THEN RAISE EXCEPTION 'Not enough room for the full food reward.'; END IF;
    v_count := v_count + 1;
  END LOOP;
  IF v_count <> 2 THEN RAISE EXCEPTION 'Food definitions missing.'; END IF;
  INSERT INTO public.assanti_food_claims (user_id, last_claimed_at) VALUES (p_user_id, now())
  ON CONFLICT (user_id) DO UPDATE SET last_claimed_at = EXCLUDED.last_claimed_at;
  RETURN jsonb_build_object('claimed', true, 'next_claim_at', now() + interval '24 hours');
END;
$$;
REVOKE ALL ON FUNCTION public.claim_assanti_daily_food(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_assanti_daily_food(uuid) TO service_role;

-- Preserve the existing signature and claim history. Never regrant old local rewards.
CREATE OR REPLACE FUNCTION public.open_closed_alpha_care_package(p_user_id uuid)
RETURNS TABLE(opened boolean, dots integer)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v_dots integer;
  v_package uuid;
  v_item record;
  v_count integer := 0;
BEGIN
  SELECT w.dots INTO v_dots FROM public.wallets w WHERE w.user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player wallet missing.'; END IF;
  IF EXISTS (SELECT 1 FROM public.wallet_ledger
    WHERE user_id = p_user_id AND reason = 'closed_alpha_care_package') THEN
    RETURN QUERY SELECT false, v_dots;
    RETURN;
  END IF;
  SELECT id INTO v_package FROM public.item_defs WHERE slug = 'closed-alpha-care-package';
  IF v_package IS NULL THEN RAISE EXCEPTION 'Care package definition missing.'; END IF;
  UPDATE public.inventory SET qty = qty - 1, updated_at = now()
  WHERE user_id = p_user_id AND item_id = v_package AND qty > 0;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, v_dots;
    RETURN;
  END IF;
  FOR v_item IN SELECT id, stack_limit FROM public.item_defs
    WHERE slug IN ('alpha-meat', 'alpha-vegetables', 'soft-cleaning-brush',
                  'spark-jingle-toy', 'moon-nap-pillow') AND type = 'care' ORDER BY slug
  LOOP
    IF v_item.stack_limit < 50 THEN RAISE EXCEPTION 'Not enough room for the full care package.'; END IF;
    INSERT INTO public.inventory AS owned (user_id, item_id, qty)
    VALUES (p_user_id, v_item.id, 50)
    ON CONFLICT (user_id, item_id) DO UPDATE SET qty = owned.qty + 50, updated_at = now()
    WHERE owned.qty <= v_item.stack_limit - 50;
    IF NOT FOUND THEN RAISE EXCEPTION 'Not enough room for the full care package.'; END IF;
    v_count := v_count + 1;
  END LOOP;
  IF v_count <> 5 THEN RAISE EXCEPTION 'Care definitions missing.'; END IF;
  UPDATE public.wallets w SET dots = w.dots + 1000, updated_at = now()
  WHERE w.user_id = p_user_id RETURNING w.dots INTO v_dots;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player wallet missing.'; END IF;
  INSERT INTO public.wallet_ledger (user_id, currency, delta, reason)
  VALUES (p_user_id, 'dots', 1000, 'closed_alpha_care_package');
  RETURN QUERY SELECT true, v_dots;
END;
$$;
REVOKE ALL ON FUNCTION public.open_closed_alpha_care_package(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_closed_alpha_care_package(uuid) TO service_role;

COMMIT;
