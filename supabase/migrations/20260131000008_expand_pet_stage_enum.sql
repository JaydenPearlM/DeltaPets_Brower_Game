do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'pet_stage'
  ) then

    if not exists (
      select 1
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public'
        and t.typname = 'pet_stage_v2'
    ) then
      create type public.pet_stage_v2 as enum (
        'egg',
        'hatchling',
        'lowform',
        'highform',
        'legion',
        'mythical_legendary'
      );
    end if;

    alter table public.pets
      alter column stage drop default;

    alter table public.pets
      alter column stage
      type public.pet_stage_v2
      using (
        case
          when stage::text = 'baby' then 'hatchling'
          when stage::text = 'child' then 'lowform'
          when stage::text = 'adult' then 'highform'
          when stage::text = 'teen' then 'legion'
          when stage::text = 'mythical' then 'mythical_legendary'
          else stage::text
        end
      )::public.pet_stage_v2;

    drop type public.pet_stage;

    alter type public.pet_stage_v2 rename to pet_stage;

    alter table public.pets
      alter column stage set default 'egg'::public.pet_stage;

  end if;
end $$;