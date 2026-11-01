-- BUG-001: apply before deploying the matching collection route.
-- Pause collection until all old backend instances have been replaced.
-- Old claims were not recorded and cannot be backfilled reliably.
-- No inventories are rewritten. Rolling back the route reopens the exploit.
BEGIN;

ALTER TABLE public.wildwood_rooms ADD COLUMN item_claimed_at timestamptz;

CREATE FUNCTION public.claim_wildwood_item(p_user_id uuid, p_room_id uuid, p_item_slug text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_room public.wildwood_rooms%ROWTYPE;
  v_item public.item_defs%ROWTYPE;
  v_qty integer;
BEGIN
  SELECT room.* INTO v_room
  FROM public.wildwood_rooms AS room
  JOIN public.wildwood_expeditions AS expedition ON expedition.id = room.expedition_id
  WHERE room.id = p_room_id AND expedition.user_id = p_user_id
  FOR UPDATE OF room;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'status_code', 404, 'error', 'Wildwood discovery not found.');
  END IF;
  IF v_room.event_kind <> 'flavor' THEN
    RETURN jsonb_build_object('success', false, 'status_code', 409, 'error', 'This Wildwood step does not contain an item.');
  END IF;
  IF v_room.item_claimed_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'status_code', 409, 'error', 'This Wildwood item has already been collected.');
  END IF;

  -- The server retains the existing random pool and probabilities.
  IF p_item_slug IS NULL OR p_item_slug <> ALL (ARRAY[
    'potion_small', 'haiku_scroll_50', 'water-delta', 'fire-delta',
    'earth-delta', 'air-delta', 'ice-delta', 'storm-delta', 'light-delta', 'shadow-delta'
  ]) THEN
    RAISE EXCEPTION 'Invalid Wildwood item.';
  END IF;
  SELECT * INTO v_item FROM public.item_defs WHERE slug = p_item_slug FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wildwood item definition is missing.'; END IF;
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
    'slug', v_item.slug, 'name', v_item.name, 'type', v_item.type,
    'description', v_item.description, 'rarity', v_item.rarity,
    'stackLimit', v_item.stack_limit, 'effects', v_item.effects));
END;
$$;

REVOKE ALL ON FUNCTION public.claim_wildwood_item(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_wildwood_item(uuid, uuid, text) TO service_role;
COMMIT;
