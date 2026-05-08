-- Migration: Align stat caps to 50
-- Description: Updates CHECK constraints on pets table to match code's stat clamp of 50
-- Date: 2026-05-08
-- Migration number: 20260508_000035

-- ============================================================================
-- STEP 1: Cap existing data that exceeds 50
-- ============================================================================

UPDATE public.pets
SET 
  hunger = LEAST(hunger, 50),
  clean = LEAST(clean, 50),
  happy = LEAST(happy, 50),
  energy = LEAST(energy, 50),
  comfort = LEAST(comfort, 50),
  rest = LEAST(rest, 50)
WHERE 
  hunger > 50 
  OR clean > 50 
  OR happy > 50 
  OR energy > 50 
  OR comfort > 50 
  OR rest > 50;

-- ============================================================================
-- STEP 2: Drop old constraints
-- ============================================================================

ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS pets_hunger_check;
ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS pets_clean_check;
ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS pets_happy_check;
ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS pets_energy_check;
ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS pets_comfort_check;
ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS pets_rest_check;

-- ============================================================================
-- STEP 3: Add new constraints with 50 cap
-- ============================================================================

ALTER TABLE public.pets ADD CONSTRAINT pets_hunger_check 
  CHECK (hunger >= 0 AND hunger <= 50);

ALTER TABLE public.pets ADD CONSTRAINT pets_clean_check 
  CHECK (clean >= 0 AND clean <= 50);

ALTER TABLE public.pets ADD CONSTRAINT pets_happy_check 
  CHECK (happy >= 0 AND happy <= 50);

ALTER TABLE public.pets ADD CONSTRAINT pets_energy_check 
  CHECK (energy >= 0 AND energy <= 50);

ALTER TABLE public.pets ADD CONSTRAINT pets_comfort_check 
  CHECK (comfort >= 0 AND comfort <= 50);

ALTER TABLE public.pets ADD CONSTRAINT pets_rest_check 
  CHECK (rest >= 0 AND rest <= 50);

-- ============================================================================
-- STEP 4: Add comments explaining the design decision
-- ============================================================================

COMMENT ON CONSTRAINT pets_hunger_check ON public.pets IS 'Care stats cap at 50 to allow balanced decay and future expansion';
COMMENT ON CONSTRAINT pets_clean_check ON public.pets IS 'Care stats cap at 50 to allow balanced decay and future expansion';
COMMENT ON CONSTRAINT pets_happy_check ON public.pets IS 'Care stats cap at 50 to allow balanced decay and future expansion';
COMMENT ON CONSTRAINT pets_energy_check ON public.pets IS 'Care stats cap at 50 to allow balanced decay and future expansion';