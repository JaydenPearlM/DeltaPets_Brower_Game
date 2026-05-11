-- Migration: Fix energy default value to match constraint
-- Description: Changes default from 100 to 50 to match CHECK constraint
-- Date: 2026-05-08
-- Migration number: 20260508_000036

ALTER TABLE public.pets 
ALTER COLUMN energy SET DEFAULT 50;

UPDATE public.pets
SET energy = 50
WHERE energy IS NULL OR energy > 50 OR energy < 0;

COMMENT ON COLUMN public.pets.energy IS 
'Energy stat defaults to 50 and is capped at 50 to match care stat balance';