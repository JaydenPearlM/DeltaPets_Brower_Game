
BEGIN;

-- Each Wildwood room can produce one temporary item.
-- Existing inventory rows are not changed by this migration.
CREATE TABLE public.wildwood_treasure_items (
  room_id uuid PRIMARY KEY
    REFERENCES public.wildwood_rooms(id)
    ON DELETE CASCADE,

  user_id uuid NOT NULL
    REFERENCES auth.users(id),

  item_id uuid NOT NULL
    REFERENCES public.item_defs(id),

  created_at timestamptz NOT NULL DEFAULT now(),
  transferred_at timestamptz,
  discarded_at timestamptz,

  CONSTRAINT wildwood_treasure_one_outcome CHECK (
    NOT (
      transferred_at IS NOT NULL
      AND discarded_at IS NOT NULL
    )
  )
);

CREATE INDEX wildwood_treasure_user_pending_idx
  ON public.wildwood_treasure_items(user_id)
  WHERE transferred_at IS NULL
    AND discarded_at IS NULL;

ALTER TABLE public.wildwood_treasure_items
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.wildwood_treasure_items
  FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.wildwood_treasure_items
  TO service_role;


-- Replace the previous claim function.
-- Collecting now puts the item into Treasure,
-- NOT the permanent inventory.
CREATE OR REPLACE FUNCTION public.claim_wildwood_discovery(
  p_user_id uuid,
  p_room_id uuid,
  p_item_slug text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_room public.wildwood_rooms%ROWTYPE;
  v_item public.item_defs%ROWTYPE;
  v_expected jsonb;
BEGIN
  SELECT room.*
  INTO v_room
  FROM public.wildwood_rooms AS room
  JOIN public.wildwood_expeditions AS expedition
    ON expedition.id = room.expedition_id
  WHERE room.id = p_room_id
    AND expedition.user_id = p_user_id
    AND expedition.status = 'active'
  FOR UPDATE OF room;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 404,
      'error', 'Active Wildwood room not found.'
    );
  END IF;

  IF v_room.event_kind <> 'flavor'
    OR v_room.status <> 'resolved'
    OR v_room.event_payload->'battle'
      IS DISTINCT FROM 'null'::jsonb
  THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 409,
      'error', 'This room has no collectible item.'
    );
  END IF;

  IF v_room.item_claimed_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 409,
      'error', 'This discovery was already collected.'
    );
  END IF;

  -- Preserve the existing approved discovery catalog.
  SELECT value
  INTO v_expected
  FROM jsonb_array_elements(
    public.wildwood_discovery_catalog()
  )
  WHERE value->>'slug' = p_item_slug;

  IF v_expected IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 409,
      'error', 'Invalid Wildwood item.'
    );
  END IF;

  SELECT *
  INTO v_item
  FROM public.item_defs
  WHERE slug = p_item_slug
  FOR SHARE;

  IF NOT FOUND OR jsonb_build_object(
    'slug', v_item.slug,
    'name', v_item.name,
    'description', v_item.description,
    'type', v_item.type,
    'category', v_expected->>'category',
    'rarity', v_item.rarity,
    'stack_limit', v_item.stack_limit,
    'effects', v_item.effects
  ) IS DISTINCT FROM v_expected THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 503,
      'error', 'Discovery catalog is unavailable.'
    );
  END IF;

  INSERT INTO public.wildwood_treasure_items (
    room_id,
    user_id,
    item_id
  )
  VALUES (
    p_room_id,
    p_user_id,
    v_item.id
  );

  UPDATE public.wildwood_rooms
  SET item_claimed_at = now()
  WHERE id = p_room_id;

  RETURN jsonb_build_object(
    'success', true,
    'qty', 1,
    'held', true,
    'item', jsonb_build_object(
      'slug', v_item.slug,
      'name', v_item.name,
      'description', v_item.description,
      'type', v_item.type,
      'category', v_expected->>'category',
      'rarity', v_item.rarity,
      'stackLimit', v_item.stack_limit,
      'effects', v_item.effects
    )
  );
END;
$$;


-- Transfer one pending discovery to permanent inventory.
-- Both operations happen in ONE database transaction.
CREATE FUNCTION public.transfer_wildwood_treasure_item(
  p_user_id uuid,
  p_room_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_treasure public.wildwood_treasure_items%ROWTYPE;
  v_item public.item_defs%ROWTYPE;
  v_qty integer;
BEGIN
  SELECT treasure.*
  INTO v_treasure
  FROM public.wildwood_treasure_items AS treasure
  JOIN public.wildwood_rooms AS room
    ON room.id = treasure.room_id
  JOIN public.wildwood_expeditions AS expedition
    ON expedition.id = room.expedition_id
  WHERE treasure.room_id = p_room_id
    AND treasure.user_id = p_user_id
    AND expedition.user_id = p_user_id
    AND expedition.status = 'active'
    AND treasure.transferred_at IS NULL
    AND treasure.discarded_at IS NULL
  FOR UPDATE OF treasure;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 409,
      'error', 'Treasure is unavailable or already claimed.'
    );
  END IF;

  SELECT *
  INTO v_item
  FROM public.item_defs
  WHERE id = v_treasure.item_id
  FOR SHARE;

  IF NOT FOUND OR v_item.stack_limit < 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 409,
      'error', 'Item definition is unavailable.'
    );
  END IF;

  INSERT INTO public.inventory AS owned (
    user_id,
    item_id,
    qty
  )
  VALUES (
    p_user_id,
    v_item.id,
    1
  )
  ON CONFLICT (user_id, item_id)
  DO UPDATE
    SET qty = owned.qty + 1
    WHERE owned.qty < v_item.stack_limit
  RETURNING qty INTO v_qty;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 409,
      'error', 'Inventory stack is full.'
    );
  END IF;

  UPDATE public.wildwood_treasure_items
  SET transferred_at = now()
  WHERE room_id = p_room_id;

  RETURN jsonb_build_object(
    'success', true,
    'roomId', p_room_id,
    'slug', v_item.slug,
    'qty', v_qty
  );
END;
$$;


-- Explicitly discard any Treasure that was not transferred.
-- This never deletes already transferred inventory items.
CREATE FUNCTION public.discard_wildwood_treasure(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.wildwood_treasure_items AS treasure
  SET discarded_at = now()
  FROM public.wildwood_rooms AS room
  JOIN public.wildwood_expeditions AS expedition
    ON expedition.id = room.expedition_id
  WHERE treasure.room_id = room.id
    AND treasure.user_id = p_user_id
    AND expedition.user_id = p_user_id
    AND expedition.status = 'active'
    AND treasure.transferred_at IS NULL
    AND treasure.discarded_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'discarded', v_count
  );
END;
$$;


REVOKE ALL ON FUNCTION
  public.claim_wildwood_discovery(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
  public.transfer_wildwood_treasure_item(uuid, uuid)
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
  public.discard_wildwood_treasure(uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.claim_wildwood_discovery(uuid, uuid, text)
  TO service_role;

GRANT EXECUTE ON FUNCTION
  public.transfer_wildwood_treasure_item(uuid, uuid)
  TO service_role;

GRANT EXECUTE ON FUNCTION
  public.discard_wildwood_treasure(uuid)
  TO service_role;

COMMIT;
