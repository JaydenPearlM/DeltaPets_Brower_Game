-- Reviewed local proposal only. Do not apply without explicit approval.
-- Egg receipts live in their existing owned Wildwood room, not in pets.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE FUNCTION public.hold_wildwood_egg(
  p_user_id uuid, p_room_id uuid, p_encounter_id uuid,
  p_egg jsonb, p_base_stats jsonb, p_xp integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_room public.wildwood_rooms%ROWTYPE;
  v_receipt jsonb;
  v_xp jsonb;
BEGIN
  PERFORM 1 FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player profile missing.'; END IF;
  SELECT room.* INTO v_room FROM public.wildwood_rooms room
    JOIN public.wildwood_expeditions expedition ON expedition.id = room.expedition_id
    WHERE room.id = p_room_id AND expedition.user_id = p_user_id AND expedition.status = 'active'
    FOR UPDATE OF room;
  IF NOT FOUND OR v_room.status <> 'resolved'
    OR v_room.event_payload->'battle' IS DISTINCT FROM 'null'::jsonb
    OR v_room.event_payload->>'eggTreasureClosed' = 'true' THEN
    RETURN jsonb_build_object('success', false);
  END IF;
  v_receipt := v_room.event_payload->'eggTreasure';
  IF v_receipt IS NOT NULL THEN
    IF v_receipt->>'encounterId' = p_encounter_id::text AND v_receipt->>'status' = 'pending' THEN
      RETURN jsonb_build_object('success', true, 'held', true, 'encounterId', p_encounter_id,
        'xp_awarded', v_receipt->'xpAwarded');
    END IF;
    RETURN jsonb_build_object('success', false);
  END IF;
  IF p_encounter_id IS NULL OR jsonb_typeof(p_egg) IS DISTINCT FROM 'object'
    OR jsonb_typeof(p_base_stats) IS DISTINCT FROM 'object'
    OR p_egg->>'name' IS NULL OR p_egg->>'species' IS NULL OR p_xp IS NULL OR p_xp < 0 THEN
    RAISE EXCEPTION 'Invalid generated egg.';
  END IF;
  -- Same approved find XP, now committed together with the temporary reward.
  v_xp := public.increment_active_pet_xp(p_user_id, p_xp);
  v_receipt := jsonb_build_object('encounterId', p_encounter_id, 'status', 'pending',
    'egg', p_egg, 'baseStats', p_base_stats, 'createdAt', now(),
    'xpAwarded', coalesce((v_xp->>'amount')::integer, 0));
  UPDATE public.wildwood_rooms SET event_payload = jsonb_set(event_payload, '{eggTreasure}', v_receipt)
    WHERE id = p_room_id;
  RETURN jsonb_build_object('success', true, 'held', true, 'encounterId', p_encounter_id,
    'xp_awarded', v_receipt->'xpAwarded');
END;
$$;

CREATE FUNCTION public.transfer_wildwood_egg(p_user_id uuid, p_room_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_room public.wildwood_rooms%ROWTYPE;
  v_input public.pets%ROWTYPE;
  v_pet public.pets%ROWTYPE;
  v_receipt jsonb;
  v_stats jsonb;
  v_result jsonb;
BEGIN
  PERFORM 1 FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player profile missing.'; END IF;
  SELECT room.* INTO v_room FROM public.wildwood_rooms room
    JOIN public.wildwood_expeditions expedition ON expedition.id = room.expedition_id
    WHERE room.id = p_room_id AND expedition.user_id = p_user_id AND expedition.status = 'active'
    FOR UPDATE OF room;
  IF NOT FOUND OR v_room.event_payload#>>'{eggTreasure,status}' IS DISTINCT FROM 'pending'
    OR v_room.event_payload->>'eggTreasureClosed' = 'true' THEN
    RETURN jsonb_build_object('success', false, 'status_code', 409, 'error', 'Egg is unavailable or already transferred.');
  END IF;
  v_receipt := v_room.event_payload->'eggTreasure';
  v_stats := v_receipt->'baseStats';
  SELECT * INTO v_input FROM jsonb_populate_record(NULL::public.pets, v_receipt->'egg');
  -- This intermediate inventory row is never committed independently. The
  -- existing storage action applies ownership, locking and capacity rules.
  INSERT INTO public.pets (user_id, name, species, rarity, line, stage, energy,
    hatch_ends_at, pending_hatch_minutes, is_active, location, hatch_time_alignment,
    growth_strong_stats, growth_weak_stat, passive_trait_id, passive_trait_key, mutation_capacity)
  VALUES (p_user_id, v_input.name, v_input.species, v_input.rarity, v_input.line, 'egg', 100,
    NULL, v_input.pending_hatch_minutes, false, 'inventory', v_input.hatch_time_alignment,
    v_input.growth_strong_stats, v_input.growth_weak_stat, v_input.passive_trait_id,
    v_input.passive_trait_key, v_input.mutation_capacity) RETURNING * INTO v_pet;
  INSERT INTO public.pet_stats (pet_id, base_hp, base_atk, base_def, base_spd, base_magi, base_mana, base_total)
  VALUES (v_pet.id, (v_stats->>'hp')::integer, (v_stats->>'atk')::integer,
    (v_stats->>'def')::integer, (v_stats->>'spd')::integer, (v_stats->>'magi')::integer,
    (v_stats->>'mana')::integer, (v_stats->>'base_total')::integer)
  ON CONFLICT (pet_id) DO UPDATE SET base_hp = EXCLUDED.base_hp,
    base_atk = EXCLUDED.base_atk, base_def = EXCLUDED.base_def, base_spd = EXCLUDED.base_spd,
    base_magi = EXCLUDED.base_magi, base_mana = EXCLUDED.base_mana, base_total = EXCLUDED.base_total;
  v_result := public.apply_pet_storage_action(p_user_id, 'store_inventory_egg', v_pet.id);
  IF v_result->>'success' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Egg storage was not confirmed.'; END IF;
  UPDATE public.wildwood_rooms SET event_payload = jsonb_set(event_payload, '{eggTreasure}',
    v_receipt || jsonb_build_object('status', 'transferred', 'petId', v_pet.id, 'transferredAt', now()))
    WHERE id = p_room_id;
  RETURN jsonb_build_object('success', true, 'roomId', p_room_id, 'petId', v_pet.id, 'destination', 'storage');
END;
$$;

CREATE OR REPLACE FUNCTION public.discard_wildwood_treasure(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_count integer;
BEGIN
  PERFORM 1 FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;
  -- Lock rooms before receipts, matching egg hold/transfer and item claims.
  PERFORM room.id FROM public.wildwood_rooms room
    JOIN public.wildwood_expeditions expedition ON expedition.id = room.expedition_id
    WHERE expedition.user_id = p_user_id AND expedition.status = 'active'
    ORDER BY room.id FOR UPDATE OF room;
  UPDATE public.wildwood_treasure_items treasure SET discarded_at = now()
    FROM public.wildwood_rooms room JOIN public.wildwood_expeditions expedition ON expedition.id = room.expedition_id
    WHERE treasure.room_id = room.id AND treasure.user_id = p_user_id
      AND expedition.user_id = p_user_id AND expedition.status = 'active'
      AND treasure.transferred_at IS NULL AND treasure.discarded_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  UPDATE public.wildwood_rooms room SET event_payload =
    jsonb_set(CASE WHEN room.event_payload#>>'{eggTreasure,status}' = 'pending'
      THEN jsonb_set(room.event_payload, '{eggTreasure,status}', '"discarded"'::jsonb)
      ELSE room.event_payload END, '{eggTreasureClosed}', 'true'::jsonb),
    item_claimed_at = CASE WHEN room.event_kind = 'flavor' AND room.status = 'resolved'
      THEN coalesce(room.item_claimed_at, now()) ELSE room.item_claimed_at END
    FROM public.wildwood_expeditions expedition
    WHERE expedition.id = room.expedition_id AND expedition.user_id = p_user_id
      AND expedition.status = 'active' AND room.event_payload->'battle' = 'null'::jsonb;
  RETURN jsonb_build_object('success', true, 'discarded', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.hold_wildwood_egg(uuid,uuid,uuid,jsonb,jsonb,integer),
  public.transfer_wildwood_egg(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hold_wildwood_egg(uuid,uuid,uuid,jsonb,jsonb,integer),
  public.transfer_wildwood_egg(uuid,uuid) TO service_role;
-- Existing discard privileges are preserved by CREATE OR REPLACE.
COMMIT;
