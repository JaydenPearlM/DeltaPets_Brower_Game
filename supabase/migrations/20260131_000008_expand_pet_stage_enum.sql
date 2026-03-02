-- supabase/migrations/20260131_000006_expand_pet_stage_enum.sql
-- Expands pet_stage enum to real lifecycle stages.
-- Converts existing "baby" stage rows to "baby".

do $$
begin
  -- Only run if the old enum exists
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'pet_stage'
  ) then

    -- Create v2 enum if it doesn't exist
    if not exists (
      select 1
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public'
        and t.typname = 'pet_stage_v2'
    ) then
      create type public.pet_stage_v2 as enum (
        'egg',
        'baby',
        'toddler',
        'teen',
        'adult',
        'mythic_legendary'
      );
    end if;

    -- Alter pets.stage to new enum; convert "sprout" -> "baby"
    alter table public.pets
      alter column stage
      type public.pet_stage_v2
      using (
        case
          when stage::text = 'egg' then 'baby'
          else stage::text
        end
      )::public.pet_stage_v2;

    -- Drop old enum and rename v2 -> pet_stage
    drop type public.pet_stage;
    alter type public.pet_stage_v2 rename to pet_stage;

  end if;
end $$;
