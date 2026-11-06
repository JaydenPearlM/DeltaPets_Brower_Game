-- UNAPPLIED â€” REQUIRES EXPLICIT APPROVAL
-- Review-only, outside migrations. Run as postgres only after isolated integration tests.
-- Supersedes the earlier level-2-stat-points.proposed.sql; never apply both.
-- No existing-player backfill. Unbalanced skills remain combat_enabled=false.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE public.pet_stat_allocations DROP CONSTRAINT pet_alloc_points_valid;
ALTER TABLE public.pet_stat_allocations ADD CONSTRAINT pet_alloc_points_valid CHECK (
  hp >= 0 AND atk >= 0 AND magi >= 0 AND def >= 0 AND spd >= 0 AND mana >= 0 AND (
    (level = 1 AND hp + atk + magi + def + spd + mana BETWEEN 0 AND 30) OR
    (level = 2 AND hp + atk + magi + def + spd + mana BETWEEN 0 AND 2) OR
    (level > 2 AND hp + atk + magi + def + spd + mana BETWEEN 0 AND 2)
  )
);

CREATE TABLE public.pet_level2_rewards (
  pet_id uuid PRIMARY KEY REFERENCES public.pets(id) ON DELETE CASCADE,
  points_awarded integer NOT NULL DEFAULT 2 CHECK (points_awarded = 2),
  points_spent integer NOT NULL DEFAULT 0 CHECK (points_spent BETWEEN 0 AND 2),
  awarded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.pet_skill_milestone_claims (
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  milestone_key text NOT NULL,
  skill_id uuid NOT NULL REFERENCES public.skill_defs(id) ON DELETE RESTRICT,
  species_id text NOT NULL,
  config_version text NOT NULL,
  eligible_choices jsonb NOT NULL CHECK (jsonb_typeof(eligible_choices) = 'array'),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pet_id, milestone_key)
);
CREATE TABLE public.pet_stat_spend_receipts (
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  allocation jsonb NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pet_id, request_id)
);
ALTER TABLE public.pet_level2_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_skill_milestone_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_stat_spend_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pet_level2_rewards, public.pet_skill_milestone_claims,
  public.pet_stat_spend_receipts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pet_level2_rewards, public.pet_skill_milestone_claims,
  public.pet_stat_spend_receipts TO service_role;
-- Preserve existing SELECT policies and rows. Route future equipment changes through server validation.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.pet_skills,
  public.skill_defs FROM PUBLIC, anon, authenticated;
REVOKE INSERT (pet_id,skill_id,equipped,unlocked_at), UPDATE (pet_id,skill_id,equipped,unlocked_at), REFERENCES (pet_id,skill_id,equipped,unlocked_at)
  ON public.pet_skills FROM PUBLIC, anon, authenticated;
REVOKE INSERT (id,slug,name,description,required_level,requirements,created_at),
  UPDATE (id,slug,name,description,required_level,requirements,created_at),
  REFERENCES (id,slug,name,description,required_level,requirements,created_at)
  ON public.skill_defs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pet_skills TO service_role;
GRANT SELECT ON public.skill_defs TO service_role;

-- Hatch allocations are written by the existing service-role hatch_pet RPC.
-- Keep owner SELECT policies and service-role writes; block direct client spending.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.pet_stat_allocations FROM PUBLIC, anon, authenticated;
REVOKE INSERT (id,pet_id,level,hp,atk,magi,def,spd,mana,created_at,xp),
  UPDATE (id,pet_id,level,hp,atk,magi,def,spd,mana,created_at,xp),
  REFERENCES (id,pet_id,level,hp,atk,magi,def,spd,mana,created_at,xp)
  ON public.pet_stat_allocations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pet_stat_allocations TO service_role;

-- Later-level entitlements are issued only for newly crossed starter levels.
CREATE TABLE public.pet_starter_level_rewards (
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  level integer NOT NULL CHECK (level BETWEEN 3 AND 30),
  points_awarded integer NOT NULL DEFAULT 2 CHECK (points_awarded = 2),
  points_spent integer NOT NULL DEFAULT 0 CHECK (points_spent BETWEEN 0 AND 2),
  PRIMARY KEY (pet_id, level)
);
ALTER TABLE public.pet_starter_level_rewards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pet_starter_level_rewards FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pet_starter_level_rewards TO service_role;

