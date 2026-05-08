===========================================
DELTAPETS BUG FIX - ENERGY CONSTRAINT
===========================================

ROOT CAUSE:
Migration 20260508_000035 changed the energy CHECK constraint from <= 100 to <= 50
but forgot to update the DEFAULT value which remained at 100.

This causes ALL pet inserts to fail with:
"new row for relation "pets" violates check constraint "pets_energy_check""

===========================================
FIX 1: DATABASE MIGRATION (CRITICAL)
===========================================

File: supabase/migrations/20260508_000036_fix_energy_default.sql

-- Migration: Fix energy default value to match constraint
-- Description: Changes default from 100 to 50 to match CHECK constraint
-- Date: 2026-05-08
-- Migration number: 20260508_000036

ALTER TABLE public.pets 
ALTER COLUMN energy SET DEFAULT 50;

-- Verify no constraint violations exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.pets WHERE energy > 50 OR energy < 0
  ) THEN
    RAISE EXCEPTION 'Energy values outside constraint bounds still exist';
  END IF;
END $$;

COMMENT ON COLUMN public.pets.energy IS 'Energy stat defaults to 50 and is capped at 50 to match care stat balance';

===========================================
FIX 2: BACKEND - ENSURE-EGG ROUTE
===========================================

File: backend/server/src/routes/routePets/routePets.ts

STEP 1: Update type definitions (lines 81-103)

type PetInsertPayload = {
  user_id: string;
  name: string;
  species?: string;
  line: ElementalLine;
  stage: string;
  energy: number; // ADD THIS LINE
  hatch_ends_at: string;
  is_active: boolean;
  location: string;
  personality_key?: string | null;
  hatch_time_alignment?: string | null;
  growth_strong_stats?: string[] | null;
  growth_weak_stat?: string | null;
};

type MinimalPetInsertPayload = {
  user_id: string;
  name: string;
  line: ElementalLine;
  stage: string;
  energy: number; // ADD THIS LINE
  hatch_ends_at: string;
  is_active: boolean;
  location: string;
};

STEP 2: Update insert payloads (lines 257-280)

const fullInsertPayload = {
  user_id: userId,
  name: starter.eggName,
  species: starter.speciesId,
  line: resolvedLine,
  stage: "egg",
  energy: 50, // ADD THIS LINE
  hatch_ends_at: hatchEndsAt,
  is_active: false,
  location: "hatchery",
  personality_key: personalityKey ?? null,
  hatch_time_alignment: worldTime ?? null,
  growth_strong_stats: strongStats,
  growth_weak_stat: weakStat,
} as PetInsertPayload;

const fallbackInsertPayload = {
  user_id: userId,
  name: starter.eggName,
  line: resolvedLine,
  stage: "egg",
  energy: 50, // ADD THIS LINE
  hatch_ends_at: hatchEndsAt,
  is_active: false,
  location: "hatchery",
} as MinimalPetInsertPayload;

===========================================
FIX 3: BACKEND - REWARDS ROUTE
===========================================

File: backend/server/src/routes/rewards/rewards.ts

Update the giveEgg function (around line 245):

async function giveEgg(user_id: string, element: Element) {
  const hatchEndsAt = new Date(
    Date.now() + EGG_HATCH_MINUTES * 60 * 1000,
  ).toISOString();

  const { error } = await supabaseAdmin.from("pets").insert({
    user_id,
    name: `${element} reward egg`,
    species: "reward_egg",
    line: element,
    stage: "egg",
    energy: 50, // ADD THIS LINE
    hatch_ends_at: hatchEndsAt,
    is_active: false,
    location: "hatchery",
  });

  if (error) throw error;
}

===========================================
DEPLOYMENT ORDER
===========================================

1. Run the database migration FIRST
   - This fixes the DEFAULT value
   - Existing code will start working immediately

2. Deploy backend changes
   - This makes the energy value explicit
   - Prevents future issues if default changes

3. Test egg creation flow:
   - Create new egg via /api/pets/ensure-egg
   - Claim reward egg via weekly rewards
   - Verify both paths work

===========================================
VERIFICATION QUERIES
===========================================

-- Check current default value
SELECT column_default 
FROM information_schema.columns 
WHERE table_name = 'pets' AND column_name = 'energy';

-- Should return: 50

-- Check constraint
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'pets_energy_check';

-- Should return: ((energy >= 0) AND (energy <= 50))

-- Check existing pets don't violate constraint
SELECT COUNT(*) FROM pets WHERE energy > 50 OR energy < 0;

-- Should return: 0

===========================================
RELATED NOTES
===========================================

STATUS: The hatch_pet RPC already sets energy = 50 correctly.
This bug only affects direct INSERT operations.

FUTURE: Consider creating a database trigger to enforce
sensible defaults for care stats if explicitly set to NULL.