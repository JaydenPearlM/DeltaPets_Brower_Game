-- REVIEW ONLY. Requires the existing Assanti daily-stock migrations.
-- Do not apply automatically. Pause merchant traffic during rollout.
-- Potion prices/buyback/initial stock deliberately remain NULL until approved.
-- Existing inventory, daily rewards, food prices and stock are not rewritten.
BEGIN;
CREATE TABLE public.assanti_potion_catalog (
  slug text PRIMARY KEY, name text NOT NULL, description text NOT NULL,
  hp integer NOT NULL, stack_limit integer NOT NULL CHECK (stack_limit > 0),
  price integer CHECK (price >= 0), buyback integer CHECK (buyback >= 0),
  initial_stock integer CHECK (initial_stock BETWEEN 0 AND 199)
);
CREATE TABLE public.assanti_potion_stock (
  delta_day integer NOT NULL REFERENCES public.assanti_food_days(delta_day),
  slug text NOT NULL REFERENCES public.assanti_potion_catalog(slug),
  quantity integer NOT NULL CHECK (quantity BETWEEN 0 AND 199),
  PRIMARY KEY(delta_day, slug)
);
ALTER TABLE public.assanti_potion_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assanti_potion_stock ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.assanti_potion_catalog, public.assanti_potion_stock FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.assanti_potion_catalog, public.assanti_potion_stock TO service_role;

