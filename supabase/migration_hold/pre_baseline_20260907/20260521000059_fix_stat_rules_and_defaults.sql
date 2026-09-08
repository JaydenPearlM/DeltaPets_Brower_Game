-- Diagnostic: Check what columns exist in pet_stats
DO $$ 
DECLARE
    col_name text;
    col_default text;
BEGIN
    RAISE NOTICE '=== pet_stats columns ===';
    FOR col_name, col_default IN 
        SELECT column_name, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pet_stats'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'Column: %, Default: %', col_name, COALESCE(col_default, 'NULL');
    END LOOP;
END $$;

-- Fix 1: Update game_config stat_rules to correct base_total
-- Egg base stats sum to 10, hatchlings get +7 random = 17 total
UPDATE public.game_config 
SET value = '{"base_total": 10, "points_per_level": 1, "max_level": 100}'
WHERE key = 'stat_rules';

-- Fix 2 will be added after we see the actual column names