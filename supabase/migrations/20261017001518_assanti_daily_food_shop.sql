BEGIN;

-- Local forward-only migration. Apply before deploying the updated shop.
-- Existing item IDs, inventory, wallets and claim history are retained.
CREATE TABLE public.assanti_food_catalog (
  slug text PRIMARY KEY REFERENCES public.item_defs(slug),
  price integer NOT NULL CHECK (price BETWEEN 1 AND 100),
  hunger integer NOT NULL CHECK (hunger BETWEEN 1 AND 50),
  permanent boolean NOT NULL DEFAULT false
);
CREATE TABLE public.assanti_food_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  minimum_dots integer NOT NULL CHECK (minimum_dots >= 0),
  maximum_dots integer NOT NULL CHECK (maximum_dots >= minimum_dots)
);
INSERT INTO public.assanti_food_config VALUES (true, 1000, 2000);
CREATE TABLE public.assanti_food_days (
  delta_day integer PRIMARY KEY CHECK (delta_day >= 0),
  slugs text[] NOT NULL CHECK (cardinality(slugs) BETWEEN 8 AND 12),
  starting_dots integer NOT NULL CHECK (starting_dots >= 0),
  dots integer NOT NULL CHECK (dots >= 0)
);
ALTER TABLE public.assanti_food_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assanti_food_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assanti_food_days ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.assanti_food_catalog, public.assanti_food_config, public.assanti_food_days
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.assanti_food_catalog, public.assanti_food_config, public.assanti_food_days TO service_role;

INSERT INTO public.item_defs (slug, name, type, description, rarity, stack_limit, effects) VALUES
  ('alpha-meat', 'Basic Meat', 'care', 'Fresh cuts harvested from Assanti''s meat trees.', 1, 99, '{"careCategory":"food","hunger":15}'::jsonb),
  ('alpha-vegetables', 'Basic Vegetables', 'care', 'Simple vegetables grown on Assanti''s farm.', 1, 99, '{"careCategory":"food","hunger":15}'::jsonb),
  ('carrot', 'Carrot', 'care', 'A crunchy root vegetable and simple snack.', 1, 99, '{"careCategory":"food","hunger":9}'::jsonb),
  ('potato', 'Potato', 'care', 'A filling staple vegetable.', 1, 99, '{"careCategory":"food","hunger":12}'::jsonb),
  ('tomato', 'Tomato', 'care', 'A juicy red vegetable with a fresh bite.', 1, 99, '{"careCategory":"food","hunger":8}'::jsonb),
  ('corn', 'Corn', 'care', 'Sweet kernels that make an easy everyday meal.', 1, 99, '{"careCategory":"food","hunger":11}'::jsonb),
  ('lettuce', 'Lettuce', 'care', 'Fresh leafy greens for a light snack.', 1, 99, '{"careCategory":"food","hunger":7}'::jsonb),
  ('broccoli', 'Broccoli', 'care', 'A healthy green vegetable.', 1, 99, '{"careCategory":"food","hunger":10}'::jsonb),
  ('green-peas', 'Green Peas', 'care', 'A small serving of fresh green peas.', 1, 99, '{"careCategory":"food","hunger":9}'::jsonb),
  ('green-beans', 'Green Beans', 'care', 'Crisp green beans with a mild flavor.', 1, 99, '{"careCategory":"food","hunger":9}'::jsonb),
  ('pumpkin', 'Pumpkin', 'care', 'A thick slice of sweet, filling pumpkin.', 1, 99, '{"careCategory":"food","hunger":13}'::jsonb),
  ('mushroom', 'Mushroom', 'care', 'A simple earthy mushroom.', 1, 99, '{"careCategory":"food","hunger":8}'::jsonb),
  ('cucumber', 'Cucumber', 'care', 'A cool and refreshing vegetable snack.', 1, 99, '{"careCategory":"food","hunger":7}'::jsonb),
  ('bell-pepper', 'Bell Pepper', 'care', 'A crunchy, colorful pepper with a sweet bite.', 1, 99, '{"careCategory":"food","hunger":8}'::jsonb),
  ('sweet-potato', 'Sweet Potato', 'care', 'A naturally sweet and filling root vegetable.', 1, 99, '{"careCategory":"food","hunger":14}'::jsonb),
  ('raw-beef', 'Raw Beef', 'care', 'A basic cut of beef sold as inexpensive pet food.', 1, 99, '{"careCategory":"food","hunger":16}'::jsonb),
  ('raw-chicken', 'Raw Chicken', 'care', 'A basic portion of chicken sold as inexpensive pet food.', 1, 99, '{"careCategory":"food","hunger":15}'::jsonb),
  ('raw-fish', 'Raw Fish', 'care', 'A fresh whole fish for hungry Kith.', 1, 99, '{"careCategory":"food","hunger":15}'::jsonb),
  ('turkey', 'Turkey', 'care', 'A basic portion of turkey meat.', 1, 99, '{"careCategory":"food","hunger":15}'::jsonb),
  ('pork', 'Pork', 'care', 'A basic cut of pork.', 1, 99, '{"careCategory":"food","hunger":16}'::jsonb),
  ('egg', 'Egg', 'care', 'A simple egg that makes a quick snack.', 1, 99, '{"careCategory":"food","hunger":9}'::jsonb),
  ('apple', 'Apple', 'care', 'A crisp everyday fruit that fills a little hunger.', 1, 99, '{"careCategory":"food","hunger":10}'::jsonb),
  ('wild-berries', 'Wild Berries', 'care', 'A small handful of sweet berries.', 1, 99, '{"careCategory":"food","hunger":8}'::jsonb),
  ('rice', 'Rice', 'care', 'A plain bowl of cooked rice.', 1, 99, '{"careCategory":"food","hunger":13}'::jsonb),
  ('bread', 'Bread', 'care', 'A simple loaf slice that settles hunger.', 1, 99, '{"careCategory":"food","hunger":12}'::jsonb)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name,
  effects = public.item_defs.effects || EXCLUDED.effects, updated_at = now()