-- Catalog metadata copied from Potions.json; economy values remain unconfigured.
INSERT INTO public.assanti_potion_catalog(slug,name,description,hp,stack_limit) VALUES
('minor-healing-potion','Minor Healing Potion','Restores a small amount of health.',20,99),
('healing-potion','Healing Potion','Restores a moderate amount of health.',35,99),
('greater-healing-potion','Greater Healing Potion','Restores a large amount of health.',55,99),
('major-healing-potion','Major Healing Potion','Restores a very large amount of health.',75,99),
('supreme-healing-potion','Supreme Healing Potion','Restores an exceptional amount of health.',100,99),
('redberry-tonic','Redberry Tonic','A tart berry tonic that restores a little health.',18,99),
('herbal-remedy','Herbal Remedy','A simple herbal blend used to patch up minor injuries.',22,99),
('warmroot-tonic','Warmroot Tonic','A warming root-based potion that restores health.',24,99),
('honey-heal-draught','Honey Heal Draught','A sweet medicinal draught that restores health.',26,99),
('greenleaf-tonic','Greenleaf Tonic','A fresh green tonic that helps a Kith recover.',25,99),
('mosswater-elixir','Mosswater Elixir','A cool woodland elixir that restores health.',28,99),
('sunfruit-tonic','Sunfruit Tonic','A bright citrus tonic with restorative properties.',30,99),
('moonberry-remedy','Moonberry Remedy','A deep-purple berry remedy that restores health.',38,99),
('silverleaf-elixir','Silverleaf Elixir','A refined herbal elixir with stronger healing properties.',42,99),
('crystalwater-tonic','Crystalwater Tonic','A clear mineral tonic that restores health quickly.',40,99),
('ember-healing-tonic','Ember Healing Tonic','A pleasantly warm tonic that restores health.',44,99),
('tide-healing-tonic','Tide Healing Tonic','A cool blue tonic that restores health.',44,99),
('stone-healing-tonic','Stone Healing Tonic','A dense mineral tonic that restores health.',46,99),
('breeze-healing-tonic','Breeze Healing Tonic','A light refreshing tonic that restores health.',42,99),
('frost-healing-tonic','Frost Healing Tonic','A chilled tonic that numbs aches and restores health.',45,99),
('storm-healing-tonic','Storm Healing Tonic','A sharply flavored tonic that restores health.',46,99),
('sun-healing-tonic','Sun Healing Tonic','A luminous golden tonic that restores health.',48,99),
('shade-healing-tonic','Shade Healing Tonic','A dark herbal tonic with potent restorative properties.',48,99),
('prismatic-healing-tonic','Prismatic Healing Tonic','A shimmering restorative tonic made from several rare ingredients.',65,99),
('wildwood-remedy','Wildwood Remedy','A strong medicinal blend made from Wildwood herbs.',50,99),
('kithna-restoration-draught','Kithna Restoration Draught','A traditional restorative draught used throughout Kithna.',52,99),
('deepwood-elixir','Deepwood Elixir','A concentrated woodland medicine that restores substantial health.',60,99),
('mountain-spring-elixir','Mountain Spring Elixir','A mineral-rich elixir drawn from a high mountain spring.',62,99),
('golden-restoration-tonic','Golden Restoration Tonic','A carefully refined tonic with powerful healing properties.',64,99),
('violet-restoration-tonic','Violet Restoration Tonic','A fragrant violet tonic that restores a large amount of health.',63,99),
('ruby-elixir','Ruby Elixir','A brilliant red elixir known for its powerful restorative effect.',68,99),
('sapphire-elixir','Sapphire Elixir','A deep blue elixir that restores substantial health.',68,99),
('emerald-elixir','Emerald Elixir','A vivid green elixir brewed from rare medicinal plants.',70,99),
('amber-elixir','Amber Elixir','A golden-brown elixir with strong restorative properties.',70,99),
('amethyst-elixir','Amethyst Elixir','A rich purple elixir that restores substantial health.',72,99),
('royal-healing-draught','Royal Healing Draught','A premium restorative draught made from high-quality ingredients.',85,99),
('ancient-restoration-elixir','Ancient Restoration Elixir','An old restorative formula preserved from early Kithna settlements.',90,99),
('starlight-tonic','Starlight Tonic','A luminous tonic with exceptional healing properties.',88,99),
('moonlight-elixir','Moonlight Elixir','A silver-blue elixir that restores a great amount of health.',90,99),
('sunlight-elixir','Sunlight Elixir','A radiant golden elixir that restores a great amount of health.',92,99),
('prism-restoration-elixir','Prism Restoration Elixir','A rare multicolored elixir with exceptional restorative power.',95,99),
('grand-healing-elixir','Grand Healing Elixir','A masterfully brewed potion that restores tremendous health.',100,99),
('legendary-healing-draught','Legendary Healing Draught','An extraordinarily rare draught prized for its restorative strength.',120,99),
('mythic-restoration-elixir','Mythic Restoration Elixir','A mythical restorative mixture made from exceptionally rare ingredients.',130,99),
('celestial-healing-tonic','Celestial Healing Tonic','A radiant tonic said to carry the restorative warmth of the night sky.',125,99),
('aurora-elixir','Aurora Elixir','A shifting colorful elixir with extraordinary healing power.',135,99),
('relic-restoration-draught','Relic Restoration Draught','A rare restorative formula inspired by ancient Relic traditions.',140,99),
('kithna-grand-remedy','Kithna Grand Remedy','One of Kithna''s finest restorative medicines.',145,99),
('prismatic-grand-elixir','Prismatic Grand Elixir','A brilliant prismatic elixir brewed from exceptionally rare ingredients.',150,99),
('master-healers-draught','Master Healer''s Draught','A master healer''s prized restorative mixture.',160,99);

CREATE FUNCTION public.assanti_menu(p_day integer)
RETURNS TABLE(slug text, category text) LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  (SELECT c.slug, 'food'::text FROM public.assanti_food_catalog c
   JOIN public.assanti_food_days d ON d.delta_day=p_day AND c.slug=ANY(d.slugs)
   ORDER BY c.permanent DESC, md5(p_day::text || ':' || c.slug), c.slug LIMIT 5)
  UNION ALL
  (SELECT c.slug, 'potion'::text FROM public.assanti_potion_catalog c
   ORDER BY md5(p_day::text || ':' || c.slug), c.slug LIMIT 5);
$$;

