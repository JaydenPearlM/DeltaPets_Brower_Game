BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.pets DROP CONSTRAINT pets_level_check;
ALTER TABLE public.pets ADD CONSTRAINT pets_level_check CHECK (level BETWEEN 0 AND 30);
ALTER TABLE public.pet_stat_allocations DROP CONSTRAINT pet_stat_allocations_level_check;
ALTER TABLE public.pet_stat_allocations ADD CONSTRAINT pet_stat_allocations_level_check CHECK (level BETWEEN 1 AND 30);

-- Only server-created, opted-in 1v1 victories qualify. The room's unique battle_id
-- and locked receipt make retries and concurrent settlement exactly-once.
CREATE FUNCTION public.settle_wildwood_victory_xp(p_user_id uuid, p_room_id uuid)
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
$$;

REVOKE ALL ON FUNCTION public.settle_wildwood_victory_xp(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_wildwood_victory_xp(uuid, uuid) TO service_role;

-- Keep the existing non-battle reward contract, but avoid stale XP overwrites
-- when egg discovery and Wildwood settlement touch the same pet concurrently.
CREATE FUNCTION public.increment_active_pet_xp(p_user_id uuid, p_amount integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_pet public.pets%ROWTYPE;
BEGIN
  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'Invalid XP amount' USING ERRCODE = '23514';
  END IF;
  IF p_amount = 0 THEN RETURN NULL; END IF;
  BEGIN
    SELECT * INTO STRICT v_pet FROM public.pets
    WHERE user_id = p_user_id AND is_active = true AND ran_away = false
    FOR UPDATE;
  EXCEPTION WHEN NO_DATA_FOUND THEN RETURN NULL;
  END;
  UPDATE public.pets SET xp = xp + p_amount WHERE id = v_pet.id;
  RETURN jsonb_build_object('petId', v_pet.id, 'previousXp', v_pet.xp,
    'xp', v_pet.xp + p_amount, 'amount', p_amount);
END;
$$;
REVOKE ALL ON FUNCTION public.increment_active_pet_xp(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_active_pet_xp(uuid, integer) TO service_role;
COMMIT;
