ALTER TABLE public.hatchery_slots
DROP CONSTRAINT IF EXISTS hatchery_slots_slot_index_check;

ALTER TABLE public.hatchery_slots
ADD CONSTRAINT hatchery_slots_slot_index_check
CHECK (slot_index >= 1 AND slot_index <= 12);