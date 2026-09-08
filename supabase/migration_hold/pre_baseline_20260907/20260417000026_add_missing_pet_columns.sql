-- Migration: Add missing pet columns
-- Description: Adds care stat columns and other missing fields to pets table
-- Date: 2026-04-17
-- Migration number: 20260417_000026

-- ============================================================================
-- Add care stat columns
-- ============================================================================

-- Add clean column (replaces old cleanliness)
ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS clean integer NOT NULL DEFAULT 50 
CHECK (clean >= 0 AND clean <= 100);

-- Add happy column (replaces old happiness)
ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS happy integer NOT NULL DEFAULT 50 
CHECK (happy >= 0 AND happy <= 100);

-- Add comfort column
ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS comfort integer NOT NULL DEFAULT 50 
CHECK (comfort >= 0 AND comfort <= 50);

-- Add rest column
ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS rest integer NOT NULL DEFAULT 50 
CHECK (rest >= 0 AND rest <= 50);

-- ============================================================================
-- Add neglect tracking columns
-- ============================================================================

ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS neglect_hours integer NOT NULL DEFAULT 0 
CHECK (neglect_hours >= 0);

ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS ran_away boolean NOT NULL DEFAULT false;

ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS runaway_at timestamp with time zone;

-- ============================================================================
-- Add last care decay timestamp
-- ============================================================================

ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS last_care_decay_at timestamp with time zone;

-- ============================================================================
-- Add comments
-- ============================================================================

COMMENT ON COLUMN public.pets.clean IS 'Cleanliness stat (0-50 scale for balanced decay)';
COMMENT ON COLUMN public.pets.happy IS 'Happiness stat (0-50 scale for balanced decay)';
COMMENT ON COLUMN public.pets.neglect_hours IS 'Total hours of neglect (used for runaway calculation)';
COMMENT ON COLUMN public.pets.ran_away IS 'Whether the pet has permanently run away';