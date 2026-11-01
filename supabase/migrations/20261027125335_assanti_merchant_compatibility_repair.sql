-- PROPOSED ONLY: do not execute without explicit database approval.
-- Target: deployed 20261017001518 Assanti rules, NOT the pending finite-stock drafts.
-- Apply this file alone after review; do NOT run an unfiltered `supabase db push`.
-- No existing functions, tables, prices, effects or player rows are changed at rollout.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $preflight$
BEGIN
  IF to_regprocedure('public.get_assanti_food_shop(uuid,integer)') IS NULL
    OR to_regprocedure('public.trade_assanti_food_on_day(uuid,text,integer,text,integer)') IS NULL
    OR to_regprocedure('public.ensure_assanti_food_day(integer)') IS NULL THEN
    RAISE EXCEPTION 'Assanti deployed baseline is missing. Do not apply pending drafts automatically.';
  END IF;
  IF to_regclass('public.assanti_food_stock') IS NOT NULL
    OR to_regclass('public.assanti_potion_catalog') IS NOT NULL
    OR to_regprocedure('public.get_assanti_groceries(uuid,integer)') IS NOT NULL
    OR to_regprocedure('public.trade_assanti_basket(uuid,integer,jsonb)') IS NOT NULL THEN
    RAISE EXCEPTION 'Assanti schema has changed; review compatibility before applying this repair.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261017001518') THEN
    RAISE EXCEPTION 'Expected applied Assanti baseline migration is not recorded.';
  END IF;
  IF position('p_quantity > 50' IN pg_get_functiondef(
    'public.trade_assanti_food_on_day(uuid,text,integer,text,integer)'::regprocedure)) = 0 THEN
    RAISE EXCEPTION 'Deployed purchase limit changed; review the compatibility contract.';
  END IF;
  -- Fail closed on changed function bodies, rather than guessing compatibility.
  IF md5(pg_get_functiondef('public.get_assanti_food_shop(uuid,integer)'::regprocedure))
      <> 'b3cd6d8ba52b88b0fbefab56ec0a37d6'
    OR md5(pg_get_functiondef('public.trade_assanti_food_on_day(uuid,text,integer,text,integer)'::regprocedure))
      <> '347ba93dd4251ce34030755970954237'
    OR md5(pg_get_functiondef('public.ensure_assanti_food_day(integer)'::regprocedure))
      <> '0f72f0fde6c1634fc84893de4b5d379c' THEN
    RAISE EXCEPTION 'Assanti baseline definition changed; review this migration again.';
  END IF;
END;
$preflight$;

