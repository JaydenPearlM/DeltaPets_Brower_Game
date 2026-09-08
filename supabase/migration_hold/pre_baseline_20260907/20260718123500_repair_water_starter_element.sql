begin;

update public.pets
set line = 'water'
where species = 'water_starter'
  and line = 'null_element';

commit;