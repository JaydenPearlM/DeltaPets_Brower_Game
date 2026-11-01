-- Kennith buy/sell uses JSON prices supplied by the trusted backend, as Assanti
-- does for food. Returned goods enter today's stock (cap 199) and reset next day.
-- Requires Kennith wallet/stock migrations. No existing player rows are rewritten.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE FUNCTION public.trade_kennith_basket(
  p_user_id uuid, p_delta_day integer, p_lines jsonb, p_seed jsonb, p_catalog jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_line record; v_def record; v_item public.item_defs%ROWTYPE;
  v_stock integer; v_owned integer; v_reserved integer; v_relics integer;
  v_dots integer; v_merchant integer; v_cost bigint := 0; v_value bigint := 0;
BEGIN
  IF p_user_id IS NULL OR jsonb_typeof(p_lines) IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_lines) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Invalid trade basket.';
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_lines) x WHERE jsonb_typeof(x) <> 'object'
      OR x->>'slug' IS NULL OR x->>'category' IS NULL
      OR coalesce(x->>'buy','') !~ '^[0-9]+$' OR coalesce(x->>'sell','') !~ '^[0-9]+$')
    OR (SELECT count(DISTINCT x->>'slug') FROM jsonb_array_elements(p_lines) x) <> jsonb_array_length(p_lines) THEN
    RAISE EXCEPTION 'Invalid trade basket.';
  END IF;
  IF jsonb_typeof(p_catalog) IS DISTINCT FROM 'array' OR jsonb_array_length(p_catalog)=0
    OR (SELECT count(DISTINCT x->>'slug') FROM jsonb_array_elements(p_catalog) x) <> jsonb_array_length(p_catalog) THEN
    RAISE EXCEPTION 'Invalid trade catalog.';
  END IF;
  -- Same wallet -> merchant -> inventory lock order as the existing purchase RPC.
  SELECT dots INTO v_dots FROM public.wallets WHERE user_id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player wallet missing.'; END IF;
  PERFORM public.get_kennith_stock(p_delta_day,p_seed);
  SELECT dots INTO STRICT v_merchant FROM public.kennith_wallet_days WHERE delta_day=p_delta_day FOR UPDATE;
  -- Serialize wardrobe changes, including the legacy profile update path.
  PERFORM 1 FROM public.profiles WHERE user_id=p_user_id FOR UPDATE;
  FOR v_line IN SELECT * FROM jsonb_to_recordset(p_lines)
      AS x(slug text,category text,buy integer,sell integer) ORDER BY slug LOOP
    IF v_line.buy NOT BETWEEN 0 AND 20 OR v_line.sell NOT BETWEEN 0 AND 199 OR v_line.buy+v_line.sell=0 THEN
      RAISE EXCEPTION 'Invalid trade basket.';
    END IF;
    SELECT * INTO v_def FROM jsonb_to_recordset(p_catalog) AS x(slug text,category text,price integer)
      WHERE slug=v_line.slug AND category=v_line.category;
    IF NOT FOUND OR v_def.price IS NULL OR v_def.price<=0 THEN
      RAISE EXCEPTION 'That item is not available today.';
    END IF;
    SELECT * INTO v_item FROM public.item_defs WHERE slug=v_line.slug FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Item trading is not configured.'; END IF;
    SELECT quantity INTO v_stock FROM public.kennith_stock
      WHERE delta_day=p_delta_day AND slug=v_line.slug FOR UPDATE;
    v_stock := coalesce(v_stock,0);
    IF v_line.buy>v_stock THEN RAISE EXCEPTION 'Not enough merchant stock.'; END IF;
    IF v_stock-v_line.buy+v_line.sell>199 THEN RAISE EXCEPTION 'Merchant stock is full.'; END IF;
    INSERT INTO public.inventory(user_id,item_id,qty) VALUES(p_user_id,v_item.id,0) ON CONFLICT DO NOTHING;
    SELECT qty INTO STRICT v_owned FROM public.inventory WHERE user_id=p_user_id AND item_id=v_item.id FOR UPDATE;
    IF v_line.sell>v_owned THEN RAISE EXCEPTION 'Not enough owned items.'; END IF;
    SELECT count(*) INTO v_reserved FROM public.profiles p,
      jsonb_each_text(coalesce(p.avatar_customization,'{}'::jsonb)) x
      WHERE p.user_id=p_user_id AND x.key IN ('upperBodyClothing','lowerBodyClothing','hat','eyewear') AND x.value=v_line.slug;
    -- Equipment migration is additive; wardrobe remains protected without it.
    IF to_regclass('public.pet_relic_equipment') IS NOT NULL THEN
      EXECUTE 'SELECT count(*) FROM public.pet_relic_equipment WHERE user_id=$1 AND item_id=$2'
        INTO v_relics USING p_user_id,v_item.id;
      v_reserved := v_reserved+v_relics;
    END IF;
    IF v_line.sell>greatest(0,v_owned-v_reserved) THEN
      RAISE EXCEPTION 'Unequip this item before using or selling its last available copy.';
    END IF;
    IF v_line.buy>0 AND v_owned::bigint-v_line.sell+v_line.buy>v_item.stack_limit THEN
      RAISE EXCEPTION 'Item stack is full.';
    END IF;
    UPDATE public.inventory SET qty=v_owned-v_line.sell+v_line.buy,updated_at=now()
      WHERE user_id=p_user_id AND item_id=v_item.id;
    INSERT INTO public.kennith_stock(delta_day,slug,category,price,quantity)
      VALUES(p_delta_day,v_line.slug,v_def.category,v_def.price,v_stock-v_line.buy+v_line.sell)
      ON CONFLICT(delta_day,slug) DO UPDATE SET quantity=EXCLUDED.quantity;
    v_cost := v_cost+v_def.price::bigint*v_line.buy;
    v_value := v_value+v_def.price::bigint*v_line.sell;
  END LOOP;
  IF v_dots::bigint-v_cost+v_value<0 THEN RAISE EXCEPTION 'Not enough Dots.'; END IF;
  IF v_merchant::bigint+v_cost-v_value<0 THEN RAISE EXCEPTION 'Kennith does not have enough Dots.'; END IF;
  IF v_dots::bigint-v_cost+v_value>2147483647 OR v_merchant::bigint+v_cost-v_value>2147483647 THEN
    RAISE EXCEPTION 'Wallet capacity exceeded.';
  END IF;
  IF p_delta_day <> floor((extract(epoch FROM clock_timestamp())+4500)/21600)::integer THEN
    RAISE EXCEPTION 'The Aliune day changed. Refresh the shop.';
  END IF;
  UPDATE public.wallets SET dots=(v_dots::bigint-v_cost+v_value)::integer,updated_at=now() WHERE user_id=p_user_id;
  UPDATE public.kennith_wallet_days SET dots=(v_merchant::bigint+v_cost-v_value)::integer WHERE delta_day=p_delta_day;
  RETURN jsonb_build_object('ok',true,'cost',v_cost,'value',v_value);
END;
$$;
REVOKE ALL ON FUNCTION public.trade_kennith_basket(uuid,integer,jsonb,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.trade_kennith_basket(uuid,integer,jsonb,jsonb,jsonb) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
