BEGIN;

-- Existing Assanti catalog only. No player quantities or legacy data are imported.
INSERT INTO public.item_defs (slug, name, type, description, rarity, stack_limit, effects)
VALUES
  ('alpha-meat', 'Meat', 'care', 'Fresh cuts harvested from Kithna''s meat tree.', 1, 99, '{"careCategory":"food"}'::jsonb),
  ('alpha-vegetables', 'Vegetables', 'care', 'Simple vegetables grown in Kithna''s garden.', 1, 99, '{"careCategory":"food"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- Restrictive policies close browser minting through inventory_write_own for
-- these foods, including changing another item's ID. Reads and other items stay.
CREATE POLICY assanti_food_backend_insert ON public.inventory
AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (NOT EXISTS (
  SELECT 1 FROM public.item_defs d
  WHERE d.id = item_id AND d.slug IN ('alpha-meat', 'alpha-vegetables')
));

CREATE POLICY assanti_food_backend_update ON public.inventory
AS RESTRICTIVE FOR UPDATE TO authenticated
USING (NOT EXISTS (
  SELECT 1 FROM public.item_defs d
  WHERE d.id = item_id AND d.slug IN ('alpha-meat', 'alpha-vegetables')
))
WITH CHECK (NOT EXISTS (
  SELECT 1 FROM public.item_defs d
  WHERE d.id = item_id AND d.slug IN ('alpha-meat', 'alpha-vegetables')
));

CREATE POLICY assanti_food_backend_delete ON public.inventory
AS RESTRICTIVE FOR DELETE TO authenticated
USING (NOT EXISTS (
  SELECT 1 FROM public.item_defs d
  WHERE d.id = item_id AND d.slug IN ('alpha-meat', 'alpha-vegetables')
));

CREATE FUNCTION public.trade_assanti_food(
  p_user_id uuid, p_slug text, p_quantity integer, p_direction text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_item_id uuid;
  v_stack_limit integer;
  v_quantity integer;
  v_dots integer;
  v_crystals integer;
  v_total integer;
BEGIN
  IF p_user_id IS NULL OR p_slug IS NULL
     OR p_slug NOT IN ('alpha-meat', 'alpha-vegetables')
     OR p_direction IS NULL OR p_direction NOT IN ('purchase', 'sell')
     OR p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 429496729
     OR (p_direction = 'purchase' AND p_quantity > 50) THEN
    RAISE EXCEPTION 'Invalid food trade.' USING ERRCODE = '22023';
  END IF;

  SELECT id, stack_limit INTO v_item_id, v_stack_limit
  FROM public.item_defs WHERE slug = p_slug AND type = 'care';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Merchant food definition missing.';
  END IF;

  -- Existing buy AND sell price. No client price is accepted.
  v_total := p_quantity * 5;
  -- Wallet-first locking serializes concurrent trades for the same player.
  SELECT dots, crystals INTO v_dots, v_crystals
  FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player wallet missing.';
  END IF;

  IF p_direction = 'purchase' THEN
    UPDATE public.wallets SET dots = dots - v_total, updated_at = now()
    WHERE user_id = p_user_id AND dots >= v_total
    RETURNING dots INTO v_dots;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Not enough Dots.';
    END IF;

    IF p_quantity > v_stack_limit THEN
      RAISE EXCEPTION 'Food stack is full.';
    END IF;
    INSERT INTO public.inventory AS owned (user_id, item_id, qty)
    VALUES (p_user_id, v_item_id, p_quantity)
    ON CONFLICT (user_id, item_id) DO UPDATE
    SET qty = owned.qty + EXCLUDED.qty, updated_at = now()
    WHERE owned.qty <= v_stack_limit - EXCLUDED.qty
    RETURNING qty INTO v_quantity;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Food stack is full.';
    END IF;
  ELSE
    UPDATE public.inventory SET qty = qty - p_quantity, updated_at = now()
    WHERE user_id = p_user_id AND item_id = v_item_id AND qty >= p_quantity
    RETURNING qty INTO v_quantity;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Not enough owned food.';
    END IF;

    UPDATE public.wallets SET dots = dots + v_total, updated_at = now()
    WHERE user_id = p_user_id RETURNING dots INTO v_dots;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Player wallet missing.';
    END IF;
  END IF;

  -- Uncaught errors roll back BOTH writes, including constraint/trigger errors.
  RETURN jsonb_build_object(
    'ok', true, 'slug', p_slug, 'quantity', p_quantity,
    'cost', CASE WHEN p_direction = 'purchase' THEN v_total ELSE 0 END,
    'value', CASE WHEN p_direction = 'sell' THEN v_total ELSE 0 END,
    'inventoryQuantity', v_quantity,
    'wallet', jsonb_build_object('dots', v_dots, 'crystals', v_crystals)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.trade_assanti_food(uuid, text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trade_assanti_food(uuid, text, integer, text) TO service_role;

COMMIT;
