begin;

alter table public.pets
  drop constraint if exists pets_energy_check;

alter table public.pets
  alter column energy set default 100;

update public.pets
set energy = 100
where energy is null or energy = 50;

alter table public.pets
  add constraint pets_energy_check
  check (energy >= 0 and energy <= 100);

-- IMPORTANT:
-- In your latest hatch_pet migration, change:
-- energy = 50,
-- to:
-- energy = 100,

-- ALSO:
-- In apply_pet_care_decay, remove energy decay.
-- Change this:
-- v_new_energy := greatest(0, least(50, coalesce(v_pet.energy, 50) - floor(v_ticks / 3)));
--
-- To this:
-- v_new_energy := greatest(0, least(100, coalesce(v_pet.energy, 100)));

notify pgrst, 'reload schema';

commit;