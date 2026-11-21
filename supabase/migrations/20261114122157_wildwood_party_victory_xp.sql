-- REVIEW DRAFT ONLY. Not applied or registered as a migration.
-- Requires version-2 server/client integration and offline PostgreSQL tests before rollout.
-- Existing function signature and permissions are preserved; no GRANT changes.
BEGIN;
SET LOCAL lock_timeout = '5s';
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
  v_reward jsonb;
  v_rewards jsonb := '[]'::jsonb;
  v_pet_ids uuid[];
  v_count integer;
BEGIN
  SELECT room.* INTO v_room
  FROM public.wildwood_rooms room
  JOIN public.wildwood_expeditions expedition ON expedition.id = room.expedition_id
  WHERE room.id = p_room_id AND expedition.user_id = p_user_id
  FOR UPDATE OF room;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wildwood room not found' USING ERRCODE = '23514';
  END IF;
  -- Version 2: participants contains only Kith that entered combat.
  -- Reserves must remain outside this array until admitted by the server.
  -- Version 1 continues through the original implementation below.
  IF (v_room.event_payload ->> 'xpRewardVersion') = '2' THEN
    IF v_room.status <> 'resolved'
      OR v_room.event_kind <> 'corrupted_battle'
      OR (v_room.event_payload ->> 'recordBattleStats') IS DISTINCT FROM 'true'
      OR (v_room.event_payload #>> '{battle,status}') IS DISTINCT FROM 'victory'
      OR (v_room.event_payload #>> '{battle,id}') IS DISTINCT FROM v_room.battle_id::text
      OR jsonb_typeof(v_room.event_payload #> '{battle,participants}') IS DISTINCT FROM 'array'
    THEN
      RAISE EXCEPTION 'No eligible Wildwood party victory' USING ERRCODE = '23514';
    END IF;
    SELECT jsonb_agg(participant) INTO v_players
    FROM jsonb_array_elements(v_room.event_payload #> '{battle,participants}') participant
    WHERE participant ->> 'side' = 'player';
    v_count := COALESCE(jsonb_array_length(v_players), 0);
    IF v_count NOT BETWEEN 1 AND 4
      OR jsonb_array_length(v_room.event_payload #> '{battle,participants}') <> v_count + 1
      OR (SELECT count(*) FROM jsonb_array_elements(v_room.event_payload #> '{battle,participants}') p
          WHERE p ->> 'side' = 'enemy') <> 1
      OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_players) p
          WHERE p ->> 'defeated' = 'false' AND (p ->> 'hpCur')::integer > 0)
    THEN
      RAISE EXCEPTION 'Invalid party victory participants' USING ERRCODE = '23514';
    END IF;
    SELECT array_agg(COALESCE(p ->> 'sourcePetId', p ->> 'id')::uuid
                    ORDER BY COALESCE(p ->> 'sourcePetId', p ->> 'id')::uuid)
    INTO v_pet_ids FROM jsonb_array_elements(v_players) p;
    IF EXISTS (SELECT 1 FROM unnest(v_pet_ids) id WHERE id IS NULL)
      OR (SELECT count(DISTINCT id) FROM unnest(v_pet_ids) id) <> v_count
    THEN
      RAISE EXCEPTION 'Invalid or duplicate party pet IDs' USING ERRCODE = '23514';
    END IF;
    -- Lock all participants in deterministic order before modifying any XP.
    FOREACH v_pet_id IN ARRAY v_pet_ids LOOP
      SELECT * INTO v_pet FROM public.pets
      WHERE id = v_pet_id AND user_id = p_user_id FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Battle participant ownership changed' USING ERRCODE = '23514';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.pet_battle_results
        WHERE battle_id = v_room.battle_id AND pet_id = v_pet_id
          AND user_id = p_user_id AND result = 'victory')
      THEN
        RAISE EXCEPTION 'Battle result must be recorded before XP' USING ERRCODE = '23514';
      END IF;
    END LOOP;
    IF v_room.event_payload ? 'xpRewards' THEN
      RETURN v_room.event_payload -> 'xpRewards';
    END IF;
    IF v_room.event_payload ? 'xpReward' THEN
      RAISE EXCEPTION 'Mixed reward receipt versions' USING ERRCODE = '23514';
    END IF;
    FOREACH v_pet_id IN ARRAY v_pet_ids LOOP
      SELECT * INTO STRICT v_pet FROM public.pets WHERE id = v_pet_id AND user_id = p_user_id;
      IF v_pet.level IS NULL OR v_pet.xp IS NULL OR v_pet.unspent_points IS NULL
        OR v_pet.level NOT BETWEEN 1 AND 30 OR v_pet.xp < 0
      THEN
        RAISE EXCEPTION 'Invalid pet progression state' USING ERRCODE = '23514';
      END IF;
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
      WHERE id = v_pet_id AND user_id = p_user_id;
      v_rewards := v_rewards || jsonb_build_array(v_reward);
    END LOOP;
    UPDATE public.wildwood_rooms
    SET event_payload = jsonb_set(event_payload, '{xpRewards}', v_rewards)
    WHERE id = p_room_id;
    RETURN v_rewards;
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

COMMIT;
