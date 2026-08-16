begin;

do $$
declare
  hatch_pet_count integer;
  hatch_pet_definition text;
begin
  select count(*)
  into hatch_pet_count
  from pg_proc as procedure
  join pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = 'hatch_pet';

  if hatch_pet_count <> 1 then
    raise exception 'Expected exactly one public.hatch_pet function, found %', hatch_pet_count;
  end if;

  select lower(pg_get_functiondef(procedure.oid))
  into hatch_pet_definition
  from pg_proc as procedure
  join pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = 'hatch_pet';

  if hatch_pet_definition !~ 'p_line[[:space:]]+(public[.])?elemental_line' then
    raise exception 'public.hatch_pet is missing the p_line elemental_line parameter';
  end if;

  if hatch_pet_definition !~ 'name[[:space:]]*=[[:space:]]*p_hatchling_name' then
    raise exception 'public.hatch_pet is not updating pets.name';
  end if;

  if hatch_pet_definition !~ 'line[[:space:]]*=[[:space:]]*p_line' then
    raise exception 'public.hatch_pet is not updating pets.line';
  end if;

  if hatch_pet_definition !~ 'stage[[:space:]]*=[[:space:]]*''hatchling''' then
    raise exception 'public.hatch_pet is not updating pets.stage';
  end if;

  if hatch_pet_definition !~ 'hatched_at[[:space:]]*=[[:space:]]*v_now' then
    raise exception 'public.hatch_pet is not updating pets.hatched_at';
  end if;

  if hatch_pet_definition !~ 'hatch_ends_at[[:space:]]*=[[:space:]]*null' then
    raise exception 'public.hatch_pet is not clearing pets.hatch_ends_at';
  end if;

  if hatch_pet_definition !~ 'location[[:space:]]*=[[:space:]]*''storage''' then
    raise exception 'public.hatch_pet is not setting the post-hatch location';
  end if;

  if hatch_pet_definition !~ 'gender[[:space:]]*=' then
    raise exception 'public.hatch_pet is not updating pets.gender';
  end if;

  if hatch_pet_definition !~ 'hp_max[[:space:]]*=[[:space:]]*v_hp_max' or
     hatch_pet_definition !~ 'hp_cur[[:space:]]*=[[:space:]]*v_hp_max' or
     hatch_pet_definition !~ 'atk[[:space:]]*=[[:space:]]*v_total_atk' or
     hatch_pet_definition !~ 'def[[:space:]]*=[[:space:]]*v_total_def' or
     hatch_pet_definition !~ 'spd[[:space:]]*=[[:space:]]*v_total_spd' or
     hatch_pet_definition !~ 'magi[[:space:]]*=[[:space:]]*v_total_magi' or
     hatch_pet_definition !~ 'mana[[:space:]]*=[[:space:]]*v_total_mana' then
    raise exception 'public.hatch_pet is missing one or more required stat updates';
  end if;

  if hatch_pet_definition !~ 'hunger[[:space:]]*=[[:space:]]*50' or
     hatch_pet_definition !~ 'clean[[:space:]]*=[[:space:]]*50' or
     hatch_pet_definition !~ 'happy[[:space:]]*=[[:space:]]*50' or
     hatch_pet_definition !~ 'comfort[[:space:]]*=[[:space:]]*50' or
     hatch_pet_definition !~ 'rest[[:space:]]*=[[:space:]]*50' or
     hatch_pet_definition !~ 'energy[[:space:]]*=[[:space:]]*100' then
    raise exception 'public.hatch_pet is missing one or more required care updates';
  end if;

  if hatch_pet_definition !~ 'personality_id[[:space:]]*=[[:space:]]*p_personality_id' or
     hatch_pet_definition !~ 'personality_key[[:space:]]*=[[:space:]]*p_personality_key' or
     hatch_pet_definition !~ 'description[[:space:]]*=[[:space:]]*p_description' or
     hatch_pet_definition !~ 'hatch_time_alignment[[:space:]]*=[[:space:]]*p_hatch_time_alignment' or
     hatch_pet_definition !~ 'growth_strong_stats[[:space:]]*=[[:space:]]*p_growth_strong_stats' or
     hatch_pet_definition !~ 'growth_weak_stat[[:space:]]*=[[:space:]]*p_growth_weak_stat' then
    raise exception 'public.hatch_pet is missing one or more required identity or growth updates';
  end if;
end
$$;

commit;
