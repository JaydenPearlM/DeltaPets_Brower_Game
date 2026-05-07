-- Add unique constraint to prevent race conditions in daily care completion
-- This ensures a user can only complete daily care once per Eastern day

-- First, add a computed column for the Eastern date
ALTER TABLE daily_care 
ADD COLUMN IF NOT EXISTS completed_date_eastern DATE;

-- Create a function to extract the Eastern date from a timestamp
CREATE OR REPLACE FUNCTION extract_eastern_date(ts TIMESTAMPTZ)
RETURNS DATE AS $$
BEGIN
  RETURN (ts AT TIME ZONE 'America/New_York')::DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing rows to populate the date column
UPDATE daily_care
SET completed_date_eastern = extract_eastern_date(last_completed_at)
WHERE last_completed_at IS NOT NULL;

-- Create unique constraint
ALTER TABLE daily_care
ADD CONSTRAINT daily_care_user_date_unique 
UNIQUE (user_id, completed_date_eastern);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_daily_care_user_date 
ON daily_care(user_id, completed_date_eastern);

COMMENT ON CONSTRAINT daily_care_user_date_unique ON daily_care IS 
'Prevents race conditions by ensuring a user can only complete daily care once per Eastern calendar day';