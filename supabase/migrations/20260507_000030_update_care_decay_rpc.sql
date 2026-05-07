-- Priority 1 Fix Part 2: Update RPC function to use new column names
-- This migration updates the apply_pet_care_decay function to work with the standardized column names

DROP FUNCTION IF EXISTS public.apply_pet_care_decay(uuid);

CREATE OR REPLACE FUNCTION public.apply_pet_care_decay(p_pet_id uuid)
RETURNS TABLE (
  hunger int,
  clean int,        -- ← Changed from "cleanliness"
  happy int,        -- ← Changed from "happiness"
  comfort int,
  rest int,
  energy int,
  ran_away boolean, -- ← Changed from "is_runaway"
  last_care_decay_at timestamptz
) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_pet record;
  v_ticks int;
  v_new_hunger int;
  v_new_clean int;     -- ← Changed from v_new_cleanliness
  v_new_happy int;     -- ← Changed from v_new_happiness
  v_new_comfort int;
  v_new_rest int;
  v_new_energy int;
BEGIN
  -- Fetch pet row using NEW column names
  select
    pets.id,
    pets.hunger,
    pets.clean,        -- ← Changed from cleanliness
    pets.happy,        -- ← Changed from happiness
    pets.comfort,
    pets.rest,
    pets.energy,
    pets.ran_away,     -- ← Changed from is_runaway
    pets.last_care_decay_at
  into v_pet
  from public.pets
  where pets.id = p_pet_id;

  -- ... rest of the function using the new column names
  
  -- Calculate decay
  v_new_clean := greatest(0, least(100, coalesce(v_pet.clean, 50) - floor(v_ticks / 2)));
  v_new_happy := greatest(0, least(100, coalesce(v_pet.happy, 50) - floor(v_ticks / 2)));
  
  -- Update pet using new column names
  update public.pets set
    hunger = v_new_hunger,
    clean = v_new_clean,      -- ← Writing to "clean" not "cleanliness"
    happy = v_new_happy,      -- ← Writing to "happy" not "happiness"
    comfort = v_new_comfort,
    rest = v_new_rest,
    energy = v_new_energy,
    ran_away = (...),         -- ← Writing to "ran_away" not "is_runaway"
    last_care_decay_at = now()
  where id = p_pet_id;

  -- Return new values
  return query select
    v_new_hunger,
    v_new_clean,    -- ← Returning "clean"
    v_new_happy,    -- ← Returning "happy"
    ...
END;
$$;