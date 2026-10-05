-- Prepared locally; not applied to a live database by this change.
-- Deploy before the backend begins calling claim_daily_login_reward.
BEGIN;

-- One transaction owns both the reward and its UTC-day claim marker.
-- Lock the profile first, matching the account lock order used by hatch/storage.
CREATE FUNCTION public.claim_daily_login_reward(p_user_id uuid)
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
  v_pet uuid;
  v_award uuid;
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
      v_reward := '{"kind":"ribbon","label":"Alpha Tester Ribbon"}'::jsonb;
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
    SELECT id INTO STRICT v_item FROM public.item_defs WHERE slug = v_slug;
    INSERT INTO public.inventory AS owned (user_id, item_id, qty)
    VALUES (p_user_id, v_item, v_qty)
    ON CONFLICT (user_id, item_id) DO UPDATE
      SET qty = owned.qty + EXCLUDED.qty, updated_at = v_now;
  ELSIF v_day = 4 THEN
    SELECT id INTO v_pet FROM public.pets
    WHERE user_id = p_user_id AND is_active = true AND ran_away = false
    FOR UPDATE;
    -- Match the existing XP helper: no active eligible pet is a no-op reward.
    IF FOUND THEN
      UPDATE public.pets SET xp = COALESCE(xp, 0) + 100
      WHERE id = v_pet AND user_id = p_user_id;
    END IF;
  ELSE
    INSERT INTO public.awards (key, name, type, rarity, description)
    VALUES ('alpha_tester', 'Alpha Tester', 'ribbon', 'special',
      'Awarded for participating in the Alpha deployment testing.')
    ON CONFLICT (key) DO UPDATE SET
      name = EXCLUDED.name, type = EXCLUDED.type,
      rarity = EXCLUDED.rarity, description = EXCLUDED.description
    RETURNING id INTO v_award;

    INSERT INTO public.trainer_awards (user_id, award_id, earned_at, context)
    VALUES (p_user_id, v_award, v_now,
      '{"source":"daily_login_rewards","deployment":"alpha"}'::jsonb)
    ON CONFLICT (user_id, award_id) DO UPDATE SET
      earned_at = EXCLUDED.earned_at, context = EXCLUDED.context;
  END IF;

  -- Keep historical potato_received untouched. Any failure rolls back the reward.
  UPDATE public.daily_login_rewards SET streak = v_streak, last_claimed_at = v_now
  WHERE id = p_user_id;
  RETURN jsonb_build_object('ok', true, 'reward', v_reward, 'streak', v_streak,
    'dayIndex', v_day, 'reset', v_reset);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_daily_login_reward(uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_login_reward(uuid) TO service_role;

-- A browser must not rewind or delete its marker to claim a second reward.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON public.daily_login_rewards FROM PUBLIC, anon, authenticated;

COMMIT;
