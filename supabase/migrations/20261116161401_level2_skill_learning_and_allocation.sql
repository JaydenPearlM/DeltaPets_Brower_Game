-- Compatibility and recovery: output/level2-persistence-migration.md.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS public.pet_skill_milestone_claims (
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  milestone_key text NOT NULL CHECK (milestone_key = 'level-2'),
  skill_id uuid NOT NULL REFERENCES public.skill_defs(id),
  species_id text NOT NULL,
  config_version text NOT NULL,
  eligible_choices jsonb NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pet_id, milestone_key)
);
CREATE TABLE IF NOT EXISTS public.pet_stat_spend_receipts (
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  allocation jsonb NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pet_id, request_id)
);
ALTER TABLE public.pet_skill_milestone_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_stat_spend_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pet_skill_milestone_claims, public.pet_stat_spend_receipts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.pet_skill_milestone_claims, public.pet_stat_spend_receipts TO service_role;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.pet_skills, public.skill_defs FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_level2_skill(p_user_id uuid, p_pet_id uuid, p_skill_slug text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  p public.pets%ROWTYPE; d public.skill_defs%ROWTYPE;
  c public.pet_skill_milestone_claims%ROWTYPE; choices jsonb;
BEGIN
  SELECT * INTO p FROM public.pets WHERE id = p_pet_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'L2_NOT_FOUND'; END IF;
  IF p.level < 2 OR p.species IS NULL OR p.species NOT IN ('light_starter','kithna_clodian')
    OR p.stage = 'egg' OR p.ran_away THEN RAISE EXCEPTION 'L2_INELIGIBLE'; END IF;
  SELECT * INTO d FROM public.skill_defs WHERE slug = p_skill_slug FOR SHARE;
  IF NOT FOUND OR d.required_level <> 2
    OR (d.requirements->>'config_version') IS DISTINCT FROM 'level-2-v1'
    OR (d.requirements->>'milestone_key') IS DISTINCT FROM 'level-2'
    OR (d.requirements->>'combat_enabled') IS DISTINCT FROM 'true'
    OR (d.requirements->'prerequisite_slugs') IS DISTINCT FROM '[]'::jsonb
    OR (d.requirements->>'element') IS DISTINCT FROM p.line
    OR NOT COALESCE((d.requirements->'species_ids') ? p.species, false)
    OR NOT (p.species = 'light_starter' AND p_skill_slug IN ('solen-angelic-ward','solen-gleam-jab','solen-mending-light','solen-radiant-bolt')
      OR p.species = 'kithna_clodian' AND p_skill_slug IN ('clodion-stormfeather-guard','clodion-thunder-talon','clodion-gentle-updraft','clodion-static-gust'))
  THEN RAISE EXCEPTION 'L2_CONFIG'; END IF;
  SELECT * INTO c FROM public.pet_skill_milestone_claims WHERE pet_id = p_pet_id AND milestone_key = 'level-2';
  IF FOUND THEN
    IF c.skill_id <> d.id THEN RAISE EXCEPTION 'L2_CONFLICT'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.pet_skills WHERE pet_id = p_pet_id AND skill_id = d.id)
      THEN RAISE EXCEPTION 'L2_RECONCILIATION_REQUIRED'; END IF;
    RETURN jsonb_build_object('skill_id',d.id,'milestone_key','level-2');
  END IF;
  -- Preserve historical learned rows; do not infer an unrecorded milestone choice.
  IF EXISTS (SELECT 1 FROM public.pet_skills ps JOIN public.skill_defs sd ON sd.id = ps.skill_id
    WHERE ps.pet_id = p_pet_id AND (
      sd.requirements->>'milestone_key' = 'level-2'
      OR sd.slug IN ('solen-angelic-ward','solen-gleam-jab','solen-mending-light','solen-radiant-bolt',
        'clodion-stormfeather-guard','clodion-thunder-talon','clodion-gentle-updraft','clodion-static-gust')))
    THEN RAISE EXCEPTION 'L2_RECONCILIATION_REQUIRED'; END IF;
  SELECT jsonb_agg(sd.slug ORDER BY sd.slug) INTO choices FROM public.skill_defs sd
    WHERE sd.requirements->>'milestone_key' = 'level-2' AND sd.requirements->'species_ids' ? p.species;
  INSERT INTO public.pet_skills(pet_id,skill_id,equipped) VALUES(p_pet_id,d.id,false);
  INSERT INTO public.pet_skill_milestone_claims(pet_id,milestone_key,skill_id,species_id,config_version,eligible_choices)
    VALUES(p_pet_id,'level-2',d.id,p.species,'level-2-v1',choices);
  RETURN jsonb_build_object('skill_id',d.id,'milestone_key','level-2');
