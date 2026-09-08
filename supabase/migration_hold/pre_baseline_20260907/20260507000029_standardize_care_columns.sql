-- Priority 1 Fix: Standardize care columns and drop ALL duplicates
-- Drops: cleanliness, happiness, is_runaway, last_care_update
-- Keeps: clean, happy, ran_away, last_care_decay_at

-- Step 1: Add missing columns if they don't exist (safe)
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS clean int,
  ADD COLUMN IF NOT EXISTS happy int,
  ADD COLUMN IF NOT EXISTS neglect_hours int,
  ADD COLUMN IF NOT EXISTS ran_away boolean;

-- Step 2: Fill missing values safely
-- Do not reference old duplicate columns directly because they may already be gone.
UPDATE public.pets
SET 
  clean = COALESCE(clean, 50),
  happy = COALESCE(happy, 50),
  neglect_hours = COALESCE(neglect_hours, 0),
  ran_away = COALESCE(ran_away, false)
WHERE clean IS NULL 
   OR happy IS NULL 
   OR neglect_hours IS NULL
   OR ran_away IS NULL;

-- Step 3: Make the columns NOT NULL with proper defaults
ALTER TABLE public.pets
  ALTER COLUMN clean SET DEFAULT 50,
  ALTER COLUMN clean SET NOT NULL,
  ALTER COLUMN happy SET DEFAULT 50,
  ALTER COLUMN happy SET NOT NULL,
  ALTER COLUMN neglect_hours SET DEFAULT 0,
  ALTER COLUMN neglect_hours SET NOT NULL,
  ALTER COLUMN ran_away SET DEFAULT false,
  ALTER COLUMN ran_away SET NOT NULL;

-- Step 4: Add constraints
ALTER TABLE public.pets
  DROP CONSTRAINT IF EXISTS pets_clean_check,
  ADD CONSTRAINT pets_clean_check CHECK (clean BETWEEN 0 AND 100);

ALTER TABLE public.pets
  DROP CONSTRAINT IF EXISTS pets_happy_check,
  ADD CONSTRAINT pets_happy_check CHECK (happy BETWEEN 0 AND 100);

ALTER TABLE public.pets
  DROP CONSTRAINT IF EXISTS pets_neglect_hours_check,
  ADD CONSTRAINT pets_neglect_hours_check CHECK (neglect_hours >= 0);

-- Step 5: Drop ALL the old duplicate columns
ALTER TABLE public.pets
  DROP COLUMN IF EXISTS cleanliness,
  DROP COLUMN IF EXISTS happiness,
  DROP COLUMN IF EXISTS is_runaway,
  DROP COLUMN IF EXISTS last_care_update;

-- Step 6: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_pets_neglect_hours 
  ON public.pets (neglect_hours) WHERE neglect_hours > 0;

CREATE INDEX IF NOT EXISTS idx_pets_ran_away 
  ON public.pets (ran_away) WHERE ran_away = true;

-- Step 7: Add helpful comments
COMMENT ON COLUMN public.pets.clean IS 
'Pet cleanliness stat (0-100). Decays over time if not cared for.';

COMMENT ON COLUMN public.pets.happy IS 
'Pet happiness stat (0-100). Increases with play interactions.';

COMMENT ON COLUMN public.pets.neglect_hours IS 
'Hours the pet has been neglected. Increments when care stats are critically low.';

COMMENT ON COLUMN public.pets.ran_away IS 
'Whether the pet has run away due to neglect. Can be recovered through special actions.';