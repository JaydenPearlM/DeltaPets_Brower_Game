-- Prepared for review only. Apply separately before enabling Favorites.
BEGIN;

ALTER TABLE public.pets ADD COLUMN is_favorite boolean NOT NULL DEFAULT false;

-- Row locks serialize this guard with Favorite toggles, including service-role
-- writes, direct Data API writes and existing loss/cleanup functions.
CREATE FUNCTION public.protect_favorite_kith()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_favorite THEN
      RAISE EXCEPTION 'This Kith is favorited and protected. Remove its star before a destructive action.';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.is_favorite AND (
    NEW.id IS DISTINCT FROM OLD.id OR
    NEW.user_id IS DISTINCT FROM OLD.user_id OR
    NEW.ran_away OR NEW.runaway_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'This Kith is favorited and protected. Remove its star before a destructive action.';
  END IF;
  IF NEW.is_favorite AND (NEW.ran_away OR NEW.runaway_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Recover this Kith before marking it as a favorite.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_favorite_kith
BEFORE UPDATE OR DELETE ON public.pets
FOR EACH ROW EXECUTE FUNCTION public.protect_favorite_kith();
REVOKE ALL ON FUNCTION public.protect_favorite_kith() FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.set_kith_favorite(p_user_id uuid, p_pet_id uuid, p_favorite boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_pet public.pets%ROWTYPE;
BEGIN
  IF p_user_id IS NULL OR p_pet_id IS NULL OR p_favorite IS NULL THEN
    RAISE EXCEPTION 'Invalid favorite update.';
  END IF;
  SELECT * INTO v_pet FROM public.pets
    WHERE id = p_pet_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Kith not found.'; END IF;
  IF p_favorite AND (v_pet.ran_away OR v_pet.runaway_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Recover this Kith before marking it as a favorite.';
  END IF;
  UPDATE public.pets SET is_favorite = p_favorite
    WHERE id = p_pet_id AND user_id = p_user_id;
  RETURN p_favorite;
END;
$$;
REVOKE ALL ON FUNCTION public.set_kith_favorite(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_kith_favorite(uuid, uuid, boolean) TO service_role;

-- Preserve the development reset's existing scope, but make its game-data
-- phase atomic. The Express route still enforces development mode and deletes
-- the auth login only after this transaction succeeds.
CREATE FUNCTION public.reset_test_account_game_data(p_user_id uuid, p_email text, p_confirm text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_table text; v_pet_ids uuid[];
BEGIN
  IF p_user_id IS NULL OR p_confirm IS DISTINCT FROM 'RESET_MY_TEST_ACCOUNT'
    OR p_email IS NULL OR p_email !~* '^jaydenauthentication6790\+test[0-9]+@gmail\.com$'
  THEN RAISE EXCEPTION 'Invalid test account reset.'; END IF;
  -- Same rows as the old route; locks compete with set_kith_favorite.
  PERFORM 1 FROM public.pets WHERE user_id = p_user_id ORDER BY id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.pets WHERE user_id = p_user_id AND is_favorite) THEN
    RAISE EXCEPTION 'This account has favorited Kith. Remove their stars before resetting it.';
  END IF;
  SELECT array_agg(id) INTO v_pet_ids FROM public.pets WHERE user_id = p_user_id;
  DELETE FROM public.signup_trigger_errors WHERE user_id = p_user_id OR email = p_email;
  DELETE FROM public.battle_run_fights WHERE run_id IN
    (SELECT id FROM public.battle_runs WHERE user_id = p_user_id);
  DELETE FROM public.pve_instability_fights WHERE run_id IN
    (SELECT id FROM public.pve_instability_runs WHERE user_id = p_user_id);
  FOREACH v_table IN ARRAY ARRAY['pet_mutations','pet_awards','pet_element_affinities',
    'pet_elements','pet_skills','pet_stat_allocations','pet_stats'] LOOP
    EXECUTE format('DELETE FROM public.%I WHERE pet_id = ANY($1)', v_table) USING v_pet_ids;
  END LOOP;
  DELETE FROM public.daily_login_rewards WHERE id = p_user_id;
  FOREACH v_table IN ARRAY ARRAY['trainer_awards','hatchery_shelf_slots','hatchery_slots',
    'party_slots','home_objects','inventory','eggs','wallet_ledger','battle_runs',
    'pve_instability_runs','pve_active_buffs','pve_research_stats','daily_care',
    'user_resources','wallets','pets'] LOOP
    EXECUTE format('DELETE FROM public.%I WHERE user_id = $1', v_table) USING p_user_id;
  END LOOP;
  DELETE FROM public.profiles WHERE user_id = p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.reset_test_account_game_data(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_test_account_game_data(uuid, text, text) TO service_role;

COMMIT;
