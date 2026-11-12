-- REVIEW ONLY: do not apply without explicit approval. No live data was changed.
-- Requires the separately reviewed 20261029221654 Kennith wallet migration.
-- JSON catalogs stay authoritative; p_seed is supplied only by the trusted backend.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TABLE public.kennith_stock_days (
  delta_day integer PRIMARY KEY REFERENCES public.kennith_wallet_days(delta_day)
);
CREATE TABLE public.kennith_stock (
  delta_day integer NOT NULL REFERENCES public.kennith_stock_days(delta_day),
  slug text NOT NULL,
  category text NOT NULL CHECK (category IN ('clothing','accessories','relics','petCare')),
  price integer NOT NULL CHECK (price = CASE category WHEN 'clothing' THEN 30 WHEN 'accessories' THEN 25 WHEN 'relics' THEN 40 WHEN 'petCare' THEN 10 END),
  quantity integer NOT NULL CHECK (quantity >= 0),
  PRIMARY KEY(delta_day,slug)
);
ALTER TABLE public.kennith_stock_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kennith_stock ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kennith_stock_days, public.kennith_stock FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.kennith_stock_days, public.kennith_stock TO service_role;

CREATE FUNCTION public.get_kennith_stock(p_delta_day integer, p_seed jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_result jsonb;
BEGIN
  -- Same six-hour cycle and 05:00 offset as getKennithDay; use real clock after locks.
  IF p_delta_day IS DISTINCT FROM floor((extract(epoch FROM clock_timestamp()) + 4500) / 21600)::integer THEN
    RAISE EXCEPTION 'The Aliune day changed. Refresh the shop.';
  END IF;
  PERFORM public.get_kennith_wallet(p_delta_day);
  PERFORM 1 FROM public.kennith_wallet_days WHERE delta_day=p_delta_day FOR UPDATE;
  IF NOT EXISTS (SELECT 1 FROM public.kennith_stock_days WHERE delta_day=p_delta_day) THEN
    IF jsonb_typeof(p_seed) IS DISTINCT FROM 'array' OR jsonb_array_length(p_seed) <> 20 THEN
      RAISE EXCEPTION 'Invalid stock seed.';
    END IF;
    IF (SELECT count(DISTINCT x->>'slug') FROM jsonb_array_elements(p_seed) x) <> 20
      OR EXISTS (SELECT 1 FROM jsonb_to_recordset(p_seed) AS x(slug text,category text,price integer,stock integer)
        WHERE slug IS NULL OR category IS NULL OR price IS NULL OR stock IS NULL
          OR category NOT IN ('clothing','accessories','relics','petCare')
          OR stock NOT BETWEEN CASE category WHEN 'clothing' THEN 5 WHEN 'accessories' THEN 3 WHEN 'relics' THEN 2 ELSE 8 END
            AND CASE category WHEN 'clothing' THEN 12 WHEN 'accessories' THEN 8 WHEN 'relics' THEN 6 ELSE 20 END)
      OR (SELECT count(*) FROM (SELECT x->>'category' FROM jsonb_array_elements(p_seed) x
        GROUP BY x->>'category' HAVING count(*)=5) categories) <> 4 THEN
      RAISE EXCEPTION 'Invalid stock seed.';
    END IF;
    INSERT INTO public.kennith_stock_days VALUES(p_delta_day);
    INSERT INTO public.kennith_stock(delta_day,slug,category,price,quantity)
      SELECT p_delta_day,slug,category,price,stock
      FROM jsonb_to_recordset(p_seed) AS x(slug text,category text,price integer,stock integer);
  END IF;
  -- An initialized day is never reseeded, even when stock reaches zero.
  SELECT jsonb_agg(jsonb_build_object('slug',slug,'category',category,'price',price,'stock',quantity) ORDER BY category,slug)
    INTO v_result FROM public.kennith_stock WHERE delta_day=p_delta_day;
  IF p_delta_day <> floor((extract(epoch FROM clock_timestamp()) + 4500) / 21600)::integer THEN
    RAISE EXCEPTION 'The Aliune day changed. Refresh the shop.';
  END IF;
  RETURN v_result;
END;
$$;

CREATE FUNCTION public.purchase_kennith_basket(p_user_id uuid,p_delta_day integer,p_lines jsonb,p_seed jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_line record; v_item public.item_defs%ROWTYPE; v_stock public.kennith_stock%ROWTYPE;
  v_owned integer; v_dots integer; v_merchant integer; v_cost bigint := 0;
BEGIN
  IF p_user_id IS NULL OR jsonb_typeof(p_lines) IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_lines) NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'Invalid purchase basket.'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_lines) x
      WHERE jsonb_typeof(x) <> 'object' OR x->>'slug' IS NULL OR x->>'category' IS NULL
        OR coalesce(x->>'quantity','') !~ '^[0-9]+$')
    OR (SELECT count(DISTINCT x->>'slug') FROM jsonb_array_elements(p_lines) x) <> jsonb_array_length(p_lines) THEN
    RAISE EXCEPTION 'Invalid purchase basket.';
  END IF;
  -- Same lock order as existing merchants: player wallet, merchant day, inventory.
  SELECT dots INTO v_dots FROM public.wallets WHERE user_id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player wallet missing.'; END IF;
  PERFORM public.get_kennith_stock(p_delta_day,p_seed);
  SELECT dots INTO STRICT v_merchant FROM public.kennith_wallet_days WHERE delta_day=p_delta_day FOR UPDATE;
  FOR v_line IN SELECT * FROM jsonb_to_recordset(p_lines) AS x(slug text,category text,quantity integer) ORDER BY slug LOOP
    IF v_line.quantity NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'Invalid purchase basket.'; END IF;
    SELECT * INTO v_stock FROM public.kennith_stock
      WHERE delta_day=p_delta_day AND slug=v_line.slug AND category=v_line.category FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'That item is not available today.'; END IF;
    IF v_line.quantity > v_stock.quantity THEN RAISE EXCEPTION 'Not enough merchant stock.'; END IF;
    SELECT * INTO v_item FROM public.item_defs WHERE slug=v_line.slug FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Item trading is not configured.'; END IF;
    INSERT INTO public.inventory(user_id,item_id,qty) VALUES(p_user_id,v_item.id,0) ON CONFLICT DO NOTHING;
    SELECT qty INTO STRICT v_owned FROM public.inventory WHERE user_id=p_user_id AND item_id=v_item.id FOR UPDATE;
    IF v_owned::bigint+v_line.quantity > v_item.stack_limit THEN RAISE EXCEPTION 'Item stack is full.'; END IF;
    UPDATE public.inventory SET qty=v_owned+v_line.quantity,updated_at=now() WHERE user_id=p_user_id AND item_id=v_item.id;
    UPDATE public.kennith_stock SET quantity=quantity-v_line.quantity WHERE delta_day=p_delta_day AND slug=v_line.slug;
    v_cost := v_cost+v_stock.price::bigint*v_line.quantity;
  END LOOP;
  IF v_dots < v_cost THEN RAISE EXCEPTION 'Not enough Dots.'; END IF;
  IF v_merchant::bigint+v_cost > 2147483647 THEN RAISE EXCEPTION 'Wallet capacity exceeded.'; END IF;
  IF p_delta_day <> floor((extract(epoch FROM clock_timestamp()) + 4500) / 21600)::integer THEN
    RAISE EXCEPTION 'The Aliune day changed. Refresh the shop.';
  END IF;
  UPDATE public.wallets SET dots=(v_dots-v_cost)::integer,updated_at=now() WHERE user_id=p_user_id;
  UPDATE public.kennith_wallet_days SET dots=(v_merchant+v_cost)::integer WHERE delta_day=p_delta_day;
  RETURN jsonb_build_object('ok',true,'cost',v_cost);
