-- Apply before deploying the application that selects item_available_at.
-- Existing rooms remain untimed; existing held/transferred Treasure is untouched.
BEGIN;

ALTER TABLE public.wildwood_rooms
  ADD COLUMN item_available_at timestamptz;

-- Stamp once in the room-creation transaction, even when an older server creates it.
-- No backfill/default: a NULL on an existing room keeps its original claim semantics.
CREATE FUNCTION public.stamp_wildwood_item_opportunity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.item_available_at := CASE
      WHEN NEW.sequence_number > 0
        AND NEW.event_kind = 'flavor'
        AND NEW.status = 'resolved'
        AND NEW.event_payload->'battle' = 'null'::jsonb
      THEN clock_timestamp()
      ELSE NULL
    END;
  ELSE
    -- Neither room updates nor reloads can extend or recreate an opportunity.
    NEW.item_available_at := OLD.item_available_at;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.stamp_wildwood_item_opportunity()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stamp_wildwood_item_opportunity() TO service_role;

CREATE TRIGGER wildwood_item_opportunity
  BEFORE INSERT OR UPDATE ON public.wildwood_rooms
  FOR EACH ROW EXECUTE FUNCTION public.stamp_wildwood_item_opportunity();

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
  -- Serialize claims, transfers and departure for the same player.
  PERFORM 1 FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;
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

  -- Check wall-clock time after both row/catalog locks, immediately before awarding.
  -- Transaction-start time (now()) would allow a request waiting on a lock to expire.
  -- NULL is deliberately grandfathered: never time out pre-migration discoveries.
  IF v_room.item_available_at IS NOT NULL AND (
    clock_timestamp() < v_room.item_available_at OR
    clock_timestamp() >= v_room.item_available_at + interval '5 seconds'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 409,
      'error', 'This Wildwood discovery has expired.'
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

-- Preserve the original service-only claim surface and SECURITY INVOKER behavior.
REVOKE ALL ON FUNCTION public.claim_wildwood_discovery(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_wildwood_discovery(uuid, uuid, text)
  TO service_role;

COMMIT;
