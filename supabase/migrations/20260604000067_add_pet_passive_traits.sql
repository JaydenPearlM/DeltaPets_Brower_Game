alter table public.pets
add column if not exists passive_trait_id uuid,
add column if not exists passive_trait_key text;

alter table public.pets
add constraint pets_passive_trait_id_fkey
foreign key (passive_trait_id)
references public.passive_traits(id);