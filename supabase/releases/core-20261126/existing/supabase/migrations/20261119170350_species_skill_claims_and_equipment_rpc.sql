-- Prepared only; requires the approved slots/milestones migration. Do not apply here.
-- Compatibility/recovery: output/skill-learning-storage-proposal.md.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE FUNCTION public.claim_species_skill(
  p_user_id uuid, p_pet_id uuid, p_species text, p_element text,
  p_level integer, p_skill_slug text, p_choices jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  p public.pets%ROWTYPE; d public.skill_defs%ROWTYPE;
  c public.pet_skill_milestone_claims%ROWTYPE;
  choice jsonb; selected jsonb; slot_number smallint; milestone text;
  required_config jsonb; decision text;
BEGIN
  -- Every writer takes this lock first; retries and competing decisions serialize.
  SELECT * INTO p FROM public.pets WHERE id = p_pet_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SKILL_NOT_FOUND'; END IF;
  IF p.species IS DISTINCT FROM p_species OR p.line::text IS DISTINCT FROM p_element
    OR p.stage = 'egg' OR p.ran_away OR p_level IS NULL OR p.level < p_level
    OR p_level NOT IN (2,5,8,11,14,17,20,23,26,30)
    THEN RAISE EXCEPTION 'SKILL_INELIGIBLE'; END IF;
  milestone := 'level-' || p_level;
  -- p_choices comes from server-owned JSON, never from the HTTP request body.
  IF jsonb_typeof(p_choices) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'SKILL_CONFIG'; END IF;
  IF jsonb_array_length(p_choices) <> 4 THEN RAISE EXCEPTION 'SKILL_CONFIG'; END IF;
  IF (SELECT count(DISTINCT value->>'role') FROM jsonb_array_elements(p_choices)) <> 4
    OR (SELECT count(DISTINCT value->>'slug') FROM jsonb_array_elements(p_choices)) <> 4
    THEN RAISE EXCEPTION 'SKILL_CONFIG'; END IF;
  FOR choice IN SELECT value FROM jsonb_array_elements(p_choices) LOOP
    IF jsonb_typeof(choice) IS DISTINCT FROM 'object'
      OR COALESCE(choice->>'role','') NOT IN ('tank','healer','dps','sorcerer')
      OR (choice->>'level') IS DISTINCT FROM p_level::text
      OR (choice->>'element') IS DISTINCT FROM p_element
      OR jsonb_typeof(choice->'speciesIds') IS DISTINCT FROM 'array'
      OR NOT COALESCE((choice->'speciesIds') ? p_species, false)
      OR COALESCE(choice->>'slug','') !~ '^[a-z][a-z0-9-]{0,99}$'
      OR COALESCE(choice->>'catalogId','') !~ '^[a-z][a-z0-9-]*/[a-z][a-z0-9-]*$'
      OR jsonb_typeof(choice->'name') IS DISTINCT FROM 'string'
      OR jsonb_typeof(choice->'description') IS DISTINCT FROM 'string'
      OR jsonb_typeof(choice->'combatEnabled') IS DISTINCT FROM 'boolean'
      THEN RAISE EXCEPTION 'SKILL_CONFIG'; END IF;
    IF choice->>'slug' = p_skill_slug THEN selected := choice; END IF;
  END LOOP;
  IF selected IS NULL THEN RAISE EXCEPTION 'SKILL_INELIGIBLE'; END IF;

  -- Preserve conflicting history, including conflicts in earlier claimed levels.
  IF EXISTS (SELECT 1 FROM public.pet_skill_milestone_claims pc
    LEFT JOIN public.skill_defs sd ON sd.id = pc.skill_id
    WHERE pc.pet_id = p_pet_id AND (
      sd.id IS NULL OR pc.species_id IS DISTINCT FROM p.species
      OR pc.milestone_key IS DISTINCT FROM ('level-' || sd.required_level)
      OR sd.required_level > p.level
      OR NOT EXISTS (SELECT 1 FROM public.pet_skills owned_skill WHERE owned_skill.pet_id = p_pet_id AND owned_skill.skill_id = pc.skill_id)
      OR (SELECT count(*) FROM public.pet_skills ps JOIN public.skill_defs learned_def ON learned_def.id = ps.skill_id
          WHERE ps.pet_id = p_pet_id AND (ps.skill_id = pc.skill_id
            OR learned_def.requirements->>'milestone_key' = pc.milestone_key)) <> 1
      OR EXISTS (SELECT 1 FROM unnest(ARRAY[2,5,8,11,14,17,20,23,26,30]) AS levels(n)
        WHERE n < sd.required_level AND NOT EXISTS (SELECT 1 FROM public.pet_skill_milestone_claims earlier
          WHERE earlier.pet_id = p_pet_id AND earlier.milestone_key = 'level-' || n))))
    THEN RAISE EXCEPTION 'SKILL_RECONCILIATION_REQUIRED'; END IF;

  SELECT * INTO c FROM public.pet_skill_milestone_claims
    WHERE pet_id = p_pet_id AND milestone_key = milestone;
  IF FOUND THEN
    SELECT * INTO d FROM public.skill_defs WHERE id = c.skill_id;
    IF NOT FOUND OR d.slug IS DISTINCT FROM p_skill_slug THEN RAISE EXCEPTION 'SKILL_CONFLICT'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.pet_skills WHERE pet_id = p_pet_id AND skill_id = c.skill_id)
      THEN RAISE EXCEPTION 'SKILL_RECONCILIATION_REQUIRED'; END IF;
    RETURN jsonb_build_object('skill_id',c.skill_id,'milestone_key',c.milestone_key,
      'equipment_decision',c.equipment_decision,'equipment_decision_slot',c.equipment_decision_slot);
  END IF;
  IF EXISTS (SELECT 1 FROM public.pet_skill_milestone_claims
    WHERE pet_id = p_pet_id AND equipment_decision = 'pending') THEN RAISE EXCEPTION 'SKILL_PENDING'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(ARRAY[2,5,8,11,14,17,20,23,26,30]) AS levels(n)
    WHERE n < p_level AND NOT EXISTS (SELECT 1 FROM public.pet_skill_milestone_claims
      WHERE pet_id = p_pet_id AND milestone_key = 'level-' || n)) THEN RAISE EXCEPTION 'SKILL_ORDER'; END IF;
  IF EXISTS (SELECT 1 FROM public.pet_skills WHERE pet_id = p_pet_id
      AND equipped IS DISTINCT FROM (equipped_slot IS NOT NULL))
    OR EXISTS (SELECT 1 FROM public.pet_skill_milestone_claims pc
      WHERE pc.pet_id = p_pet_id AND (pc.equipment_decision = 'legacy' OR NOT EXISTS (SELECT 1 FROM public.pet_skills ps
        WHERE ps.pet_id = pc.pet_id AND ps.skill_id = pc.skill_id)))
    OR EXISTS (SELECT 1 FROM public.pet_skills ps JOIN public.skill_defs sd ON sd.id = ps.skill_id
      WHERE ps.pet_id = p_pet_id AND (sd.requirements->>'milestone_key' = milestone
        OR sd.slug IN (SELECT value->>'slug' FROM jsonb_array_elements(p_choices))
        OR sd.slug IN (SELECT value->>'sourceSlug' FROM jsonb_array_elements(p_choices))))
    THEN RAISE EXCEPTION 'SKILL_RECONCILIATION_REQUIRED'; END IF;

  required_config := jsonb_build_object('config_version','species-learning-v1','milestone_key',milestone,
    'catalog_id',selected->>'catalogId','element',p_element,'species_ids',selected->'speciesIds',
    'role',selected->>'role','combat_enabled',selected->'combatEnabled','prerequisite_slugs','[]'::jsonb);
  -- Do not overwrite an existing definition or its UUID, even on conflict.
  INSERT INTO public.skill_defs(slug,name,description,required_level,requirements)
    VALUES(p_skill_slug,selected->>'name',selected->>'description',p_level,required_config)
    ON CONFLICT (slug) DO NOTHING;
  SELECT * INTO d FROM public.skill_defs WHERE slug = p_skill_slug FOR SHARE;
  IF d.required_level IS DISTINCT FROM p_level OR d.name IS DISTINCT FROM (selected->>'name')
    OR d.requirements->>'element' IS DISTINCT FROM p_element
    OR NOT COALESCE((d.requirements->'species_ids') ? p_species,false)
    OR d.requirements->>'milestone_key' IS DISTINCT FROM milestone
    OR d.requirements->'prerequisite_slugs' IS DISTINCT FROM '[]'::jsonb
    OR NOT COALESCE(d.requirements = required_config OR (
      p_level = 2 AND d.requirements->>'config_version' = 'level-2-v1'
      AND d.requirements->>'combat_enabled' = 'true' AND selected->>'combatEnabled' = 'true'
      AND ((p_species = 'light_starter' AND p_skill_slug IN (
        'solen-angelic-ward','solen-gleam-jab','solen-mending-light','solen-radiant-bolt'))
        OR (p_species = 'kithna_clodian' AND p_skill_slug IN (
        'clodion-stormfeather-guard','clodion-thunder-talon','clodion-gentle-updraft','clodion-static-gust')))), false)
    THEN RAISE EXCEPTION 'SKILL_CONFIG'; END IF;
  SELECT n INTO slot_number FROM generate_series(1,4) AS slots(n)
    WHERE NOT EXISTS (SELECT 1 FROM public.pet_skills WHERE pet_id = p_pet_id AND equipped_slot = n)
    ORDER BY n LIMIT 1;
  decision := CASE WHEN slot_number IS NULL THEN 'pending' ELSE 'auto_equipped' END;
  INSERT INTO public.pet_skills(pet_id,skill_id,equipped,equipped_slot)
    VALUES(p_pet_id,d.id,slot_number IS NOT NULL,slot_number);
  INSERT INTO public.pet_skill_milestone_claims(pet_id,milestone_key,skill_id,species_id,config_version,
    eligible_choices,equipment_decision,equipment_decision_slot)
    VALUES(p_pet_id,milestone,d.id,p_species,'species-learning-v1',p_choices,decision,slot_number);
  RETURN jsonb_build_object('skill_id',d.id,'milestone_key',milestone,
    'equipment_decision',decision,'equipment_decision_slot',slot_number);