-- CHECK constraints cannot consult species. Preserve the non-starter rule here.
CREATE FUNCTION public.guard_starter_allocation() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE species_id text;
BEGIN
  IF NEW.level > 2 THEN
    SELECT species INTO species_id FROM public.pets WHERE id=NEW.pet_id FOR UPDATE;
    IF species_id IS NULL THEN RAISE EXCEPTION 'L2_NOT_FOUND'; END IF;
    IF species_id = ANY (ARRAY['water_starter','fire_starter','earth_starter','air_starter','ice_starter','storm_starter','light_starter','shadow_night_bad','shadow_day_good']) THEN
      IF NOT EXISTS (SELECT 1 FROM public.pet_starter_level_rewards r
        WHERE r.pet_id=NEW.pet_id AND r.level=NEW.level
          AND r.points_spent=NEW.hp+NEW.atk+NEW.magi+NEW.def+NEW.spd+NEW.mana) THEN
        RAISE EXCEPTION 'L2_RECONCILIATION_REQUIRED';
      END IF;
    ELSIF NEW.hp+NEW.atk+NEW.magi+NEW.def+NEW.spd+NEW.mana <> 1 THEN
      RAISE EXCEPTION 'L2_POINTS';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_starter_allocation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_starter_allocation() TO service_role;
CREATE TRIGGER guard_starter_allocation AFTER INSERT OR UPDATE ON public.pet_stat_allocations
FOR EACH ROW EXECUTE FUNCTION public.guard_starter_allocation();

CREATE FUNCTION public.claim_level2_skill(p_user_id uuid, p_pet_id uuid, p_skill_slug text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  pet public.pets%ROWTYPE;
  chosen public.skill_defs%ROWTYPE;
  claim public.pet_skill_milestone_claims%ROWTYPE;
  choices jsonb;
  candidate_count integer;
  role_count integer;
BEGIN
  SELECT * INTO pet FROM public.pets WHERE id = p_pet_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'L2_NOT_FOUND'; END IF;
  SELECT * INTO claim FROM public.pet_skill_milestone_claims
    WHERE pet_id = p_pet_id AND milestone_key = 'level-2';
  IF FOUND THEN
    IF EXISTS (SELECT 1 FROM public.skill_defs WHERE id = claim.skill_id AND slug = p_skill_slug)
      AND EXISTS (SELECT 1 FROM public.pet_skills WHERE pet_id = p_pet_id AND skill_id = claim.skill_id) THEN
      RETURN jsonb_build_object('skill_id', claim.skill_id, 'milestone_key', 'level-2');
    END IF;
    RAISE EXCEPTION 'L2_CONFLICT';
  END IF;
  IF pet.level < 2 OR pet.level > 30 OR pet.stage::text = 'egg' THEN RAISE EXCEPTION 'L2_INELIGIBLE'; END IF;
  -- Lock approved definitions so configuration cannot change during selection.
  PERFORM id FROM public.skill_defs
    WHERE requirements->>'milestone_key' = 'level-2'
      AND requirements->'species_ids' ? pet.species ORDER BY id FOR SHARE;
  SELECT * INTO chosen FROM public.skill_defs WHERE slug = p_skill_slug;
  IF NOT FOUND OR chosen.required_level <> 2
    OR (chosen.requirements->'species_ids' ? pet.species) IS DISTINCT FROM true
    OR chosen.requirements->>'element' IS DISTINCT FROM pet.line::text
    OR coalesce(chosen.requirements->>'role','') NOT IN ('tank','healer','dps','sorcerer')
    OR chosen.requirements->>'milestone_key' IS DISTINCT FROM 'level-2'
    OR chosen.requirements->>'config_version' IS DISTINCT FROM 'level-2-v1'
    OR chosen.requirements->>'combat_enabled' IS DISTINCT FROM 'false'
    OR jsonb_typeof(chosen.requirements->'prerequisite_slugs') IS DISTINCT FROM 'array'
  THEN RAISE EXCEPTION 'L2_INELIGIBLE'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(chosen.requirements->'prerequisite_slugs') required(slug)
    WHERE NOT EXISTS (SELECT 1 FROM public.pet_skills ps JOIN public.skill_defs sd ON sd.id = ps.skill_id
      WHERE ps.pet_id = p_pet_id AND sd.slug = required.slug)) THEN RAISE EXCEPTION 'L2_INELIGIBLE'; END IF;
  SELECT count(*), count(DISTINCT requirements->>'role'),
    jsonb_agg(jsonb_build_object('id', id, 'slug', slug, 'name', name,
      'required_level', required_level, 'requirements', requirements) ORDER BY slug)
    INTO candidate_count, role_count, choices FROM public.skill_defs
    WHERE required_level = 2 AND requirements->>'milestone_key' = 'level-2'
      AND requirements->>'config_version' = 'level-2-v1'
      AND requirements->'species_ids' ? pet.species
      AND requirements->>'element' = pet.line::text
      AND requirements->>'role' IN ('tank','healer','dps','sorcerer')
      AND requirements->>'combat_enabled' = 'false';
  IF candidate_count <> 4 OR role_count <> 4 THEN RAISE EXCEPTION 'L2_CONFIG'; END IF;
  IF EXISTS (SELECT 1 FROM public.pet_skills ps JOIN public.skill_defs sd ON sd.id = ps.skill_id
    WHERE ps.pet_id = p_pet_id AND sd.requirements->>'milestone_key' = 'level-2') THEN
    RAISE EXCEPTION 'L2_RECONCILIATION_REQUIRED';
  END IF;
  INSERT INTO public.pet_skill_milestone_claims(pet_id,milestone_key,skill_id,species_id,config_version,eligible_choices)
    VALUES(p_pet_id,'level-2',chosen.id,pet.species,'level-2-v1',choices);
  INSERT INTO public.pet_skills(pet_id,skill_id,equipped) VALUES(p_pet_id,chosen.id,false);
  RETURN jsonb_build_object('skill_id',chosen.id,'milestone_key','level-2');
