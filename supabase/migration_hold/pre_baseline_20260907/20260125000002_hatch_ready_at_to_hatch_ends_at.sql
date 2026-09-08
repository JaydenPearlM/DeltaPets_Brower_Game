alter table public.pets
  add column if not exists hatch_ends_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pets'
      and column_name = 'hatch_ready_at'
  ) then
    execute '
      update public.pets
      set hatch_ends_at = hatch_ready_at
      where hatch_ends_at is null
        and hatch_ready_at is not null
    ';

    alter table public.pets
      drop column hatch_ready_at;
  end if;
end $$;