END;
$$;
REVOKE ALL ON FUNCTION public.get_kennith_stock(integer,jsonb), public.purchase_kennith_basket(uuid,integer,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_kennith_stock(integer,jsonb), public.purchase_kennith_basket(uuid,integer,jsonb,jsonb) TO service_role;

-- Missing inventory definitions are inserted below from the existing JSON only.
-- Existing definitions, effects, ownership and player data are never overwritten.

INSERT INTO public.item_defs(slug,name,type,description) VALUES
('battered-shirt-cream','Cream Battered Shirt','equipment','Cream battered short-sleeve shirt with frayed edges, small tears, and sewn patches'),
('battered-shirt-muted-blue','Muted Blue Battered Shirt','equipment','Muted blue battered short-sleeve shirt with frayed edges, small tears, and sewn patches'),
('battered-shirt-dusty-green','Dusty Green Battered Shirt','equipment','Dusty green battered short-sleeve shirt with frayed edges, small tears, and sewn patches'),
('battered-shirt-faded-plum','Faded Plum Battered Shirt','equipment','Faded plum battered short-sleeve shirt with frayed edges, small tears, and sewn patches'),
('battered-trousers-dark-brown','Dark Brown Battered Trousers','equipment','Dark brown worn trousers with frayed cuffs and patches'),
('battered-trousers-slate-gray','Slate Gray Battered Trousers','equipment','Slate gray worn trousers with frayed cuffs and patches'),
('battered-trousers-faded-olive','Faded Olive Battered Trousers','equipment','Faded olive worn trousers with frayed cuffs and patches'),
('battered-skirt-muted-purple','Muted Purple Battered Skirt','equipment','Muted purple battered wrap skirt with worn hems and sewn patches'),
('battered-skirt-dusty-blue','Dusty Blue Battered Skirt','equipment','Dusty blue battered wrap skirt with worn hems and sewn patches'),
('battered-skirt-moss-green','Moss Green Battered Skirt','equipment','Moss green battered wrap skirt with worn hems and sewn patches'),
('battered-side-cap-brown','Battered Side-Cap (Brown)','equipment','Worn brown side-cap with stitched Delta triangle emblem'),
('battered-travel-cap-blue','Battered Travel Cap (Blue)','equipment','Worn blue travel cap with a Delta triangle emblem'),
('battered-menders-cap-olive','Battered Mender''s Cap (Olive)','equipment','Patched olive mender''s cap with stitched Delta triangle emblem'),
('round-glasses-dark-metal','Round Glasses (Dark Metal)','equipment','Round dark metal frames'),
('round-glasses-bronze','Round Glasses (Bronze)','equipment','Round bronze frames'),
('square-glasses-dark-metal','Square Glasses (Dark Metal)','equipment','Square dark metal frames'),
('square-glasses-blue-gray','Square Glasses (Blue-Gray)','equipment','Square blue-gray frames'),
('brass-monocle','Brass Monocle','equipment','Brass monocle with chain'),
('smooth-river-stone','Smooth River Stone','equipment','Rounded blue-gray stone'),
('carved-wooden-token','Carved Wooden Token','equipment','Wooden disc with a simple spiral'),
('copper-keepsake','Copper Keepsake','equipment','Tarnished copper charm'),
('woven-cord-charm','Woven Cord Charm','equipment','Knotted cord around a wooden bead'),
('clay-medallion','Clay Medallion','equipment','Small clay pendant with a leaf imprint'),
('polished-shell','Polished Shell','equipment','Cream shell with a soft pink interior'),
('chipped-stone-pendant','Chipped Stone Pendant','equipment','Plain stone pendant with a chipped edge'),
('old-brass-bell','Old Brass Bell','equipment','Small, weathered brass bell')
ON CONFLICT(slug) DO NOTHING;
INSERT INTO public.item_defs(slug,name,type,description,rarity,stack_limit,effects) VALUES
('soft-cleaning-brush','Soft Cleaning Brush','care','A soft brush used to clean a Delta.',1,99,'{"clean": 25}'::jsonb),
('gentle-grooming-brush','Gentle Grooming Brush','care','A gentle brush that removes dust and loose fur.',1,99,'{"clean": 28}'::jsonb),
('mini-care-brush','Mini Care Brush','care','A compact grooming brush made for smaller Kith.',1,99,'{"clean": 22}'::jsonb),
('soft-cloth-pad','Soft Cloth Pad','care','A soft cleaning pad for delicate fur, scales, and feathers.',1,99,'{"clean": 24}'::jsonb),
('care-sponge','Care Sponge','care','A soft sponge that makes cleanup quick and easy.',1,99,'{"clean": 26}'::jsonb),
('bouncy-ball','Bouncy Ball','care','A simple ball that bounces unpredictably and keeps a Kith busy.',1,99,'{"happy": 24}'::jsonb),
('rope-toy','Rope Toy','care','A sturdy rope toy made for tugging and chewing.',1,99,'{"happy": 28}'::jsonb),
('feather-wand','Feather Wand','care','A lightweight wand with fluttering feathers for playful chasing.',1,99,'{"happy": 27}'::jsonb),
('soft-plush-kith','Soft Plush Kith','care','A cuddly plush toy shaped like a tiny Kith.',1,99,'{"happy": 30}'::jsonb),
('chew-ring','Chew Ring','care','A durable ring made for chewing and playful tossing.',1,99,'{"happy": 29}'::jsonb)
ON CONFLICT(slug) DO NOTHING;
NOTIFY pgrst, 'reload schema';
COMMIT;
