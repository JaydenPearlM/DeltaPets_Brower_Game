-- Priority 1 Fix Part 3: Update hatch_pet RPC (CORRECTED VERSION)
-- Properly allocates exactly 7 random points for level 1 hatch (17 total with egg base of 10)

DROP FUNCTION IF EXISTS public.hatch_pet(uuid, uuid, text, text, text, text);

CREATE OR REPLACE FUNCTION public.hatch_pet(
  p_egg_id uuid,
  p_user_id uuid,
  p_species text,
  p_personality_key text,
  p_description text DEFAULT '',
  p_nickname text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pet_id uuid;
  v_now timestamptz := now();
  v_starter_element text;
  
  -- Base stats from egg (should total 10)
  v_base_hp int;
  v_base_atk int;
  v_base_magi int;
  v_base_def int;
  v_base_spd int;
  v_base_mana int;
  
  -- Individual values (IVs) - 7 random points for level 1
  v_iv_hp int;
  v_iv_atk int;
  v_iv_magi int;
  v_iv_def int;
  v_iv_spd int;
  v_iv_mana int;
  v_remaining_points int;
  v_random_stat int;
  
  -- Total stats (base + IV) - should total 17
  v_total_hp int;
  v_total_atk int;
  v_total_magi int;
  v_total_def int;
  v_total_spd int;
  v_total_mana int;
  v_hp_max int;
  
  v_personality_id uuid;
BEGIN
  -- Verify egg exists and belongs to user
  SELECT starter_element INTO v_starter_element
  FROM public.eggs
  WHERE id = p_egg_id
    AND user_id = p_user_id
    AND hatched_at IS NULL;
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Egg not found or already hatched';
  END IF;
  
  -- Get personality ID
  SELECT id INTO v_personality_id
  FROM public.personalities
  WHERE key = p_personality_key;
  
  -- Get base stats from pet_stats table (should exist from egg creation)
  -- These should total 10 as per your egg system
  SELECT 
    base_hp, base_atk, base_magi, base_def, base_spd, base_mana
  INTO 
    v_base_hp, v_base_atk, v_base_magi, v_base_def, v_base_spd, v_base_mana
  FROM public.pet_stats ps
  JOIN public.eggs e ON e.pet_id = ps.pet_id
  WHERE e.id = p_egg_id;
  
  -- If no base stats found, use default distribution (totaling 10)
  IF v_base_hp IS NULL THEN
    v_base_hp   := 2;
    v_base_atk  := 2;
    v_base_magi := 2;
    v_base_def  := 2;
    v_base_spd  := 1;
    v_base_mana := 1;
  END IF;
  
  -- Allocate EXACTLY 7 random points across the 6 stats for level 1
  v_iv_hp := 0;
  v_iv_atk := 0;
  v_iv_magi := 0;
  v_iv_def := 0;
  v_iv_spd := 0;
  v_iv_mana := 0;
  v_remaining_points := 7;
  
  -- Randomly distribute 7 points
  WHILE v_remaining_points > 0 LOOP
    v_random_stat := floor(random() * 6)::int;
    
    CASE v_random_stat
      WHEN 0 THEN v_iv_hp := v_iv_hp + 1;
      WHEN 1 THEN v_iv_atk := v_iv_atk + 1;
      WHEN 2 THEN v_iv_magi := v_iv_magi + 1;
      WHEN 3 THEN v_iv_def := v_iv_def + 1;
      WHEN 4 THEN v_iv_spd := v_iv_spd + 1;
      WHEN 5 THEN v_iv_mana := v_iv_mana + 1;
    END CASE;
    
    v_remaining_points := v_remaining_points - 1;
  END LOOP;
  
  -- Calculate totals (base 10 + IVs 7 = 17)
  v_total_hp   := v_base_hp + v_iv_hp;
  v_total_atk  := v_base_atk + v_iv_atk;
  v_total_magi := v_base_magi + v_iv_magi;
  v_total_def  := v_base_def + v_iv_def;
  v_total_spd  := v_base_spd + v_iv_spd;
  v_total_mana := v_base_mana + v_iv_mana;
  v_hp_max     := v_total_hp * 10;
  
  -- Verify totals are correct (debugging aid)
  IF (v_total_hp + v_total_atk + v_total_magi + v_total_def + v_total_spd + v_total_mana) != 17 THEN
    RAISE EXCEPTION 'Stat allocation error: Total stats should be 17, got %', 
      (v_total_hp + v_total_atk + v_total_magi + v_total_def + v_total_spd + v_total_mana);
  END IF;
  
  -- Create pet
  INSERT INTO public.pets (
    user_id,
    name,
    nickname,
    line,
    stage,
    level,
    xp,
    species,
    description,
    
    -- Stats (17 total)
    atk,
    def,
    spd,
    magi,
    mana,
    hp_max,
    hp_cur,
    
    -- Care stats - ONLY short names
    hunger,
    clean,
    happy,
    comfort,
    rest,
    energy,
    bond,
    neglect_hours,
    ran_away,
    runaway_at,
    last_care_update,
    last_care_decay_at,
    
    -- Personality
    personality_id,
    personality_key,
    
    -- Timestamps
    hatched_at,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_species,
    p_nickname,
    v_starter_element::elemental_line,
    'hatchling'::pet_stage,
    1,
    0,
    p_species,
    p_description,
    
    v_total_atk,
    v_total_def,
    v_total_spd,
    v_total_magi,
    v_total_mana,
    v_hp_max,
    v_hp_max,
    
    50, -- hunger
    50, -- clean
    50, -- happy
    50, -- comfort
    50, -- rest
    50, -- energy
    0,  -- bond
    0,  -- neglect_hours
    false, -- ran_away
    NULL,  -- runaway_at
    v_now, -- last_care_update
    v_now, -- last_care_decay_at
    
    v_personality_id,
    p_personality_key,
    
    v_now,
    true,
    v_now,
    v_now
  ) RETURNING id INTO v_pet_id;
  
  -- Update/Insert base stats record (10 total from egg)
  INSERT INTO public.pet_stats (
    pet_id,
    base_hp,
    base_atk,
    base_magi,
    base_def,
    base_spd,
    base_mana,
    base_total
  ) VALUES (
    v_pet_id,
    v_base_hp,
    v_base_atk,
    v_base_magi,
    v_base_def,
    v_base_spd,
    v_base_mana,
    10  -- Egg base stats total
  )
  ON CONFLICT (pet_id) DO UPDATE SET
    base_hp = EXCLUDED.base_hp,
    base_atk = EXCLUDED.base_atk,
    base_magi = EXCLUDED.base_magi,
    base_def = EXCLUDED.base_def,
    base_spd = EXCLUDED.base_spd,
    base_mana = EXCLUDED.base_mana;
  
  -- Store the 7 IV points in pet_stat_allocations for level 1
  INSERT INTO public.pet_stat_allocations (
    pet_id,
    level,
    hp,
    atk,
    magi,
    def,
    spd,
    mana
  ) VALUES (
    v_pet_id,
    1,
    v_iv_hp,
    v_iv_atk,
    v_iv_magi,
    v_iv_def,
    v_iv_spd,
    v_iv_mana
  );
  
  -- Mark egg as hatched
  UPDATE public.eggs
  SET hatched_at = v_now,
      pet_id = v_pet_id
  WHERE id = p_egg_id;
  
  RETURN v_pet_id;
END;
$$;

COMMENT ON FUNCTION public.hatch_pet IS 
'Hatches an egg into a level 1 pet. Egg has 10 base stats, level 1 adds exactly 7 random points (17 total).';
