-- Fix pet_stats default values to match the constraint
-- Current: all 6 stats default to 5 (sum = 30)
-- But base_total defaults to 25
-- Actual design: egg base stats sum to 10, not 25

ALTER TABLE public.pet_stats 
  ALTER COLUMN base_hp DROP DEFAULT,
  ALTER COLUMN base_atk DROP DEFAULT,
  ALTER COLUMN base_magi DROP DEFAULT,
  ALTER COLUMN base_def DROP DEFAULT,
  ALTER COLUMN base_spd DROP DEFAULT,
  ALTER COLUMN base_mana DROP DEFAULT,
  ALTER COLUMN base_total SET DEFAULT 10;

COMMENT ON TABLE public.pet_stats IS 'Base stats for pets. Egg base stats sum to 10, then +7 random points at hatch = 17 total. All stat values must be explicitly provided during pet creation.';