begin;

alter table public.inventory
  alter column pet_id drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'inventory_pet_id_fkey'
  ) then
    alter table public.inventory
      add constraint inventory_pet_id_fkey
      foreign key (pet_id)
      references public.pets(id)
      on delete cascade;
  end if;
end $$;

commit;