END; $$;

CREATE OR REPLACE FUNCTION public.allocate_level2_stats(p_user_id uuid, p_pet_id uuid, p_request_id uuid, p_allocation jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  p public.pets%ROWTYPE; old_request public.pet_stat_spend_receipts%ROWTYPE;
  k text; n integer; spent integer := 0; available_levels integer[]; idx integer := 1;
  receipt jsonb; h integer; a integer; m integer; d integer; s integer; mp integer;
BEGIN
  IF p_request_id IS NULL OR jsonb_typeof(p_allocation) IS DISTINCT FROM 'object'
    THEN RAISE EXCEPTION 'L2_POINTS'; END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(p_allocation)) <> 6
    THEN RAISE EXCEPTION 'L2_POINTS'; END IF;
  FOREACH k IN ARRAY ARRAY['hp','atk','magi','def','spd','mana'] LOOP
    IF NOT p_allocation ? k OR jsonb_typeof(p_allocation->k) <> 'number'
      OR (p_allocation->>k) !~ '^(0|[1-9][0-9]?)$' THEN RAISE EXCEPTION 'L2_POINTS'; END IF;
    n := (p_allocation->>k)::integer;
    IF n > 29 THEN RAISE EXCEPTION 'L2_POINTS'; END IF;
    spent := spent + n;
  END LOOP;
  IF spent < 1 OR spent > 29 THEN RAISE EXCEPTION 'L2_POINTS'; END IF;
  SELECT * INTO p FROM public.pets WHERE id = p_pet_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'L2_NOT_FOUND'; END IF;
  IF p.species IS NULL OR p.species NOT IN ('light_starter','kithna_clodian') OR p.stage = 'egg' OR p.ran_away
    THEN RAISE EXCEPTION 'L2_INELIGIBLE'; END IF;
  SELECT * INTO old_request FROM public.pet_stat_spend_receipts WHERE pet_id = p_pet_id AND request_id = p_request_id;
  IF FOUND THEN
    IF old_request.allocation <> p_allocation THEN RAISE EXCEPTION 'L2_CONFLICT'; END IF;
    RETURN old_request.result;
  END IF;
  IF p.level NOT BETWEEN 2 AND 30 OR spent > p.unspent_points THEN RAISE EXCEPTION 'L2_POINTS'; END IF;
  SELECT array_agg(l ORDER BY l) INTO available_levels FROM generate_series(2,p.level) l
    WHERE NOT EXISTS (SELECT 1 FROM public.pet_stat_allocations pa WHERE pa.pet_id = p_pet_id AND pa.level = l);
  IF p.unspent_points <> COALESCE(cardinality(available_levels),0)
    OR EXISTS (SELECT 1 FROM public.pet_stat_allocations pa WHERE pa.pet_id = p_pet_id AND pa.level > p.level)
    THEN RAISE EXCEPTION 'L2_RECONCILIATION_REQUIRED'; END IF;
  -- Preserve existing stat components; discrepancies require review, not overwrite.
  IF NOT EXISTS (SELECT 1 FROM public.pet_stats base CROSS JOIN LATERAL (
    SELECT coalesce(sum(hp),0) hp,coalesce(sum(atk),0) atk,coalesce(sum(magi),0) magi,
      coalesce(sum(def),0) def,coalesce(sum(spd),0) spd,coalesce(sum(mana),0) mana
    FROM public.pet_stat_allocations WHERE pet_id=p_pet_id
  ) totals WHERE base.pet_id=p_pet_id
    AND p.hp_max=greatest(1,2*(base.base_hp+totals.hp)) AND p.atk=base.base_atk+totals.atk
    AND p.magi=base.base_magi+totals.magi AND p.def=base.base_def+totals.def
    AND p.spd=base.base_spd+totals.spd AND p.mana=base.base_mana+totals.mana)
    THEN RAISE EXCEPTION 'L2_RECONCILIATION_REQUIRED'; END IF;
  FOREACH k IN ARRAY ARRAY['hp','atk','magi','def','spd','mana'] LOOP
    FOR n IN 1..(p_allocation->>k)::integer LOOP
      INSERT INTO public.pet_stat_allocations(pet_id,level,hp,atk,magi,def,spd,mana)
        VALUES(p_pet_id,available_levels[idx],(k='hp')::integer,(k='atk')::integer,(k='magi')::integer,
          (k='def')::integer,(k='spd')::integer,(k='mana')::integer);
      idx := idx + 1;
    END LOOP;
  END LOOP;
  h := (p_allocation->>'hp')::integer; a := (p_allocation->>'atk')::integer;
  m := (p_allocation->>'magi')::integer; d := (p_allocation->>'def')::integer;
  s := (p_allocation->>'spd')::integer; mp := (p_allocation->>'mana')::integer;
  UPDATE public.pets SET unspent_points = unspent_points-spent, hp_max = hp_max+h*2,
    atk=atk+a,magi=magi+m,def=def+d,spd=spd+s,mana=mana+mp
    WHERE id=p_pet_id RETURNING * INTO p;
  receipt := jsonb_build_object('request_id',p_request_id,'pet_id',p_pet_id,'spent',spent,
    'unspent_points',p.unspent_points,'hp_max',p.hp_max,'hp_cur',p.hp_cur,
    'atk',p.atk,'magi',p.magi,'def',p.def,'spd',p.spd,'mana',p.mana);
  INSERT INTO public.pet_stat_spend_receipts(pet_id,request_id,allocation,result)
    VALUES(p_pet_id,p_request_id,p_allocation,receipt);
  RETURN receipt;