WHERE public.item_defs.type = 'care';

INSERT INTO public.assanti_food_catalog (slug, price, hunger, permanent) VALUES
  ('alpha-meat', 5, 15, true),
  ('alpha-vegetables', 5, 15, true),
  ('carrot', 3, 9, false),
  ('potato', 4, 12, false),
  ('tomato', 3, 8, false),
  ('corn', 4, 11, false),
  ('lettuce', 3, 7, false),
  ('broccoli', 4, 10, false),
  ('green-peas', 3, 9, false),
  ('green-beans', 3, 9, false),
  ('pumpkin', 5, 13, false),
  ('mushroom', 3, 8, false),
  ('cucumber', 3, 7, false),
  ('bell-pepper', 3, 8, false),
  ('sweet-potato', 5, 14, false),
  ('raw-beef', 6, 16, false),
  ('raw-chicken', 5, 15, false),
  ('raw-fish', 5, 15, false),
  ('turkey', 5, 15, false),
  ('pork', 6, 16, false),
  ('egg', 3, 9, false),
  ('apple', 4, 10, false),
  ('wild-berries', 3, 8, false),
  ('rice', 5, 13, false),
  ('bread', 4, 12, false);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.assanti_food_catalog c JOIN public.item_defs d ON d.slug = c.slug WHERE d.type <> 'care') THEN
    RAISE EXCEPTION 'Assanti catalog conflicts with an existing non-care item.';
  END IF;
END; $$;

-- The authenticated backend supplies getDeltaTime().deltaDay, never the browser.
-- The primary key makes simultaneous first visits initialize only one shared day.
CREATE FUNCTION public.ensure_assanti_food_day(p_delta_day integer)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_slugs text[];
  v_dots integer;
  v_count integer;
BEGIN
  IF p_delta_day IS NULL OR p_delta_day < 0 THEN
    RAISE EXCEPTION 'Invalid Delta day.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.assanti_food_days WHERE delta_day = p_delta_day) THEN RETURN; END IF;
  v_count := 6 + (('x' || substr(md5('assanti:count:' || p_delta_day::text), 1, 7))::bit(28)::integer % 5);
  SELECT array_agg(slug ORDER BY slug) INTO v_slugs FROM (
    SELECT slug FROM public.assanti_food_catalog WHERE permanent
    UNION ALL
    (SELECT slug FROM public.assanti_food_catalog WHERE NOT permanent
      ORDER BY md5('assanti:' || p_delta_day::text || ':' || slug) LIMIT v_count)
  ) selected;
  SELECT minimum_dots + floor(random() * (maximum_dots::bigint - minimum_dots + 1))::integer
    INTO STRICT v_dots FROM public.assanti_food_config WHERE id;
  INSERT INTO public.assanti_food_days VALUES (p_delta_day, v_slugs, v_dots, v_dots)
    ON CONFLICT (delta_day) DO NOTHING;
