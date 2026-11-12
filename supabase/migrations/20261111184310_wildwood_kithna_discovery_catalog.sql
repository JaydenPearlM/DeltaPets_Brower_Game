-- Prepared only: DO NOT activate collection before applying and testing this migration.
-- New objects: wildwood_discovery_catalog(), wildwood_discovery_readiness(),
-- claim_wildwood_discovery(uuid, uuid, text). Existing claim RPC is unchanged.
-- Only missing item_defs rows are inserted. Existing IDs, values, inventory and
-- claim history are untouched; any catalog conflict makes readiness fail closed.
-- Recovery: disable WILDWOOD_ITEM_COLLECTION_ENABLED. Do not delete granted items
-- or undo claim timestamps; correct catalog conflicts in a reviewed forward change.
BEGIN;

CREATE FUNCTION public.wildwood_discovery_catalog() RETURNS jsonb
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path = '' AS $catalog$
  SELECT $items$[
  {
    "slug": "brookglass-pendant",
    "name": "Brookglass Pendant",
    "description": "A smooth piece of blue brookglass held in woven roots, shaped by the streams of Kithna’s Wildwood.",
    "type": "equipment",
    "category": "relic",
    "rarity": 2,
    "stack_limit": 1,
    "effects": {}
  },
  {
    "slug": "emberheart-charm",
    "name": "Emberheart Charm",
    "description": "A warm coal-red stone cradled in charred bark, recovered from an old hearth in Kithna’s Wildwood.",
    "type": "equipment",
    "category": "relic",
    "rarity": 2,
    "stack_limit": 1,
    "effects": {}
  },
  {
    "slug": "rootbound-cairn",
    "name": "Rootbound Cairn",
    "description": "A small stone wrapped in living roots, carrying the steady Earth energy of Kithna’s Wildwood.",
    "type": "equipment",
    "category": "relic",
    "rarity": 2,
    "stack_limit": 1,
    "effects": {}
  },
  {
    "slug": "whisperleaf-talisman",
    "name": "Whisperleaf Talisman",
    "description": "A pale leaf preserved within a hollow wooden ring, humming with the breezes of Kithna’s Wildwood.",
    "type": "equipment",
    "category": "relic",
    "rarity": 2,
    "stack_limit": 1,
    "effects": {}
  },
  {
    "slug": "frostfern-brooch",
    "name": "Frostfern Brooch",
    "description": "A silver-blue fern impression in cold stone, gathered from a shaded hollow in Kithna’s Wildwood.",
    "type": "equipment",
    "category": "relic",
    "rarity": 2,
    "stack_limit": 1,
    "effects": {}
  },
  {
    "slug": "thunderbough-seal",
    "name": "Thunderbough Seal",
    "description": "A disc cut from a lightning-marked branch, holding the restless Storm energy of Kithna’s Wildwood.",
    "type": "equipment",
    "category": "relic",
    "rarity": 2,
    "stack_limit": 1,
    "effects": {}
  },
  {
    "slug": "dawnpetal-locket",
    "name": "Dawnpetal Locket",
    "description": "A golden woodland petal enclosed in clear resin, warmed by dawn in Kithna’s Wildwood.",
    "type": "equipment",
    "category": "relic",
    "rarity": 2,
    "stack_limit": 1,
    "effects": {}
  },
  {
    "slug": "duskroot-amulet",
    "name": "Duskroot Amulet",
    "description": "A dark root polished into a crescent, carrying the quiet Shadow energy of Kithna’s Wildwood.",
    "type": "equipment",
    "category": "relic",
    "rarity": 2,
    "stack_limit": 1,
    "effects": {}
  },
  {
    "slug": "ripple-might-etching",
    "name": "Ripple Might Etching",
    "description": "A water-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Physical Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  },
  {
    "slug": "ripple-arcana-etching",
    "name": "Ripple Arcana Etching",
    "description": "A water-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Magic Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  },
  {
    "slug": "ember-might-etching",
    "name": "Ember Might Etching",
    "description": "A fire-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Physical Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  },
  {
    "slug": "ember-arcana-etching",
    "name": "Ember Arcana Etching",
    "description": "A fire-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Magic Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  },
  {
    "slug": "root-might-etching",
    "name": "Root Might Etching",
    "description": "A earth-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Physical Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  },
  {
    "slug": "root-arcana-etching",
    "name": "Root Arcana Etching",
    "description": "A earth-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Magic Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  },
  {
    "slug": "gale-might-etching",
    "name": "Gale Might Etching",
    "description": "A air-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Physical Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  },
  {
    "slug": "gale-arcana-etching",
    "name": "Gale Arcana Etching",
    "description": "A air-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Magic Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  },
  {
    "slug": "frost-might-etching",
    "name": "Frost Might Etching",
    "description": "A ice-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Physical Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  },
  {
    "slug": "frost-arcana-etching",
    "name": "Frost Arcana Etching",
    "description": "A ice-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Magic Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  },
  {
    "slug": "thunder-might-etching",
    "name": "Thunder Might Etching",
    "description": "A storm-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Physical Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  },
  {
    "slug": "thunder-arcana-etching",
    "name": "Thunder Arcana Etching",
    "description": "A storm-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Magic Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  },
  {
    "slug": "dawn-might-etching",
    "name": "Dawn Might Etching",
    "description": "A light-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Physical Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  },
  {
    "slug": "dawn-arcana-etching",
    "name": "Dawn Arcana Etching",
    "description": "A light-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Magic Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  },
  {
    "slug": "dusk-might-etching",
    "name": "Dusk Might Etching",
    "description": "A shadow-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Physical Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  },
  {
    "slug": "dusk-arcana-etching",
    "name": "Dusk Arcana Etching",
    "description": "A shadow-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Magic Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  }
]$items$::jsonb;
$catalog$;

INSERT INTO public.item_defs (slug, name, type, description, rarity, stack_limit, effects)
SELECT slug, name, type::public.item_type, description, rarity, stack_limit, effects
FROM jsonb_to_recordset(public.wildwood_discovery_catalog()) AS item(
  slug text, name text, type text, description text, rarity integer, stack_limit integer, effects jsonb)
ON CONFLICT (slug) DO NOTHING;

CREATE FUNCTION public.wildwood_discovery_readiness() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $ready$
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(public.wildwood_discovery_catalog()) AS expected(value)
    LEFT JOIN public.item_defs AS item ON item.slug = expected.value->>'slug'
    WHERE item.id IS NULL OR jsonb_build_object(
      'slug', item.slug, 'name', item.name, 'description', item.description,
      'type', item.type, 'category', expected.value->>'category', 'rarity', item.rarity,
      'stack_limit', item.stack_limit, 'effects', item.effects) IS DISTINCT FROM expected.value
  ) THEN jsonb_build_object('version', 1, 'items', public.wildwood_discovery_catalog())
  ELSE NULL END;
$ready$;

CREATE FUNCTION public.claim_wildwood_discovery(p_user_id uuid, p_room_id uuid, p_item_slug text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_room public.wildwood_rooms%ROWTYPE;
  v_item public.item_defs%ROWTYPE;
  v_qty integer;
  v_expected jsonb;
BEGIN
  SELECT room.* INTO v_room
  FROM public.wildwood_rooms AS room
  JOIN public.wildwood_expeditions AS expedition ON expedition.id = room.expedition_id
  WHERE room.id = p_room_id AND expedition.user_id = p_user_id
  FOR UPDATE OF room;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'status_code', 404, 'error', 'Wildwood discovery not found.');
  END IF;
  IF v_room.event_kind <> 'flavor' OR v_room.status <> 'resolved'
    OR v_room.event_payload->'battle' IS DISTINCT FROM 'null'::jsonb THEN
    RETURN jsonb_build_object('success', false, 'status_code', 409, 'error', 'This Wildwood step does not contain an item.');
  END IF;
  IF v_room.item_claimed_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'status_code', 409, 'error', 'This Wildwood item has already been collected.');
  END IF;

  SELECT value INTO v_expected FROM jsonb_array_elements(public.wildwood_discovery_catalog())
    WHERE value->>'slug' = p_item_slug;
  IF v_expected IS NULL THEN RAISE EXCEPTION 'Invalid Wildwood item.'; END IF;
  SELECT * INTO v_item FROM public.item_defs WHERE slug = p_item_slug FOR SHARE;
  IF NOT FOUND OR jsonb_build_object(
    'slug', v_item.slug, 'name', v_item.name, 'description', v_item.description,
    'type', v_item.type, 'category', v_expected->>'category', 'rarity', v_item.rarity,
    'stack_limit', v_item.stack_limit, 'effects', v_item.effects) IS DISTINCT FROM v_expected THEN
    RETURN jsonb_build_object('success', false, 'status_code', 503, 'error', 'Wildwood item collection is temporarily unavailable.');
  END IF;
  IF v_item.stack_limit < 1 THEN
    RETURN jsonb_build_object('success', false, 'status_code', 409, 'error', 'That item stack is full.');
  END IF;

  INSERT INTO public.inventory AS owned (user_id, item_id, qty)
  VALUES (p_user_id, v_item.id, 1)
  ON CONFLICT (user_id, item_id) DO UPDATE
    SET qty = owned.qty + 1
    WHERE owned.qty < v_item.stack_limit
  RETURNING qty INTO v_qty;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'status_code', 409, 'error', 'That item stack is full.');
  END IF;

  UPDATE public.wildwood_rooms SET item_claimed_at = now() WHERE id = v_room.id;
  -- Any error rolls back both the inventory increment and claim timestamp.
  RETURN jsonb_build_object('success', true, 'qty', v_qty, 'item', jsonb_build_object(
    'slug', v_item.slug, 'name', v_item.name, 'type', v_item.type, 'category', v_expected->>'category',
    'description', v_item.description, 'rarity', v_item.rarity,
    'stackLimit', v_item.stack_limit, 'effects', v_item.effects));
END;
$$;


REVOKE ALL ON FUNCTION public.wildwood_discovery_catalog() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wildwood_discovery_readiness() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_wildwood_discovery(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wildwood_discovery_catalog() TO service_role;
GRANT EXECUTE ON FUNCTION public.wildwood_discovery_readiness() TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_wildwood_discovery(uuid, uuid, text) TO service_role;
COMMIT;