END; $$;
REVOKE ALL ON FUNCTION public.claim_level2_skill(uuid,uuid,text), public.allocate_level2_stats(uuid,uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_level2_skill(uuid,uuid,text), public.allocate_level2_stats(uuid,uuid,uuid,jsonb) TO service_role;

-- Preserve existing definition IDs and values; conflicts require review.
INSERT INTO public.skill_defs(slug,name,description,required_level,requirements) VALUES ('solen-angelic-ward','Angelic Ward','Solen gathers Light energy into a guarding stance with the Angelic Ward technique. Exact effects remain undecided.',2,'{"config_version":"level-2-v1","milestone_key":"level-2","combat_enabled":true,"element":"light","species_ids":["light_starter"],"prerequisite_slugs":[]}'::jsonb) ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.skill_defs(slug,name,description,required_level,requirements) VALUES ('solen-gleam-jab','Gleam Jab','Solen delivers a light-themed physical strike with the Gleam Jab technique. Exact effects remain undecided.',2,'{"config_version":"level-2-v1","milestone_key":"level-2","combat_enabled":true,"element":"light","species_ids":["light_starter"],"prerequisite_slugs":[]}'::jsonb) ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.skill_defs(slug,name,description,required_level,requirements) VALUES ('solen-mending-light','Mending Light','Solen channels gentle restorative Light energy with the Mending Light technique. Exact effects remain undecided.',2,'{"config_version":"level-2-v1","milestone_key":"level-2","combat_enabled":true,"element":"light","species_ids":["light_starter"],"prerequisite_slugs":[]}'::jsonb) ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.skill_defs(slug,name,description,required_level,requirements) VALUES ('solen-radiant-bolt','Radiant Bolt','Solen projects Light magic in a radiant pattern with the Radiant Bolt technique. Exact effects remain undecided.',2,'{"config_version":"level-2-v1","milestone_key":"level-2","combat_enabled":true,"element":"light","species_ids":["light_starter"],"prerequisite_slugs":[]}'::jsonb) ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.skill_defs(slug,name,description,required_level,requirements) VALUES ('clodion-stormfeather-guard','Stormfeather Guard','Clodion raises its feathers against incoming attacks.',2,'{"config_version":"level-2-v1","milestone_key":"level-2","combat_enabled":true,"element":"storm","species_ids":["kithna_clodian"],"prerequisite_slugs":[]}'::jsonb) ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.skill_defs(slug,name,description,required_level,requirements) VALUES ('clodion-thunder-talon','Thunder Talon','Clodion delivers a swift electrically charged talon strike.',2,'{"config_version":"level-2-v1","milestone_key":"level-2","combat_enabled":true,"element":"storm","species_ids":["kithna_clodian"],"prerequisite_slugs":[]}'::jsonb) ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.skill_defs(slug,name,description,required_level,requirements) VALUES ('clodion-gentle-updraft','Gentle Updraft','Clodion channels restorative Storm energy through a soft current.',2,'{"config_version":"level-2-v1","milestone_key":"level-2","combat_enabled":true,"element":"storm","species_ids":["kithna_clodian"],"prerequisite_slugs":[]}'::jsonb) ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.skill_defs(slug,name,description,required_level,requirements) VALUES ('clodion-static-gust','Static Gust','Clodion releases a concentrated gust of electrically charged wind.',2,'{"config_version":"level-2-v1","milestone_key":"level-2","combat_enabled":true,"element":"storm","species_ids":["kithna_clodian"],"prerequisite_slugs":[]}'::jsonb) ON CONFLICT (slug) DO NOTHING;
COMMIT;
