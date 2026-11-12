BEGIN;

-- REVIEW COPY ONLY: Approved randomized rotating food stock range is 5-20.
-- Do not execute on Supabase without separate explicit approval.
CREATE TABLE public.assanti_stock_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  minimum_stock integer NOT NULL CHECK (minimum_stock >= 0),
  maximum_stock integer NOT NULL CHECK (maximum_stock >= minimum_stock)
);
INSERT INTO public.assanti_stock_config(id, minimum_stock, maximum_stock) VALUES (true, 5, 20);
CREATE TABLE public.assanti_food_stock (
  delta_day integer NOT NULL REFERENCES public.assanti_food_days(delta_day),
  slug text NOT NULL REFERENCES public.assanti_food_catalog(slug),
  quantity integer NOT NULL CHECK (quantity BETWEEN 0 AND 2147483647),
  PRIMARY KEY (delta_day, slug)
);
ALTER TABLE public.assanti_stock_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assanti_food_stock ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.assanti_stock_config, public.assanti_food_stock FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.assanti_stock_config, public.assanti_food_stock TO service_role;

-- User-approved price: pumpkin costs 3 Dots. Does not rewrite historical trade entries.
UPDATE public.assanti_food_catalog SET price = 3 WHERE slug = 'pumpkin';

CREATE OR REPLACE FUNCTION public.ensure_assanti_food_stock(p_delta_day integer)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.assanti_food_stock(delta_day, slug, quantity)
  SELECT p_delta_day, c.slug,
    CASE WHEN c.slug IN ('alpha-meat', 'alpha-vegetables') THEN 50
      ELSE cfg.minimum_stock + floor(random() * (cfg.maximum_stock - cfg.minimum_stock + 1))::integer END
  FROM public.assanti_food_days day
  JOIN public.assanti_food_catalog c ON c.slug = ANY(day.slugs)
  CROSS JOIN public.assanti_stock_config cfg
  WHERE day.delta_day = p_delta_day AND cfg.id
  ON CONFLICT (delta_day, slug) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_assanti_food_day(p_delta_day integer)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_slugs text[];
  v_dots integer;
  v_count integer;
BEGIN
  IF p_delta_day IS NULL OR p_delta_day < 0 THEN
    RAISE EXCEPTION 'Invalid Delta day.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.assanti_food_days WHERE delta_day = p_delta_day) THEN
    PERFORM public.ensure_assanti_food_stock(p_delta_day);
    RETURN;
  END IF;
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
  PERFORM public.ensure_assanti_food_stock(p_delta_day);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_assanti_food_shop(p_user_id uuid, p_delta_day integer)
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
    'permanent', c.permanent, 'available', c.slug = ANY(v_day.slugs),
    'stock', (SELECT st.quantity FROM public.assanti_food_stock st
              WHERE st.delta_day = p_delta_day AND st.slug = c.slug)
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

CREATE OR REPLACE FUNCTION public.trade_assanti_food_on_day(
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
    IF NOT EXISTS (SELECT 1 FROM public.assanti_food_stock
      WHERE delta_day = p_delta_day AND slug = p_slug AND quantity >= p_quantity)
      THEN RAISE EXCEPTION 'Not enough merchant stock.'; END IF;
    IF v_dots < v_total THEN RAISE EXCEPTION 'Not enough Dots.'; END IF;
    IF v_day.dots::bigint + v_total > 2147483647 THEN RAISE EXCEPTION 'Merchant wallet is full.'; END IF;
    IF p_quantity > v_stack_limit THEN RAISE EXCEPTION 'Food stack is full.'; END IF;
    INSERT INTO public.inventory AS owned (user_id, item_id, qty)
    VALUES (p_user_id, v_item_id, p_quantity)
    ON CONFLICT (user_id, item_id) DO UPDATE SET qty = owned.qty + EXCLUDED.qty, updated_at = now()
    WHERE owned.qty <= v_stack_limit - EXCLUDED.qty RETURNING qty INTO v_quantity;
    IF NOT FOUND THEN RAISE EXCEPTION 'Food stack is full.'; END IF;
    UPDATE public.assanti_food_stock SET quantity = quantity - p_quantity
      WHERE delta_day = p_delta_day AND slug = p_slug;
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
    -- Resales of foods not on today's menu are retained for the current day.
    INSERT INTO public.assanti_food_stock(delta_day, slug, quantity)
    VALUES (p_delta_day, p_slug, p_quantity)
    ON CONFLICT (delta_day, slug) DO UPDATE
      SET quantity = public.assanti_food_stock.quantity + EXCLUDED.quantity;
    UPDATE public.wallets SET dots = dots + v_total::integer, updated_at = now()
      WHERE user_id = p_user_id RETURNING dots INTO v_dots;
    UPDATE public.assanti_food_days SET dots = dots - v_total::integer
      WHERE delta_day = p_delta_day RETURNING * INTO v_day;
  END IF;
  RETURN jsonb_build_object('ok', true, 'slug', p_slug, 'quantity', p_quantity,
    'cost', CASE WHEN p_direction = 'purchase' THEN v_total ELSE 0 END,
    'value', CASE WHEN p_direction = 'sell' THEN v_total ELSE 0 END,
    'inventoryQuantity', v_quantity,
    'stock', (SELECT quantity FROM public.assanti_food_stock WHERE delta_day = p_delta_day AND slug = p_slug),
    'merchantDots', v_day.dots, 'deltaDay', p_delta_day,
    'wallet', jsonb_build_object('dots', v_dots, 'crystals', v_crystals));
END;
$$;


REVOKE ALL ON FUNCTION public.ensure_assanti_food_stock(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_assanti_food_stock(integer) TO service_role;

COMMIT;
