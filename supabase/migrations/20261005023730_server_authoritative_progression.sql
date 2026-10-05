-- Deploy with the authenticated storage frontend/backend during maintenance.
-- Ownership permits reading these rows, not choosing authoritative game state.
-- Preserve existing SELECT grants, RLS policies, service-role access and data.
BEGIN;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON public.pets, public.party_slots, public.hatchery_slots,
   public.pet_stats, public.pet_stat_allocations, public.pet_elements
FROM PUBLIC, anon, authenticated;

-- These RPCs are the trusted replacements for browser storage/hatch/reward writes.
REVOKE EXECUTE ON FUNCTION public.apply_pet_storage_action(uuid, text, uuid, integer)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_pet_storage_action(uuid, text, uuid, integer)
TO service_role;

COMMIT;