END;
$$;

CREATE FUNCTION public.get_assanti_food_shop(p_user_id uuid, p_delta_day integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_day public.assanti_food_days%ROWTYPE;
  v_catalog jsonb;
  v_last timestamptz;
  v_unlocked boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.wallets WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'Player wallet missing.';
  END IF;
  PERFORM public.ensure_assanti_food_day(p_delta_day);
  SELECT * INTO STRICT v_day FROM public.assanti_food_days WHERE delta_day = p_delta_day;
  SELECT jsonb_agg(jsonb_build_object(
    'slug', c.slug, 'name', d.name, 'description', d.description,
    'price', c.price, 'hunger', c.hunger, 'stackLimit', d.stack_limit,
    'permanent', c.permanent, 'available', c.slug = ANY(v_day.slugs)
  ) ORDER BY c.permanent DESC, d.name) INTO v_catalog
  FROM public.assanti_food_catalog c JOIN public.item_defs d ON d.slug = c.slug;
  SELECT last_claimed_at INTO v_last FROM public.assanti_food_claims WHERE user_id = p_user_id;
  SELECT EXISTS (SELECT 1 FROM public.player_quests WHERE user_id = p_user_id
    AND quest_key = 'assanti_food_trouble' AND status = 'completed') INTO v_unlocked;
  RETURN jsonb_build_object('deltaDay', p_delta_day, 'merchantDots', v_day.dots,
    'catalog', v_catalog, 'dailyFood', jsonb_build_object(
      'status', CASE WHEN NOT v_unlocked THEN 'locked'
        WHEN v_last > now() - interval '24 hours' THEN 'claimed' ELSE 'available' END,
      'nextClaimAt', CASE WHEN v_last IS NOT NULL THEN v_last + interval '24 hours' ELSE NULL END));
END;
$$;

CREATE FUNCTION public.trade_assanti_food_on_day(
  p_user_id uuid, p_slug text, p_quantity integer, p_direction text, p_delta_day integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_item_id uuid;
  v_stack_limit integer;
  v_price integer;
  v_quantity integer;
  v_dots integer;
  v_crystals integer;
  v_total bigint;
  v_day public.assanti_food_days%ROWTYPE;
BEGIN
  IF p_user_id IS NULL OR p_slug IS NULL OR p_direction IS NULL
    OR p_direction NOT IN ('purchase', 'sell') OR p_quantity IS NULL
    OR p_quantity < 1 OR p_quantity > 429496729
    OR (p_direction = 'purchase' AND p_quantity > 50) THEN
    RAISE EXCEPTION 'Invalid food trade.' USING ERRCODE = '22023';
  END IF;
  SELECT d.id, d.stack_limit, c.price INTO v_item_id, v_stack_limit, v_price
  FROM public.assanti_food_catalog c JOIN public.item_defs d ON d.slug = c.slug
  WHERE c.slug = p_slug AND d.type = 'care';
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid food trade.' USING ERRCODE = '22023'; END IF;
  v_total := p_quantity::bigint * v_price;

  -- Wallet first, then merchant day, then inventory. All changes roll back together.
  SELECT dots, crystals INTO v_dots, v_crystals FROM public.wallets
    WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player wallet missing.'; END IF;
  PERFORM public.ensure_assanti_food_day(p_delta_day);
  SELECT * INTO STRICT v_day FROM public.assanti_food_days WHERE delta_day = p_delta_day FOR UPDATE;
  IF p_direction = 'purchase' THEN
    IF NOT p_slug = ANY(v_day.slugs) THEN RAISE EXCEPTION 'That food is not available today.'; END IF;
    IF v_dots < v_total THEN RAISE EXCEPTION 'Not enough Dots.'; END IF;
    IF v_day.dots::bigint + v_total > 2147483647 THEN RAISE EXCEPTION 'Merchant wallet is full.'; END IF;
    IF p_quantity > v_stack_limit THEN RAISE EXCEPTION 'Food stack is full.'; END IF;
    INSERT INTO public.inventory AS owned (user_id, item_id, qty)
    VALUES (p_user_id, v_item_id, p_quantity)
    ON CONFLICT (user_id, item_id) DO UPDATE SET qty = owned.qty + EXCLUDED.qty, updated_at = now()
    WHERE owned.qty <= v_stack_limit - EXCLUDED.qty RETURNING qty INTO v_quantity;
    IF NOT FOUND THEN RAISE EXCEPTION 'Food stack is full.'; END IF;
    UPDATE public.wallets SET dots = dots - v_total::integer, updated_at = now()
      WHERE user_id = p_user_id RETURNING dots INTO v_dots;
    UPDATE public.assanti_food_days SET dots = dots + v_total::integer
      WHERE delta_day = p_delta_day RETURNING * INTO v_day;
  ELSE
    IF v_day.dots < v_total THEN RAISE EXCEPTION 'Assanti does not have enough Dots.'; END IF;
    IF v_dots::bigint + v_total > 2147483647 THEN RAISE EXCEPTION 'Player wallet is full.'; END IF;
    UPDATE public.inventory SET qty = qty - p_quantity, updated_at = now()
      WHERE user_id = p_user_id AND item_id = v_item_id AND qty >= p_quantity RETURNING qty INTO v_quantity;
    IF NOT FOUND THEN RAISE EXCEPTION 'Not enough owned food.'; END IF;
    UPDATE public.wallets SET dots = dots + v_total::integer, updated_at = now()
      WHERE user_id = p_user_id RETURNING dots INTO v_dots;
    UPDATE public.assanti_food_days SET dots = dots - v_total::integer
      WHERE delta_day = p_delta_day RETURNING * INTO v_day;
  END IF;
  RETURN jsonb_build_object('ok', true, 'slug', p_slug, 'quantity', p_quantity,
    'cost', CASE WHEN p_direction = 'purchase' THEN v_total ELSE 0 END,
    'value', CASE WHEN p_direction = 'sell' THEN v_total ELSE 0 END,
    'inventoryQuantity', v_quantity, 'merchantDots', v_day.dots, 'deltaDay', p_delta_day,
    'wallet', jsonb_build_object('dots', v_dots, 'crystals', v_crystals));
END;
$$;

-- Compatibility for an older backend during rollout. Same epoch/360-minute cycle
-- as src/lib/deltaTime.ts; the new backend passes getDeltaTime().deltaDay directly.
CREATE OR REPLACE FUNCTION public.trade_assanti_food(
  p_user_id uuid, p_slug text, p_quantity integer, p_direction text
) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT public.trade_assanti_food_on_day(p_user_id, p_slug, p_quantity, p_direction,
    floor(extract(epoch FROM now()) / 21600)::integer);
$$;

CREATE OR REPLACE FUNCTION public.claim_assanti_daily_food(p_user_id uuid) RETURNS jsonb
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
    IF v_item.stack_limit < 5 THEN RAISE EXCEPTION 'Not enough room for the full food reward.'; END IF;
    INSERT INTO public.inventory AS owned (user_id, item_id, qty)
    VALUES (p_user_id, v_item.id, 5)
    ON CONFLICT (user_id, item_id) DO UPDATE SET qty = owned.qty + 5, updated_at = now()
    WHERE owned.qty <= v_item.stack_limit - 5;
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


CREATE OR REPLACE FUNCTION public.perform_owned_care(
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
  -- Only approved Assanti foods use their catalog hunger value. Other care is unchanged.
  IF p_action = 'feed' AND EXISTS (SELECT 1 FROM public.assanti_food_catalog WHERE slug = v_slug) THEN
    SELECT greatest(0, least(50, coalesce(v_pet.hunger, 0) + hunger))
      INTO v_next.hunger FROM public.assanti_food_catalog WHERE slug = v_slug;
  END IF;
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



REVOKE ALL ON FUNCTION public.ensure_assanti_food_day(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_assanti_food_shop(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trade_assanti_food_on_day(uuid, text, integer, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trade_assanti_food(uuid, text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_assanti_food_day(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_assanti_food_shop(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.trade_assanti_food_on_day(uuid, text, integer, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.trade_assanti_food(uuid, text, integer, text) TO service_role;

COMMIT;
