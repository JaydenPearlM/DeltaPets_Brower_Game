-- Step 1: Add the short-name columns (safe if they already exist)
ALTER TABLE pets ADD COLUMN IF NOT EXISTS clean int;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS happy int;

-- Step 2: Copy data from old → new
UPDATE pets SET 
  clean = COALESCE(clean, cleanliness, 50),
  happy = COALESCE(happy, happiness, 50);

-- Step 3: Make them NOT NULL with defaults
ALTER TABLE pets ALTER COLUMN clean SET NOT NULL;

-- Step 4: Drop the old duplicate columns
ALTER TABLE pets DROP COLUMN IF EXISTS cleanliness;
ALTER TABLE pets DROP COLUMN IF EXISTS happiness;