-- Preserve the existing menu and prices verbatim. Null stock is explicitly
-- unlimited supply, not an invented finite quantity or a failed request fallback.
CREATE FUNCTION public.get_assanti_groceries(p_user_id uuid, p_delta_day integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
DECLARE v_shop jsonb; v_catalog jsonb;
BEGIN
  v_shop := public.get_assanti_food_shop(p_user_id, p_delta_day);
  SELECT jsonb_agg(entry.item || jsonb_build_object(
    'category','food', 'buybackPrice',entry.item->'price',
    'tradeable',true, 'stock',NULL, 'stockMode','unlimited', 'purchaseLimit',50
  ) ORDER BY entry.ordinality) INTO v_catalog
  FROM jsonb_array_elements(v_shop->'catalog') WITH ORDINALITY AS entry(item,ordinality);
  IF v_catalog IS NULL THEN RAISE EXCEPTION 'Assanti catalog unavailable.'; END IF;
  RETURN v_shop || jsonb_build_object('catalog',v_catalog,'potionTrading','unconfigured','tradeMode','purchases-first');
END;
$function$;

-- One transaction around the deployed trade function. Its prices, ownership,
-- capacity, wallet, availability and 50-item purchase checks remain authoritative.
-- Purchases run before sales (each ordered by slug); no net-wallet or net-stack
-- relaxation is introduced. Any rejected line rolls the whole call back.
CREATE FUNCTION public.trade_assanti_basket(p_user_id uuid, p_delta_day integer, p_lines jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
DECLARE v_line record; v_result jsonb; v_cost bigint := 0; v_value bigint := 0;
BEGIN
  IF p_user_id IS NULL OR p_delta_day IS NULL OR p_delta_day < 0
    OR jsonb_typeof(p_lines) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid trade basket.' USING ERRCODE='22023';
  END IF;
  IF jsonb_array_length(p_lines) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Invalid trade basket.' USING ERRCODE='22023';
  END IF;
  FOR v_line IN SELECT value AS item FROM jsonb_array_elements(p_lines) LOOP
    IF jsonb_typeof(v_line.item) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Invalid trade basket.' USING ERRCODE='22023';
    END IF;
    IF jsonb_typeof(v_line.item->'slug') IS DISTINCT FROM 'string'
      OR jsonb_typeof(v_line.item->'buy') IS DISTINCT FROM 'number'
      OR jsonb_typeof(v_line.item->'sell') IS DISTINCT FROM 'number'
      OR length(v_line.item->>'slug') NOT BETWEEN 1 AND 100
      OR (v_line.item - 'slug' - 'buy' - 'sell') <> '{}'::jsonb THEN
      RAISE EXCEPTION 'Invalid trade basket.' USING ERRCODE='22023';
    END IF;
    IF (v_line.item->>'buy')::numeric NOT BETWEEN 0 AND 50
      OR (v_line.item->>'sell')::numeric NOT BETWEEN 0 AND 429496729
      OR trunc((v_line.item->>'buy')::numeric) <> (v_line.item->>'buy')::numeric
      OR trunc((v_line.item->>'sell')::numeric) <> (v_line.item->>'sell')::numeric
      OR (v_line.item->>'buy')::numeric + (v_line.item->>'sell')::numeric = 0 THEN
      RAISE EXCEPTION 'Invalid trade basket.' USING ERRCODE='22023';
    END IF;
  END LOOP;
  IF (SELECT count(DISTINCT value->>'slug') FROM jsonb_array_elements(p_lines))
    <> jsonb_array_length(p_lines) THEN
    RAISE EXCEPTION 'Invalid trade basket.' USING ERRCODE='22023';
  END IF;
  -- Match the legacy lock order, once for the entire basket.
  PERFORM 1 FROM public.wallets WHERE user_id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player wallet missing.'; END IF;
  PERFORM public.ensure_assanti_food_day(p_delta_day);
  PERFORM 1 FROM public.assanti_food_days WHERE delta_day=p_delta_day FOR UPDATE;
  FOR v_line IN SELECT * FROM jsonb_to_recordset(p_lines) AS x(slug text,buy numeric,sell numeric) ORDER BY slug LOOP
    IF v_line.buy > 0 THEN
      v_result := public.trade_assanti_food_on_day(p_user_id,v_line.slug,v_line.buy::integer,'purchase',p_delta_day);
      v_cost := v_cost + (v_result->>'cost')::bigint;
    END IF;
  END LOOP;
  FOR v_line IN SELECT * FROM jsonb_to_recordset(p_lines) AS x(slug text,buy numeric,sell numeric) ORDER BY slug LOOP
    IF v_line.sell > 0 THEN
      v_result := public.trade_assanti_food_on_day(p_user_id,v_line.slug,v_line.sell::integer,'sell',p_delta_day);
      v_value := v_value + (v_result->>'value')::bigint;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('ok',true,'cost',v_cost,'value',v_value);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_assanti_groceries(uuid,integer),
  public.trade_assanti_basket(uuid,integer,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_assanti_groceries(uuid,integer),
  public.trade_assanti_basket(uuid,integer,jsonb) TO service_role;

DO $verify$
BEGIN
  IF has_function_privilege('anon','public.get_assanti_groceries(uuid,integer)','EXECUTE')
    OR has_function_privilege('authenticated','public.get_assanti_groceries(uuid,integer)','EXECUTE')
    OR has_function_privilege('anon','public.trade_assanti_basket(uuid,integer,jsonb)','EXECUTE')
    OR has_function_privilege('authenticated','public.trade_assanti_basket(uuid,integer,jsonb)','EXECUTE')
    OR NOT has_function_privilege('service_role','public.get_assanti_groceries(uuid,integer)','EXECUTE')
    OR NOT has_function_privilege('service_role','public.trade_assanti_basket(uuid,integer,jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'Assanti RPC privilege verification failed.';
  END IF;
END;
$verify$;
NOTIFY pgrst, 'reload schema';
COMMIT;
