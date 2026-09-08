-- Migration: 20260506_000028_hatch_pet_rpc.sql
-- Atomic hatch function that executes all hatch logic in a single transaction
-- This prevents broken pet states from partial hatch failures

CREATE OR REPLACE FUNCTION public.hatch_pet(
  p_user_id uuid,
  p_egg_id uuid,
  p_iv_hp int,
  p_iv_atk int,
  p_iv_def int,
  p_iv_spd int,
  p_iv_magi int,
  p_iv_mana int,
  p_gender text,
  p_personality_id uuid,
  p_personality_key text,
  p_hatchling_name text,
  p_description text,
  p_growth_strong_stats text[],
  p_growth_weak_stat text,
  p_hatch_time_alignment text
)
RETURNS TABLE (
  pet_row pets,
  success boolean,
  error_message text
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_base_hp int;
  v_base_atk int;
  v_base_def int;
  v_base_spd int;
  v_base_magi int;
  v_base_mana int;
  v_total_hp int;
  v_total_atk int;
  v_total_def int;
  v_total_spd int;
  v_total_magi int;
  v_total_mana int;
  v_hp_max int;
  v_now timestamptz;
BEGIN
  -- All operations in this function execute atomically
  -- If ANY step fails, the entire transaction rolls back
  
  v_now := now();
  
  -- Step 1: Ensure base stats exist
  SELECT 
    base_hp, base_atk, base_def, base_spd, base_magi, base_mana
  INTO 
    v_base_hp, v_base_atk, v_base_def, v_base_spd, v_base_magi, v_base_mana
  FROM pet_stats
  WHERE pet_id = p_egg_id;
  
  -- If no base stats, create them with defaults
  IF NOT FOUND THEN
    v_base_hp := 2;
    v_base_atk := 2;
    v_base_def := 2;
    v_base_spd := 2;
    v_base_magi := 2;
    v_base_mana := 0;
    
    INSERT INTO pet_stats (
      pet_id, base_hp, base_atk, base_magi, base_def, base_spd, base_mana, base_total
    ) VALUES (
      p_egg_id, v_base_hp, v_base_atk, v_base_magi, v_base_def, v_base_spd, v_base_mana,
      v_base_hp + v_base_atk + v_base_def + v_base_spd + v_base_magi + v_base_mana
    );
  END IF;
  
  -- Step 2: Insert IV allocations for level 1
  INSERT INTO pet_stat_allocations (
    pet_id, level, hp, atk, def, spd, magi, mana
  ) VALUES (
    p_egg_id, 1, p_iv_hp, p_iv_atk, p_iv_def, p_iv_spd, p_iv_magi, p_iv_mana
  )
  ON CONFLICT (pet_id, level) DO UPDATE SET
    hp = p_iv_hp,
    atk = p_iv_atk,
    def = p_iv_def,
    spd = p_iv_spd,
    magi = p_iv_magi,
    mana = p_iv_mana;
  
  -- Step 3: Calculate final stats
  v_total_hp := v_base_hp + p_iv_hp;
  v_total_atk := v_base_atk + p_iv_atk;
  v_total_def := v_base_def + p_iv_def;
  v_total_spd := v_base_spd + p_iv_spd;
  v_total_magi := v_base_magi + p_iv_magi;
  v_total_mana := v_base_mana + p_iv_mana;
  v_hp_max := GREATEST(1, v_total_hp * 2);
  
  -- Step 4: Update pet to hatchling
  UPDATE pets
  SET
    name = p_hatchling_name,
    stage = 'hatchling',
    hatched_at = v_now,
    hatch_ends_at = NULL,
    unspent_points = 0,
    is_active = false,
    location = 'storage',
    gender = p_gender,
    
    -- Stats
    atk = v_total_atk,
    def = v_total_def,
    spd = v_total_spd,
    magi = v_total_magi,
    mana = v_total_mana,
    hp_max = v_hp_max,
    hp_cur = v_hp_max,
    
    -- Care stats - initialize to 50 (max)
    hunger = 50,
    clean = 50,
    cleanliness = 50,
    happy = 50,
    happiness = 50,
    comfort = 50,
    rest = 50,
    energy = 50,
    bond = 0,
    neglect_hours = 0,
    ran_away = false,
    is_runaway = false,
    runaway_at = NULL,
    last_care_update = v_now,
    last_care_decay_at = v_now,
    
    -- Personality and growth
    personality_id = p_personality_id,
    personality_key = p_personality_key,
    description = p_description,
    hatch_time_alignment = p_hatch_time_alignment,
    growth_strong_stats = p_growth_strong_stats,
    growth_weak_stat = p_growth_weak_stat
  WHERE id = p_egg_id
    AND user_id = p_user_id
    AND stage = 'egg'
  RETURNING * INTO pet_row;
  
  -- If no rows updated, the egg didn't exist or wasn't an egg
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::pets, false, 'Egg not found or already hatched';
    RETURN;
  END IF;
  
  -- Success!
  RETURN QUERY SELECT pet_row, true, NULL::text;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.hatch_pet(
  uuid, uuid, int, int, int, int, int, int, text, uuid, text, text, text, text[], text, text
) TO authenticated;

COMMENT ON FUNCTION public.hatch_pet(
  uuid, uuid, int, int, int, int, int, int, text, uuid, text, text, text, text[], text, text
) IS 
'Atomically hatches an egg into a hatchling. All operations execute in a single transaction - if any step fails, the entire hatch is rolled back.';