CREATE FUNCTION public.get_assanti_groceries(p_user_id uuid, p_delta_day integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_shop jsonb; v_food jsonb; v_potions jsonb;
BEGIN
  v_shop := public.get_assanti_food_shop(p_user_id,p_delta_day);
  -- Serialize stock creation with the existing food trade/day lock.
  PERFORM 1 FROM public.assanti_food_days WHERE delta_day=p_delta_day FOR UPDATE;
  INSERT INTO public.assanti_potion_stock(delta_day,slug,quantity)
    SELECT p_delta_day,c.slug,c.initial_stock FROM public.assanti_potion_catalog c
    JOIN public.assanti_menu(p_delta_day) m ON m.slug=c.slug AND m.category='potion'
    WHERE c.initial_stock IS NOT NULL
    ON CONFLICT DO NOTHING;
  SELECT coalesce(jsonb_agg(f || jsonb_build_object('category','food','buybackPrice',f->'price',
    'available',EXISTS(SELECT 1 FROM public.assanti_menu(p_delta_day) m WHERE m.slug=f->>'slug' AND m.category='food'))),'[]'::jsonb)
    INTO v_food FROM jsonb_array_elements(v_shop->'catalog') f;
  SELECT coalesce(jsonb_agg(jsonb_build_object('slug',c.slug,'name',c.name,'description',c.description,
    'category','potion','price',c.price,'buybackPrice',c.buyback,'hp',c.hp,'hunger',0,
    'stackLimit',least(c.stack_limit,coalesce(d.stack_limit,c.stack_limit)),'permanent',false,
    'available',EXISTS(SELECT 1 FROM public.assanti_menu(p_delta_day) m WHERE m.slug=c.slug AND m.category='potion'),
    'tradeable',d.id IS NOT NULL AND c.price IS NOT NULL AND c.buyback IS NOT NULL AND c.initial_stock IS NOT NULL,
    'stock',s.quantity)),'[]'::jsonb) INTO v_potions
    FROM public.assanti_potion_catalog c LEFT JOIN public.item_defs d ON d.slug=c.slug
    LEFT JOIN public.assanti_potion_stock s ON s.slug=c.slug AND s.delta_day=p_delta_day;
  RETURN v_shop || jsonb_build_object('catalog',v_food || v_potions);
END;
$$;

CREATE FUNCTION public.trade_assanti_basket(p_user_id uuid,p_delta_day integer,p_lines jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_line record; v_item public.item_defs%ROWTYPE; v_category text;
  v_price integer; v_buyback integer; v_stock integer; v_owned integer; v_cap integer;
  v_dots integer; v_merchant integer; v_cost bigint:=0; v_value bigint:=0;
  v_shop jsonb;
BEGIN
  IF p_user_id IS NULL OR jsonb_typeof(p_lines) IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_lines) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Invalid trade basket.' USING ERRCODE='22023';
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_lines) x WHERE jsonb_typeof(x) <> 'object'
    OR x->>'slug' IS NULL OR coalesce(x->>'buy','') !~ '^[0-9]+$' OR coalesce(x->>'sell','') !~ '^[0-9]+$')
    OR (SELECT count(DISTINCT x->>'slug') FROM jsonb_array_elements(p_lines) x) <> jsonb_array_length(p_lines) THEN
    RAISE EXCEPTION 'Invalid trade basket.' USING ERRCODE='22023';
  END IF;
  -- Match existing food RPC lock order: player wallet, merchant day, inventory.
  SELECT dots INTO v_dots FROM public.wallets WHERE user_id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player wallet missing.'; END IF;
  v_shop := public.get_assanti_groceries(p_user_id,p_delta_day);
  SELECT dots INTO v_merchant FROM public.assanti_food_days WHERE delta_day=p_delta_day FOR UPDATE;
  FOR v_line IN SELECT * FROM jsonb_to_recordset(p_lines) AS x(slug text,buy integer,sell integer) ORDER BY slug LOOP
    IF v_line.buy NOT BETWEEN 0 AND 99 OR v_line.sell NOT BETWEEN 0 AND 429496729 OR v_line.buy+v_line.sell=0 THEN
      RAISE EXCEPTION 'Invalid trade basket.' USING ERRCODE='22023';
    END IF;
    SELECT * INTO v_item FROM public.item_defs WHERE slug=v_line.slug FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Item trading is not configured.'; END IF;
    SELECT c.price,c.price,'food' INTO v_price,v_buyback,v_category FROM public.assanti_food_catalog c WHERE c.slug=v_line.slug;
    IF NOT FOUND THEN
      SELECT c.price,c.buyback,'potion' INTO v_price,v_buyback,v_category FROM public.assanti_potion_catalog c
        WHERE c.slug=v_line.slug AND c.initial_stock IS NOT NULL;
    END IF;
    IF v_price IS NULL OR v_buyback IS NULL THEN RAISE EXCEPTION 'Item trading is not configured.'; END IF;
    IF v_line.buy>0 AND NOT EXISTS(SELECT 1 FROM public.assanti_menu(p_delta_day) m WHERE m.slug=v_line.slug) THEN
      RAISE EXCEPTION 'That item is not available today.';
    END IF;
    v_stock:=NULL;
    IF v_category='food' THEN
      SELECT quantity INTO v_stock FROM public.assanti_food_stock WHERE delta_day=p_delta_day AND slug=v_line.slug FOR UPDATE;
    ELSE
      SELECT quantity INTO v_stock FROM public.assanti_potion_stock WHERE delta_day=p_delta_day AND slug=v_line.slug FOR UPDATE;
    END IF;
    v_stock:=coalesce(v_stock,0);
    IF v_line.buy>v_stock THEN RAISE EXCEPTION 'Not enough merchant stock.'; END IF;
    IF v_stock-v_line.buy+v_line.sell>199 THEN RAISE EXCEPTION 'Merchant stock is full.'; END IF;
    -- Ensure the inventory row exists, then lock even an initially empty stack.
    INSERT INTO public.inventory(user_id,item_id,qty) VALUES(p_user_id,v_item.id,0) ON CONFLICT DO NOTHING;
    SELECT qty INTO STRICT v_owned FROM public.inventory WHERE user_id=p_user_id AND item_id=v_item.id FOR UPDATE;
    IF v_line.sell>v_owned THEN RAISE EXCEPTION 'Not enough owned items.'; END IF;
    v_cap:=v_item.stack_limit;
    IF v_category='potion' THEN
      SELECT least(v_cap,stack_limit) INTO v_cap FROM public.assanti_potion_catalog WHERE slug=v_line.slug;
    END IF;
    IF v_line.buy>0 AND v_owned-v_line.sell+v_line.buy>v_cap THEN RAISE EXCEPTION 'Item stack is full.'; END IF;
    UPDATE public.inventory SET qty=v_owned-v_line.sell+v_line.buy,updated_at=now() WHERE user_id=p_user_id AND item_id=v_item.id;
    IF v_category='food' THEN
      INSERT INTO public.assanti_food_stock(delta_day,slug,quantity) VALUES(p_delta_day,v_line.slug,v_stock-v_line.buy+v_line.sell)
        ON CONFLICT(delta_day,slug) DO UPDATE SET quantity=EXCLUDED.quantity;
    ELSE
      INSERT INTO public.assanti_potion_stock(delta_day,slug,quantity) VALUES(p_delta_day,v_line.slug,v_stock-v_line.buy+v_line.sell)
        ON CONFLICT(delta_day,slug) DO UPDATE SET quantity=EXCLUDED.quantity;
    END IF;
    v_cost:=v_cost+v_price::bigint*v_line.buy;
    v_value:=v_value+v_buyback::bigint*v_line.sell;
  END LOOP;
  IF v_dots::bigint-v_cost+v_value<0 THEN RAISE EXCEPTION 'Not enough Dots.'; END IF;
  IF v_merchant::bigint+v_cost-v_value<0 THEN RAISE EXCEPTION 'Assanti does not have enough Dots.'; END IF;
  IF v_dots::bigint-v_cost+v_value>2147483647 OR v_merchant::bigint+v_cost-v_value>2147483647 THEN
    RAISE EXCEPTION 'Wallet capacity exceeded.';
  END IF;
  UPDATE public.wallets SET dots=(v_dots::bigint-v_cost+v_value)::integer,updated_at=now() WHERE user_id=p_user_id;
  UPDATE public.assanti_food_days SET dots=(v_merchant::bigint+v_cost-v_value)::integer WHERE delta_day=p_delta_day;
  RETURN jsonb_build_object('ok',true,'cost',v_cost,'value',v_value);
END;
$$;
REVOKE ALL ON FUNCTION public.assanti_menu(integer),public.get_assanti_groceries(uuid,integer),public.trade_assanti_basket(uuid,integer,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.assanti_menu(integer),public.get_assanti_groceries(uuid,integer),public.trade_assanti_basket(uuid,integer,jsonb) TO service_role;
COMMIT;
