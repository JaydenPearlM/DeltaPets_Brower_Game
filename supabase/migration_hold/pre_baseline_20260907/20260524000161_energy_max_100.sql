ALTER TABLE public.pets
  DROP CONSTRAINT IF EXISTS pets_energy_check;

ALTER TABLE public.pets
  ALTER COLUMN energy SET DEFAULT 100;

UPDATE public.pets
SET energy = 100
WHERE energy IS NULL OR energy < 100;

ALTER TABLE public.pets
  ADD CONSTRAINT pets_energy_check
  CHECK (energy >= 0 AND energy <= 100);