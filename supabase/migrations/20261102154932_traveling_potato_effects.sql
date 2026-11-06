-- Prepared only: apply separately after review. Existing history is retained.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.poe_tay_toe_state
  ADD COLUMN location_version uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN last_discovery_id uuid;
ALTER TABLE public.poe_tay_toe_finds
  ADD COLUMN effect_key text NOT NULL DEFAULT 'legacy_dots',
  ADD COLUMN effect_expires_at timestamptz,
  ADD COLUMN relocated_at timestamptz;
ALTER TABLE public.poe_tay_toe_finds ADD CONSTRAINT potato_effect_key_check CHECK
  (effect_key IN ('legacy_dots','potato_power','warm_potato','lucky_spud','potato_brain','rotten_luck','absolutely_nothing'));
ALTER TABLE public.poe_tay_toe_state ADD CONSTRAINT potato_last_discovery_fk
  FOREIGN KEY (last_discovery_id) REFERENCES public.poe_tay_toe_finds(id) ON DELETE SET NULL;
-- The deployed dots-only claim writes zero items, but its old constraint still
-- requires an item. Preserve history while permitting effects with no item drop.
ALTER TABLE public.poe_tay_toe_finds DROP CONSTRAINT poe_tay_toe_finds_item_qty_check;
ALTER TABLE public.poe_tay_toe_finds ADD CONSTRAINT poe_tay_toe_finds_item_qty_check CHECK (item_qty >= 0);
-- Release legacy reservations without altering discoveries, balances or cooldowns.
UPDATE public.poe_tay_toe_state SET claimed_by_user_id = NULL, claimed_at = NULL;

CREATE FUNCTION public.potato_locations() RETURNS text[]
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
 SELECT ARRAY['hatchery-back','profile','pet','food-merchant','home','hatchery','thrift-merchant']::text[];
$$;

-- A pure mapping lets boundary tests verify the approved distribution.
CREATE FUNCTION public.potato_effect_for_roll(p_roll numeric) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
BEGIN
 IF p_roll IS NULL OR p_roll < 0 OR p_roll >= 1 THEN RAISE EXCEPTION 'Invalid effect roll'; END IF;
 RETURN CASE WHEN p_roll < .2 THEN 'potato_power' WHEN p_roll < .4 THEN 'warm_potato'
 WHEN p_roll < .6 THEN 'lucky_spud' WHEN p_roll < .7 THEN 'potato_brain'
 WHEN p_roll < .8 THEN 'rotten_luck' ELSE 'absolutely_nothing' END;
END;
$$;

-- 1.1 units of incubation progress per second only during the warm interval.
-- Computes the exact due time, not an instant 10% reduction of the whole timer.
CREATE FUNCTION public.potato_warm_due(p_due timestamptz, p_start timestamptz, p_until timestamptz)
RETURNS timestamptz LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
 SELECT CASE WHEN p_due <= p_start OR p_until <= p_start THEN p_due
 WHEN p_due - p_start <= (p_until - p_start) * 1.1
 THEN p_start + (p_due - p_start) / 1.1
 ELSE p_due - (p_until - p_start) * .1 END;
$$;

CREATE FUNCTION public.potato_battle_multiplier(p_user_id uuid, p_reward text, p_at timestamptz DEFAULT now())
RETURNS numeric LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
 SELECT COALESCE((SELECT CASE
 WHEN p_reward = 'xp' AND effect_key = 'potato_power' THEN 1.1
 WHEN p_reward = 'xp' AND effect_key = 'potato_brain' THEN .9
 WHEN p_reward = 'dots' AND effect_key = 'rotten_luck' THEN .9 ELSE 1 END
 FROM public.poe_tay_toe_finds WHERE user_id = p_user_id
 AND found_at <= p_at AND effect_expires_at > p_at
 ORDER BY found_at DESC LIMIT 1), 1);
$$;

