begin;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'inventory'
      and column_name = 'pet_id'
  ) then

    alter table public.inventory
      alter column pet_id drop not null;

    if not exists (
      select 1
      from pg_constraint
      where conname = 'inventory_pet_id_fkey'
        and conrelid = 'public.inventory'::regclass
    ) then
      alter table public.inventory
        add constraint inventory_pet_id_fkey
        foreign key (pet_id)
        references public.pets(id)
        on delete cascade;
    end if;

  end if;
end $$;

commit;