-- 20260710000002_add_pet_location_inventory.sql
-- Adds a new "inventory" value to the pet_location enum (created in
-- 20260131000007_pet_location_party_slots.sql as 'hatchery' | 'active' |
-- 'storage'). Needed so Kithna roam eggs can land in a holding spot the
-- player chooses to move to Storage or the Hatchery, instead of being
-- auto-placed into an incubating hatchery slot the instant they're found.
--
-- This must be its own file/transaction: Postgres does not allow a newly
-- added enum value to be referenced by other statements in the same
-- transaction it was added in.

alter type public.pet_location add value if not exists 'inventory';

-- Rollback: Postgres does not support removing enum values directly.
-- If this needs to be undone, the safe path is:
--   1. update public.pets set location = 'storage' where location = 'inventory';
--   2. create a new enum type without 'inventory', swap the column type,
--      drop the old enum, rename the new one.
-- Not doing that automatically here since it's destructive to attempt
-- blind. Flag if a real rollback is ever needed.

-- Verification:
-- select enum_range(null::public.pet_location);
