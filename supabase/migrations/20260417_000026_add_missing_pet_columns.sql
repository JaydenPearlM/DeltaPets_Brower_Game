begin;

alter table public.pets
  add column if not exists species text,
  add column if not exists hatch_time_alignment text;

comment on column public.pets.species is 'Starter species id / canonical species key used by the pet.';
comment on column public.pets.hatch_time_alignment is 'World time alignment captured when the egg was created, used later during hatch logic.';

create index if not exists idx_pets_species
  on public.pets (species);

commit;