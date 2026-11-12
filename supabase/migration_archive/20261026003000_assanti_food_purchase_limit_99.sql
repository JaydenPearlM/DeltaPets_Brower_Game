-- Update purchase limit without altering applied migration history.
BEGIN;

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
    OR (p_direction = 'purchase' AND p_quantity > 99) THEN
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

COMMIT;
