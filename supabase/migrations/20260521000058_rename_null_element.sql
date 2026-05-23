-- Check what columns actually exist in pet_elements
DO $$ 
DECLARE
    col_name text;
BEGIN
    FOR col_name IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pet_elements'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'Column found: %', col_name;
    END LOOP;
    
    -- Only rename if the column exists as "null"
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pet_elements' 
        AND column_name = 'null'
    ) THEN
        ALTER TABLE public.pet_elements RENAME COLUMN "null" TO neutral;
        ALTER TABLE public.pet_elements DROP CONSTRAINT IF EXISTS pet_elements_null_check;
        ALTER TABLE public.pet_elements ADD CONSTRAINT pet_elements_neutral_check CHECK (neutral >= 0);
        COMMENT ON COLUMN public.pet_elements.neutral IS 'XP for neutral element affinity (renamed from reserved keyword null)';
        RAISE NOTICE 'Column renamed from null to neutral';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pet_elements' 
        AND column_name = 'neutral'
    ) THEN
        RAISE NOTICE 'Column already renamed to neutral';
        COMMENT ON COLUMN public.pet_elements.neutral IS 'XP for neutral element affinity (renamed from reserved keyword null)';
    ELSE
        RAISE NOTICE 'Neither null nor neutral column exists - check output above';
    END IF;
END $$;