END; $$;

CREATE FUNCTION public.resolve_species_skill_equipment(
  p_user_id uuid, p_pet_id uuid, p_milestone_key text, p_slot smallint
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE p public.pets%ROWTYPE; c public.pet_skill_milestone_claims%ROWTYPE; decision text;
BEGIN
  SELECT * INTO p FROM public.pets WHERE id = p_pet_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SKILL_NOT_FOUND'; END IF;
  IF p.stage = 'egg' OR p.ran_away OR (p_slot IS NOT NULL AND p_slot NOT BETWEEN 1 AND 4)
    THEN RAISE EXCEPTION 'SKILL_INELIGIBLE'; END IF;
  SELECT * INTO c FROM public.pet_skill_milestone_claims
    WHERE pet_id = p_pet_id AND milestone_key = p_milestone_key;
  IF NOT FOUND THEN RAISE EXCEPTION 'SKILL_INELIGIBLE'; END IF;
  IF EXISTS (SELECT 1 FROM public.pet_skill_milestone_claims pc
    LEFT JOIN public.skill_defs sd ON sd.id = pc.skill_id
    WHERE pc.pet_id = p_pet_id AND (
      sd.id IS NULL OR pc.species_id IS DISTINCT FROM p.species
      OR pc.milestone_key IS DISTINCT FROM ('level-' || sd.required_level)
      OR sd.required_level > p.level
      OR NOT EXISTS (SELECT 1 FROM public.pet_skills owned_skill WHERE owned_skill.pet_id = p_pet_id AND owned_skill.skill_id = pc.skill_id)
      OR (SELECT count(*) FROM public.pet_skills ps JOIN public.skill_defs learned_def ON learned_def.id = ps.skill_id
          WHERE ps.pet_id = p_pet_id AND (ps.skill_id = pc.skill_id
            OR learned_def.requirements->>'milestone_key' = pc.milestone_key)) <> 1
      OR EXISTS (SELECT 1 FROM unnest(ARRAY[2,5,8,11,14,17,20,23,26,30]) AS levels(n)
        WHERE n < sd.required_level AND NOT EXISTS (SELECT 1 FROM public.pet_skill_milestone_claims earlier
          WHERE earlier.pet_id = p_pet_id AND earlier.milestone_key = 'level-' || n))))
    THEN RAISE EXCEPTION 'SKILL_RECONCILIATION_REQUIRED'; END IF;
  decision := CASE WHEN p_slot IS NULL THEN 'declined' ELSE 'replaced' END;
  IF NOT EXISTS (SELECT 1 FROM public.pet_skills WHERE pet_id = p_pet_id AND skill_id = c.skill_id)
    THEN RAISE EXCEPTION 'SKILL_RECONCILIATION_REQUIRED'; END IF;
  IF c.equipment_decision <> 'pending' THEN
    IF c.equipment_decision IS DISTINCT FROM decision OR c.equipment_decision_slot IS DISTINCT FROM p_slot
      THEN RAISE EXCEPTION 'SKILL_CONFLICT'; END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM public.pet_skills WHERE pet_id = p_pet_id
      AND (equipped IS DISTINCT FROM (equipped_slot IS NOT NULL) OR (skill_id = c.skill_id AND equipped)))
      THEN RAISE EXCEPTION 'SKILL_RECONCILIATION_REQUIRED'; END IF;
    IF p_slot IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM public.pet_skills WHERE pet_id = p_pet_id AND equipped_slot = p_slot)
        THEN RAISE EXCEPTION 'SKILL_CONFLICT'; END IF;
      UPDATE public.pet_skills SET equipped = false, equipped_slot = NULL
        WHERE pet_id = p_pet_id AND equipped_slot = p_slot;
      UPDATE public.pet_skills SET equipped = true, equipped_slot = p_slot
        WHERE pet_id = p_pet_id AND skill_id = c.skill_id;
    END IF;
    UPDATE public.pet_skill_milestone_claims SET equipment_decision = decision, equipment_decision_slot = p_slot
      WHERE pet_id = p_pet_id AND milestone_key = p_milestone_key;
  END IF;
  RETURN jsonb_build_object('skill_id',c.skill_id,'milestone_key',c.milestone_key,
    'equipment_decision',decision,'equipment_decision_slot',p_slot);