CREATE FUNCTION public.potato_new_incubation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_until timestamptz; v_now timestamptz := statement_timestamp();
BEGIN
 IF NEW.stage::text <> 'egg' OR NEW.location::text <> 'hatchery' OR NEW.hatch_ends_at IS NULL THEN RETURN NEW; END IF;
 IF TG_OP = 'UPDATE' THEN
   IF OLD.hatch_ends_at IS NOT NULL AND OLD.location::text = 'hatchery' THEN RETURN NEW; END IF;
 END IF;
 SELECT effect_expires_at INTO v_until FROM public.poe_tay_toe_finds
 WHERE user_id = NEW.user_id AND effect_key = 'warm_potato'
 AND found_at <= v_now AND effect_expires_at > v_now ORDER BY found_at DESC LIMIT 1;
 IF v_until IS NOT NULL THEN
   NEW.hatch_ends_at := public.potato_warm_due(NEW.hatch_ends_at, v_now, v_until);
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER potato_new_incubation BEFORE INSERT OR UPDATE OF hatch_ends_at, location ON public.pets
 FOR EACH ROW EXECUTE FUNCTION public.potato_new_incubation();

CREATE FUNCTION public.get_poe_tay_toe_status(p_user_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE s public.poe_tay_toe_state%ROWTYPE; f public.poe_tay_toe_finds%ROWTYPE;
 v_last timestamptz; v_count bigint;
BEGIN
 IF p_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT * INTO STRICT s FROM public.poe_tay_toe_state WHERE id = 1;
 SELECT max(found_at), count(*) INTO v_last, v_count FROM public.poe_tay_toe_finds WHERE user_id = p_user_id;
 SELECT * INTO f FROM public.poe_tay_toe_finds WHERE id = s.last_discovery_id
 AND user_id = p_user_id AND relocated_at IS NULL;
 RETURN jsonb_build_object('locationKey',s.current_location_key,'version',s.location_version,
 'available',true,'canFind',v_last IS NULL OR v_last + interval '2 hours' <= now(),
 'cooldownEndsAt',CASE WHEN v_last + interval '2 hours' > now() THEN v_last + interval '2 hours' END,
 'findCount',v_count,'awaitingHide',f.id IS NOT NULL,'discoveryId',f.id,
 'effect',CASE WHEN f.id IS NOT NULL THEN jsonb_build_object('key',f.effect_key,'dots',f.dots_awarded,'expiresAt',f.effect_expires_at) END);
END;
$$;

CREATE FUNCTION public.claim_poe_tay_toe_v2(p_user_id uuid, p_location_key text, p_version uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' SET lock_timeout = '5s' AS $$
DECLARE s public.poe_tay_toe_state%ROWTYPE; v_last timestamptz; v_effect text;
 v_until timestamptz; v_id uuid := gen_random_uuid(); v_now timestamptz;
 v_dots integer := 0; v_spots text[] := public.potato_locations(); v_next text;
BEGIN
 IF p_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF p_version IS NULL OR p_location_key IS NULL OR NOT p_location_key = ANY(v_spots) THEN
   RETURN jsonb_build_object('claimed',false,'reason','invalid_location'); END IF;
 SELECT * INTO STRICT s FROM public.poe_tay_toe_state WHERE id = 1 FOR UPDATE;
 v_now := clock_timestamp();
 IF s.location_version <> p_version OR s.current_location_key <> p_location_key THEN
   RETURN jsonb_build_object('claimed',false,'reason','moved'); END IF;
 SELECT max(found_at) INTO v_last FROM public.poe_tay_toe_finds WHERE user_id = p_user_id;
 IF v_last + interval '2 hours' > v_now THEN
   RETURN jsonb_build_object('claimed',false,'reason','cooldown','cooldownEndsAt',v_last + interval '2 hours'); END IF;
 v_effect := public.potato_effect_for_roll(random()::numeric);
 IF v_effect IN ('potato_power','warm_potato') THEN v_until := v_now + interval '30 minutes';
 ELSIF v_effect IN ('potato_brain','rotten_luck') THEN v_until := v_now + interval '15 minutes'; END IF;
 -- Serialize the short warm grant with incubation writes, including inserts.
 -- Otherwise an egg started concurrently could miss both the grant and trigger.
 IF v_effect = 'warm_potato' THEN
   LOCK TABLE public.pets IN SHARE ROW EXCLUSIVE MODE;
 END IF;
 IF v_effect = 'lucky_spud' THEN
   v_dots := 100;
   INSERT INTO public.wallets(user_id,dots) VALUES (p_user_id,v_dots)
   ON CONFLICT(user_id) DO UPDATE SET dots = public.wallets.dots + v_dots, updated_at = v_now;
 END IF;
 -- Two-hour discovery cooldown exceeds every effect lifetime: effects cannot stack.
 -- Retain this replacement guard if durations are adjusted in a future approved change.
 IF v_until IS NOT NULL THEN
   UPDATE public.poe_tay_toe_finds SET effect_expires_at = v_now
   WHERE user_id = p_user_id AND effect_expires_at > v_now;
 END IF;
 INSERT INTO public.poe_tay_toe_finds(id,user_id,location_key,dots_awarded,item_slug,item_qty,found_at,effect_key,effect_expires_at)
 VALUES(v_id,p_user_id,p_location_key,v_dots,'',0,v_now,v_effect,v_until);
 IF v_effect = 'warm_potato' THEN
   UPDATE public.pets SET hatch_ends_at = public.potato_warm_due(hatch_ends_at,v_now,v_until)
   WHERE user_id = p_user_id AND stage::text = 'egg' AND location::text = 'hatchery' AND hatch_ends_at > v_now;
 END IF;
 -- Move immediately to the next allowed spot. No global pending/abandonment lock.
 v_next := v_spots[(array_position(v_spots,p_location_key) % array_length(v_spots,1)) + 1];
 UPDATE public.poe_tay_toe_state SET current_location_key = v_next, location_version = gen_random_uuid(),
 last_discovery_id = v_id, claimed_by_user_id = NULL, claimed_at = NULL,
 hidden_at = v_now, hidden_by_user_id = NULL, find_count = find_count + 1, updated_at = v_now WHERE id = 1;
 RETURN jsonb_build_object('claimed',true,'discoveryId',v_id,'cooldownEndsAt',v_now + interval '2 hours',
 'effect',jsonb_build_object('key',v_effect,'dots',v_dots,'expiresAt',v_until));
END;
$$;

CREATE FUNCTION public.hide_poe_tay_toe_v2(p_user_id uuid,p_location_key text,p_discovery_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE s public.poe_tay_toe_state%ROWTYPE;
BEGIN
 IF p_user_id IS NULL OR p_discovery_id IS NULL OR p_location_key IS NULL
 OR NOT p_location_key = ANY(public.potato_locations()) THEN RETURN false; END IF;
 SELECT * INTO STRICT s FROM public.poe_tay_toe_state WHERE id = 1 FOR UPDATE;
 IF s.last_discovery_id IS DISTINCT FROM p_discovery_id OR s.current_location_key = p_location_key THEN RETURN false; END IF;
 UPDATE public.poe_tay_toe_finds SET relocated_at = clock_timestamp()
 WHERE id = p_discovery_id AND user_id = p_user_id AND relocated_at IS NULL;
 IF NOT FOUND THEN RETURN false; END IF;
 UPDATE public.poe_tay_toe_state SET current_location_key = p_location_key, location_version = gen_random_uuid(),
 last_discovery_id = NULL, hidden_at = clock_timestamp(), hidden_by_user_id = p_user_id,
 updated_at = clock_timestamp() WHERE id = 1;
 RETURN true;
END;
$$;

-- Old clients must refresh rather than bypass version checks or use old rewards.
CREATE OR REPLACE FUNCTION public.claim_poe_tay_toe(p_user_id uuid,p_location_key text)
RETURNS TABLE(claimed boolean,reason text,cooldown_ends_at timestamptz,dots_awarded integer,item_slug text,item_qty integer)
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
 SELECT false,'refresh_required'::text,NULL::timestamptz,0,NULL::text,0;
$$;
CREATE OR REPLACE FUNCTION public.hide_poe_tay_toe(p_user_id uuid,p_location_key text)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT false; $$;

-- Match the existing server-only authorization boundary. No client policy changes.
DO $$ DECLARE fn regprocedure; BEGIN
 FOR fn IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN
 ('potato_locations','potato_effect_for_roll','potato_warm_due','potato_battle_multiplier',
 'potato_new_incubation','get_poe_tay_toe_status','claim_poe_tay_toe_v2','hide_poe_tay_toe_v2',
 'claim_poe_tay_toe','hide_poe_tay_toe') LOOP
   EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',fn);
   EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',fn);
 END LOOP;
END $$;
COMMIT;