END;
$$;
REVOKE ALL ON FUNCTION public.claim_level2_skill(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_level2_skill(uuid,uuid,text) TO service_role;

CREATE FUNCTION public.allocate_level2_stats(p_user_id uuid, p_pet_id uuid, p_request_id uuid, p_allocation jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  pet public.pets%ROWTYPE;
  reward public.pet_level2_rewards%ROWTYPE;
  receipt public.pet_stat_spend_receipts%ROWTYPE;
  base public.pet_stats%ROWTYPE;
  old_alloc public.pet_stat_allocations%ROWTYPE;
  total_cost integer;
  h integer; a integer; m integer; d integer; s integer; n integer;
  result jsonb;
  starter boolean;
  earned record;
  remaining integer;
  stat_key text;
  portion integer;
  spend_level integer;
  spend jsonb;
BEGIN
  IF p_request_id IS NULL OR jsonb_typeof(p_allocation) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'L2_INELIGIBLE'; END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(p_allocation)) <> 6
    OR NOT p_allocation ?& ARRAY['hp','atk','magi','def','spd','mana']
    OR EXISTS (SELECT 1 FROM jsonb_each(p_allocation) e WHERE jsonb_typeof(e.value) <> 'number'
      OR e.value::text !~ '^([0-9]|[1-4][0-9]|5[0-8])$') THEN RAISE EXCEPTION 'L2_INELIGIBLE'; END IF;
  h := (p_allocation->>'hp')::integer; a := (p_allocation->>'atk')::integer;
  m := (p_allocation->>'magi')::integer; d := (p_allocation->>'def')::integer;
  s := (p_allocation->>'spd')::integer; n := (p_allocation->>'mana')::integer;
  total_cost := h+a+m+d+s+n;
  IF total_cost NOT BETWEEN 1 AND 58 THEN RAISE EXCEPTION 'L2_POINTS'; END IF;
  SELECT * INTO pet FROM public.pets WHERE id=p_pet_id AND user_id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'L2_NOT_FOUND'; END IF;
  SELECT * INTO receipt FROM public.pet_stat_spend_receipts WHERE pet_id=p_pet_id AND request_id=p_request_id;
  IF FOUND THEN
    IF receipt.allocation IS DISTINCT FROM p_allocation THEN RAISE EXCEPTION 'L2_CONFLICT'; END IF;
    -- Validate the recorded request, not current stats: later spending is legitimate.
    IF jsonb_typeof(receipt.result) IS DISTINCT FROM 'object'
      OR receipt.result->'pet_id' IS DISTINCT FROM to_jsonb(receipt.pet_id::text)
      OR receipt.result->'request_id' IS DISTINCT FROM to_jsonb(receipt.request_id::text)
      OR receipt.result->'spent' IS DISTINCT FROM to_jsonb(total_cost) THEN
      RAISE EXCEPTION 'L2_RECONCILIATION_REQUIRED';
    END IF;
    RETURN receipt.result;
  END IF;
  IF pet.level < 2 OR pet.level > 30 OR pet.stage::text='egg' THEN RAISE EXCEPTION 'L2_INELIGIBLE'; END IF;
  starter := pet.species = ANY (ARRAY['water_starter','fire_starter','earth_starter','air_starter','ice_starter','storm_starter','light_starter','shadow_night_bad','shadow_day_good']);
  IF NOT starter AND total_cost > 2 THEN RAISE EXCEPTION 'L2_POINTS'; END IF;
  SELECT * INTO reward FROM public.pet_level2_rewards WHERE pet_id=p_pet_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'L2_RECONCILIATION_REQUIRED'; END IF;
  IF pet.unspent_points < total_cost OR (NOT starter AND reward.points_spent+total_cost > 2) THEN RAISE EXCEPTION 'L2_POINTS'; END IF;
  SELECT * INTO old_alloc FROM public.pet_stat_allocations WHERE pet_id=p_pet_id AND level=2 FOR UPDATE;
  IF coalesce(old_alloc.hp+old_alloc.atk+old_alloc.magi+old_alloc.def+old_alloc.spd+old_alloc.mana,0)
    <> reward.points_spent THEN RAISE EXCEPTION 'L2_RECONCILIATION_REQUIRED'; END IF;
  IF starter THEN
    PERFORM 1 FROM public.pet_starter_level_rewards WHERE pet_id=p_pet_id ORDER BY level FOR UPDATE;
    -- Missing history is ambiguous, never manufacture earned points from current level.
    IF (SELECT count(*) FROM public.pet_starter_level_rewards WHERE pet_id=p_pet_id AND level<=pet.level) <> pet.level-2
      OR EXISTS (SELECT 1 FROM public.pet_starter_level_rewards r
        LEFT JOIN public.pet_stat_allocations a ON a.pet_id=r.pet_id AND a.level=r.level
        WHERE r.pet_id=p_pet_id AND (r.level>pet.level OR r.points_spent<>
          coalesce(a.hp+a.atk+a.magi+a.def+a.spd+a.mana,0))) THEN
      RAISE EXCEPTION 'L2_RECONCILIATION_REQUIRED';
    END IF;
    IF total_cost > 2-reward.points_spent + (SELECT coalesce(sum(2-points_spent),0)
      FROM public.pet_starter_level_rewards WHERE pet_id=p_pet_id) THEN RAISE EXCEPTION 'L2_POINTS'; END IF;
  END IF;
  SELECT * INTO base FROM public.pet_stats WHERE pet_id=p_pet_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'L2_RECONCILIATION_REQUIRED'; END IF;
  -- Fail instead of silently overwriting existing combat stat discrepancies.
  IF NOT EXISTS (SELECT 1 FROM (
      SELECT coalesce(sum(hp),0) hp,coalesce(sum(atk),0) atk,coalesce(sum(magi),0) magi,
        coalesce(sum(def),0) def,coalesce(sum(spd),0) spd,coalesce(sum(mana),0) mana
      FROM public.pet_stat_allocations WHERE pet_id=p_pet_id) totals
    WHERE pet.hp_max=greatest(1,2*(base.base_hp+totals.hp)) AND pet.atk=base.base_atk+totals.atk
      AND pet.magi=base.base_magi+totals.magi AND pet.def=base.base_def+totals.def
      AND pet.spd=base.base_spd+totals.spd AND pet.mana=base.base_mana+totals.mana
  ) THEN RAISE EXCEPTION 'L2_RECONCILIATION_REQUIRED'; END IF;
  IF starter THEN
    spend := p_allocation;
    FOR earned IN
      SELECT 2 AS level, 2-reward.points_spent AS available
      UNION ALL SELECT level,2-points_spent FROM public.pet_starter_level_rewards WHERE pet_id=p_pet_id
      ORDER BY level
    LOOP
      remaining := earned.available;
      FOREACH stat_key IN ARRAY ARRAY['hp','atk','magi','def','spd','mana'] LOOP
        portion := least(remaining,(spend->>stat_key)::integer);
        IF portion=0 THEN CONTINUE; END IF;
        spend_level := earned.level;
        IF spend_level=2 THEN
          UPDATE public.pet_level2_rewards SET points_spent=points_spent+portion WHERE pet_id=p_pet_id;
        ELSE
          UPDATE public.pet_starter_level_rewards SET points_spent=points_spent+portion
            WHERE pet_id=p_pet_id AND level=spend_level;
        END IF;
        INSERT INTO public.pet_stat_allocations(pet_id,level,hp,atk,magi,def,spd,mana)
          VALUES(p_pet_id,spend_level,
            CASE WHEN stat_key='hp' THEN portion ELSE 0 END,
            CASE WHEN stat_key='atk' THEN portion ELSE 0 END,
            CASE WHEN stat_key='magi' THEN portion ELSE 0 END,
            CASE WHEN stat_key='def' THEN portion ELSE 0 END,
            CASE WHEN stat_key='spd' THEN portion ELSE 0 END,
            CASE WHEN stat_key='mana' THEN portion ELSE 0 END)
          ON CONFLICT(pet_id,level) DO UPDATE SET
            hp=public.pet_stat_allocations.hp+excluded.hp, atk=public.pet_stat_allocations.atk+excluded.atk,
            magi=public.pet_stat_allocations.magi+excluded.magi, def=public.pet_stat_allocations.def+excluded.def,
            spd=public.pet_stat_allocations.spd+excluded.spd, mana=public.pet_stat_allocations.mana+excluded.mana;
        spend := jsonb_set(spend,ARRAY[stat_key],to_jsonb((spend->>stat_key)::integer-portion));
        remaining := remaining-portion;
      END LOOP;
    END LOOP;
    IF EXISTS (SELECT 1 FROM jsonb_each_text(spend) e WHERE e.value::integer <> 0) THEN
      RAISE EXCEPTION 'L2_RECONCILIATION_REQUIRED';
    END IF;
  ELSE
  INSERT INTO public.pet_stat_allocations(pet_id,level,hp,atk,magi,def,spd,mana)
    VALUES(p_pet_id,2,h,a,m,d,s,n)
    ON CONFLICT(pet_id,level) DO UPDATE SET
      hp=public.pet_stat_allocations.hp+excluded.hp, atk=public.pet_stat_allocations.atk+excluded.atk,
      magi=public.pet_stat_allocations.magi+excluded.magi, def=public.pet_stat_allocations.def+excluded.def,
      spd=public.pet_stat_allocations.spd+excluded.spd, mana=public.pet_stat_allocations.mana+excluded.mana;
  UPDATE public.pet_level2_rewards SET points_spent=points_spent+total_cost WHERE pet_id=p_pet_id;
  END IF;
  -- HP current is intentionally untouched: allocation must not heal.
  UPDATE public.pets SET unspent_points=unspent_points-total_cost, hp_max=hp_max+2*h,
    atk=atk+a,magi=magi+m,def=def+d,spd=spd+s,mana=mana+n WHERE id=p_pet_id RETURNING * INTO pet;
  result := jsonb_build_object('request_id',p_request_id,'pet_id',p_pet_id,'spent',total_cost,
    'unspent_points',pet.unspent_points,'hp_max',pet.hp_max,'hp_cur',pet.hp_cur,
    'atk',pet.atk,'magi',pet.magi,'def',pet.def,'spd',pet.spd,'mana',pet.mana);
  INSERT INTO public.pet_stat_spend_receipts(pet_id,request_id,allocation,result) VALUES(p_pet_id,p_request_id,p_allocation,result);
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.allocate_level2_stats(uuid,uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_level2_stats(uuid,uuid,uuid,jsonb) TO service_role;

-- Catalog proposal generated from current Twiglet design; collisions require review.
DO $seed$
BEGIN
  IF EXISTS (SELECT 1 FROM public.skill_defs WHERE slug='root-brace') THEN RAISE EXCEPTION 'Skill slug already exists; review required'; END IF;
  INSERT INTO public.skill_defs(slug,name,description,required_level,requirements) VALUES('root-brace','Root Brace','Twiglet briefly roots itself into the ground, gaining a minor defensive benefit.',2,'{"species_ids": ["earth_starter"], "element": "earth", "role": "tank", "category": "defense", "milestone_key": "level-2", "config_version": "level-2-v1", "combat_enabled": false, "prerequisite_slugs": [], "effect": {"damage": null, "healing_amount": null, "defense_modifier": null, "duration_turns": null, "accuracy": null, "mana_cost": null, "cooldown": null, "target": "self_proposed"}}'::jsonb);
  IF EXISTS (SELECT 1 FROM public.skill_defs WHERE slug='sprout-mend') THEN RAISE EXCEPTION 'Skill slug already exists; review required'; END IF;
  INSERT INTO public.skill_defs(slug,name,description,required_level,requirements) VALUES('sprout-mend','Sprout Mend','Twiglet grows a small leaf to restore a little HP.',2,'{"species_ids": ["earth_starter"], "element": "earth", "role": "healer", "category": "healing", "milestone_key": "level-2", "config_version": "level-2-v1", "combat_enabled": false, "prerequisite_slugs": [], "effect": {"damage": null, "healing_amount": null, "defense_modifier": null, "duration_turns": null, "accuracy": null, "mana_cost": null, "cooldown": null, "target": null}}'::jsonb);
  IF EXISTS (SELECT 1 FROM public.skill_defs WHERE slug='seed-tap') THEN RAISE EXCEPTION 'Skill slug already exists; review required'; END IF;
  INSERT INTO public.skill_defs(slug,name,description,required_level,requirements) VALUES('seed-tap','Seed Tap','Twiglet launches a hardened seed for light physical damage.',2,'{"species_ids": ["earth_starter"], "element": "earth", "role": "dps", "category": "physical_damage", "milestone_key": "level-2", "config_version": "level-2-v1", "combat_enabled": false, "prerequisite_slugs": [], "effect": {"damage": null, "healing_amount": null, "defense_modifier": null, "duration_turns": null, "accuracy": null, "mana_cost": null, "cooldown": null, "target": "one_enemy"}}'::jsonb);
  IF EXISTS (SELECT 1 FROM public.skill_defs WHERE slug='pollen-puff') THEN RAISE EXCEPTION 'Skill slug already exists; review required'; END IF;
  INSERT INTO public.skill_defs(slug,name,description,required_level,requirements) VALUES('pollen-puff','Pollen Puff','Twiglet releases magical pollen for light ranged Earth damage.',2,'{"species_ids": ["earth_starter"], "element": "earth", "role": "sorcerer", "category": "ranged_magic", "milestone_key": "level-2", "config_version": "level-2-v1", "combat_enabled": false, "prerequisite_slugs": [], "effect": {"damage": null, "healing_amount": null, "defense_modifier": null, "duration_turns": null, "accuracy": null, "mana_cost": null, "cooldown": null, "target": "one_enemy"}}'::jsonb);
END;
$seed$;
DO $guard$
DECLARE actual text;
BEGIN
  SELECT prosrc INTO actual FROM pg_proc
  WHERE oid = to_regprocedure('public.settle_wildwood_victory_xp(uuid,uuid)');
  IF actual IS NULL OR btrim(replace(actual, chr(13), '')) <> btrim($expected$
DECLARE
  v_room public.wildwood_rooms%ROWTYPE;
  v_pet public.pets%ROWTYPE;
  v_players jsonb;
  v_pet_id uuid;
  v_level integer;
  v_xp integer;
  v_reward jsonb;
BEGIN
  SELECT room.* INTO v_room
  FROM public.wildwood_rooms room
  JOIN public.wildwood_expeditions expedition ON expedition.id = room.expedition_id
  WHERE room.id = p_room_id AND expedition.user_id = p_user_id
  FOR UPDATE OF room;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wildwood room not found' USING ERRCODE = '23514';
  END IF;
  IF v_room.status <> 'resolved'
    OR v_room.event_kind <> 'corrupted_battle'
    OR (v_room.event_payload ->> 'xpRewardVersion') IS DISTINCT FROM '1'
    OR (v_room.event_payload ->> 'recordBattleStats') IS DISTINCT FROM 'true'
    OR (v_room.event_payload #>> '{battle,status}') IS DISTINCT FROM 'victory'
    OR (v_room.event_payload #>> '{battle,id}') IS DISTINCT FROM v_room.battle_id::text
  THEN
    RAISE EXCEPTION 'No eligible Wildwood victory' USING ERRCODE = '23514';
  END IF;
  SELECT jsonb_agg(participant) INTO v_players
  FROM jsonb_array_elements(v_room.event_payload #> '{battle,participants}') participant
  WHERE participant ->> 'side' = 'player';
  IF jsonb_array_length(v_players) IS DISTINCT FROM 1
    OR jsonb_array_length(v_room.event_payload #> '{battle,participants}') IS DISTINCT FROM 2
    OR (v_players #>> '{0,defeated}') IS DISTINCT FROM 'false'
    OR COALESCE((v_players #>> '{0,hpCur}')::integer, 0) <= 0
  THEN
    RAISE EXCEPTION 'Expected one living player participant' USING ERRCODE = '23514';
  END IF;
  v_pet_id := COALESCE(v_players #>> '{0,sourcePetId}', v_players #>> '{0,id}')::uuid;
  SELECT * INTO v_pet FROM public.pets
  WHERE id = v_pet_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Battle participant ownership changed' USING ERRCODE = '23514';
  END IF;
  IF v_room.event_payload ? 'xpReward' THEN
    RETURN v_room.event_payload -> 'xpReward';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.pet_battle_results
    WHERE battle_id = v_room.battle_id AND pet_id = v_pet_id
      AND user_id = p_user_id AND result = 'victory'
  ) THEN
    RAISE EXCEPTION 'Battle result must be recorded before XP' USING ERRCODE = '23514';
  END IF;
  IF v_pet.level NOT BETWEEN 1 AND 30 OR v_pet.xp < 0 THEN
    RAISE EXCEPTION 'Invalid pet progression state' USING ERRCODE = '23514';
  END IF;
  -- Preserve lifetime XP. Reaching level L costs 100 * (1 + ... + L-1).
  -- Existing higher levels are never reduced and existing XP is never reset.
  v_xp := v_pet.xp + 25;
  v_level := v_pet.level;
  WHILE v_level < 30 AND v_xp >= 50 * v_level * (v_level + 1) LOOP
    v_level := v_level + 1;
  END LOOP;
  v_reward := jsonb_build_object(
    'petId', v_pet_id, 'amount', 25, 'previousXp', v_pet.xp, 'xp', v_xp,
    'previousLevel', v_pet.level, 'level', v_level,
    'pointsEarned', v_level - v_pet.level
  );
  UPDATE public.pets SET xp = v_xp, level = v_level,
    unspent_points = unspent_points + (v_level - v_pet.level)
  WHERE id = v_pet_id;
  UPDATE public.wildwood_rooms
  SET event_payload = jsonb_set(event_payload, '{xpReward}', v_reward)
  WHERE id = p_room_id;
  RETURN v_reward;
END;
$expected$) THEN
    RAISE EXCEPTION 'Live progression function differs from reviewed source; stop and review';
  END IF;
END;
$guard$;
CREATE OR REPLACE FUNCTION public.settle_wildwood_victory_xp(p_user_id uuid, p_room_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_room public.wildwood_rooms%ROWTYPE;
  v_pet public.pets%ROWTYPE;
  v_players jsonb;
  v_pet_id uuid;
  v_level integer;
  v_xp integer;
  v_points integer;
  v_reward jsonb;
BEGIN
  SELECT room.* INTO v_room
  FROM public.wildwood_rooms room
  JOIN public.wildwood_expeditions expedition ON expedition.id = room.expedition_id
  WHERE room.id = p_room_id AND expedition.user_id = p_user_id
  FOR UPDATE OF room;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wildwood room not found' USING ERRCODE = '23514';
  END IF;
  IF v_room.status <> 'resolved'
    OR v_room.event_kind <> 'corrupted_battle'
    OR (v_room.event_payload ->> 'xpRewardVersion') IS DISTINCT FROM '1'
    OR (v_room.event_payload ->> 'recordBattleStats') IS DISTINCT FROM 'true'
    OR (v_room.event_payload #>> '{battle,status}') IS DISTINCT FROM 'victory'
    OR (v_room.event_payload #>> '{battle,id}') IS DISTINCT FROM v_room.battle_id::text
  THEN
    RAISE EXCEPTION 'No eligible Wildwood victory' USING ERRCODE = '23514';
  END IF;
  SELECT jsonb_agg(participant) INTO v_players
  FROM jsonb_array_elements(v_room.event_payload #> '{battle,participants}') participant
  WHERE participant ->> 'side' = 'player';
  IF jsonb_array_length(v_players) IS DISTINCT FROM 1
    OR jsonb_array_length(v_room.event_payload #> '{battle,participants}') IS DISTINCT FROM 2
    OR (v_players #>> '{0,defeated}') IS DISTINCT FROM 'false'
    OR COALESCE((v_players #>> '{0,hpCur}')::integer, 0) <= 0
  THEN
    RAISE EXCEPTION 'Expected one living player participant' USING ERRCODE = '23514';
  END IF;
  v_pet_id := COALESCE(v_players #>> '{0,sourcePetId}', v_players #>> '{0,id}')::uuid;
  SELECT * INTO v_pet FROM public.pets
  WHERE id = v_pet_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Battle participant ownership changed' USING ERRCODE = '23514';
  END IF;
  IF v_room.event_payload ? 'xpReward' THEN
    RETURN v_room.event_payload -> 'xpReward';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.pet_battle_results
    WHERE battle_id = v_room.battle_id AND pet_id = v_pet_id
      AND user_id = p_user_id AND result = 'victory'
  ) THEN
    RAISE EXCEPTION 'Battle result must be recorded before XP' USING ERRCODE = '23514';
  END IF;
  IF v_pet.level NOT BETWEEN 1 AND 30 OR v_pet.xp < 0 THEN
    RAISE EXCEPTION 'Invalid pet progression state' USING ERRCODE = '23514';
  END IF;
  -- Preserve lifetime XP. Reaching level L costs 100 * (1 + ... + L-1).
  -- Existing higher levels are never reduced and existing XP is never reset.
  v_xp := v_pet.xp + 25;
  v_level := v_pet.level;
  WHILE v_level < 30 AND v_xp >= 50 * v_level * (v_level + 1) LOOP
    v_level := v_level + 1;
  END LOOP;
  -- Exact STARTER_SPROUTS species IDs, not elemental-line eligibility.
  v_points := CASE WHEN v_pet.species = ANY (ARRAY[
    'water_starter','fire_starter','earth_starter','air_starter','ice_starter',
    'storm_starter','light_starter','shadow_night_bad','shadow_day_good'
  ]) THEN 2 * (v_level - v_pet.level)
  ELSE (v_level - v_pet.level) + CASE WHEN v_pet.level < 2 AND v_level >= 2 THEN 1 ELSE 0 END END;
  IF v_pet.level < 2 AND v_level >= 2 THEN
    INSERT INTO public.pet_level2_rewards(pet_id) VALUES(v_pet_id);
  END IF;
  IF v_pet.species = ANY (ARRAY['water_starter','fire_starter','earth_starter','air_starter','ice_starter','storm_starter','light_starter','shadow_night_bad','shadow_day_good']) THEN
    INSERT INTO public.pet_starter_level_rewards(pet_id,level)
      SELECT v_pet_id, earned_level FROM generate_series(greatest(3,v_pet.level+1),v_level) earned_level;
  END IF;
  v_reward := jsonb_build_object(
    'petId', v_pet_id, 'amount', 25, 'previousXp', v_pet.xp, 'xp', v_xp,
    'previousLevel', v_pet.level, 'level', v_level,
    'pointsEarned', v_points
  );
  UPDATE public.pets SET xp = v_xp, level = v_level,
    unspent_points = unspent_points + v_points
  WHERE id = v_pet_id;
  UPDATE public.wildwood_rooms
  SET event_payload = jsonb_set(event_payload, '{xpReward}', v_reward)
  WHERE id = p_room_id;
  RETURN v_reward;
END;
$$;

ROLLBACK;
