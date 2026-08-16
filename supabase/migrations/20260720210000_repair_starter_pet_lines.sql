begin;

update public.pets
set
  line = case species
    when 'water_starter' then 'water'::public.elemental_line
    when 'fire_starter' then 'fire'::public.elemental_line
    when 'earth_starter' then 'earth'::public.elemental_line
    when 'air_starter' then 'air'::public.elemental_line
    when 'ice_starter' then 'ice'::public.elemental_line
    when 'storm_starter' then 'storm'::public.elemental_line
    when 'light_starter' then 'light'::public.elemental_line
    when 'shadow_night_bad' then 'shadow'::public.elemental_line
    when 'shadow_day_good' then 'shadow'::public.elemental_line
    else line
  end,
  updated_at = now()
where line::text = 'null_element'
  and species in (
    'water_starter',
    'fire_starter',
    'earth_starter',
    'air_starter',
    'ice_starter',
    'storm_starter',
    'light_starter',
    'shadow_night_bad',
    'shadow_day_good'
  );

commit;
