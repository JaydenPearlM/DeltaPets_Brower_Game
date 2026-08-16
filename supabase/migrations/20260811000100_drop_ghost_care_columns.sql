-- Migration: drop_ghost_care_columns
-- Date: 2026-08-11
--
-- Drops the three legacy care columns that were superseded by the canonical
-- columns in migration 20260507000029_standardize_care_columns:
--
--   cleanliness -> clean       (canonical)
--   happiness   -> happy       (canonical)
--   is_runaway  -> ran_away    (canonical)
--
-- These columns survived as compatibility shims while backend code was
-- updated. The backend petCareHelpers.ts normalizePetForClient function
-- has been keeping them in sync with their canonical counterparts.
--
-- After this migration runs:
--   1. Remove the ghost-column writes from petCareHelpers.ts normalizePetForClient.
--   2. The read-fallbacks (pet.clean ?? pet.cleanliness, pet.happy ?? pet.happiness,
--      pet.ran_away ?? pet.is_runaway) can also be removed once you confirm no
--      other query path still returns the old column names.
--
-- Uses IF EXISTS throughout so this is safe to replay.

alter table public.pets
  drop column if exists cleanliness,
  drop column if exists happiness,
  drop column if exists is_runaway;

-- Drop the index that was created for is_runaway in migration 20260131000006
-- if it still exists (the column drop may have already removed it, but this
-- is explicit for clarity).
drop index if exists public.pets_is_runaway_idx;
