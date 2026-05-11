-- Add unique constraint to prevent race conditions in daily care completion
-- This ensures a user can only complete daily care once per Eastern day

-- First, add a computed column for the Eastern date
ALTER TABLE public.daily_care 
ADD COLUMN IF NOT EXISTS completed_date_eastern DATE;

-- Create a function to extract the Eastern date from a timestamp
CREATE OR REPLACE FUNCTION public.extract_eastern_date(ts TIMESTAMPTZ)
RETURNS DATE AS $$
BEGIN
  RETURN (ts AT TIME ZONE 'America/New_York')::DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing rows to populate the date column
UPDATE public.daily_care
SET completed_date_eastern = public.extract_eastern_date(last_completed_at)
WHERE last_completed_at IS NOT NULL;

-- Create unique constraint safely
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'daily_care_user_date_unique'
  ) then
    alter table public.daily_care
      add constraint daily_care_user_date_unique
      unique (user_id, completed_date_eastern);
  end if;
end $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_daily_care_user_date 
ON public.daily_care(user_id, completed_date_eastern);

COMMENT ON CONSTRAINT daily_care_user_date_unique ON public.daily_care IS 
'Prevents race conditions by ensuring a user can only complete daily care once per Eastern calendar day';