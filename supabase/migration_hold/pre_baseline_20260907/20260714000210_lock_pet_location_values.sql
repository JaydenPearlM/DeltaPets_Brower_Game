-- 20260714000210_lock_pet_location_values.sql
begin;

update public.pets
set location = case
  when stage = 'egg' then 'storage'
  else 'active'
end
where location is null or btrim(location) = '';

alter table public.pets
  alter column location set default 'storage',
  alter column location set not null;

alter table public.pets
  add constraint pets_location_valid_check
  check (location in ('hatchery', 'active', 'storage', 'inventory'));

commit;