END; $$;

-- Compatibility for old application versions. Do not leave the old slot-less writer active.
CREATE OR REPLACE FUNCTION public.claim_level2_skill(p_user_id uuid, p_pet_id uuid, p_skill_slug text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE p public.pets%ROWTYPE; choices jsonb;
BEGIN
  SELECT * INTO p FROM public.pets WHERE id = p_pet_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'L2_NOT_FOUND'; END IF;
  IF p.species NOT IN ('light_starter','kithna_clodian') THEN RAISE EXCEPTION 'L2_INELIGIBLE'; END IF;
  SELECT jsonb_agg(jsonb_build_object('slug',sd.slug,'sourceSlug',sd.slug,'name',sd.name,
    'description',sd.description,'level',2,'element',p.line,'speciesIds',jsonb_build_array(p.species),
    'catalogId',(CASE WHEN p.species = 'light_starter' THEN 'solen/' ELSE 'clodian/' END) || sd.slug,
    'combatEnabled',true,'role',CASE
      WHEN sd.slug IN ('solen-angelic-ward','clodion-stormfeather-guard') THEN 'tank'
      WHEN sd.slug IN ('solen-gleam-jab','clodion-thunder-talon') THEN 'dps'
      WHEN sd.slug IN ('solen-mending-light','clodion-gentle-updraft') THEN 'healer' ELSE 'sorcerer' END))
    INTO choices FROM public.skill_defs sd WHERE
      (p.species = 'light_starter' AND sd.slug IN ('solen-angelic-ward','solen-gleam-jab','solen-mending-light','solen-radiant-bolt'))
      OR (p.species = 'kithna_clodian' AND sd.slug IN ('clodion-stormfeather-guard','clodion-thunder-talon','clodion-gentle-updraft','clodion-static-gust'));
  RETURN public.claim_species_skill(p_user_id,p_pet_id,p.species,p.line::text,2,p_skill_slug,choices);
END; $$;

REVOKE ALL ON FUNCTION public.claim_species_skill(uuid,uuid,text,text,integer,text,jsonb),
  public.resolve_species_skill_equipment(uuid,uuid,text,smallint), public.claim_level2_skill(uuid,uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_species_skill(uuid,uuid,text,text,integer,text,jsonb),
  public.resolve_species_skill_equipment(uuid,uuid,text,smallint), public.claim_level2_skill(uuid,uuid,text)
  TO service_role;
COMMIT;
