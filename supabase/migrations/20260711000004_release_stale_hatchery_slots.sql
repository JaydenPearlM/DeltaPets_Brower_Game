-- Clears hatchery slot references left behind after an egg already hatched.
-- The pet row remains valid; only the incubator slot is released.

update public.hatchery_slots as slot
set pet_id = null
from public.pets as pet
where slot.pet_id = pet.id
  and pet.stage <> 'egg';