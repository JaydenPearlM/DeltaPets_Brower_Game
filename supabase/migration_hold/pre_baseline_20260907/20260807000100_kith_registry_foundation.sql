-- DeltaPets Kith Registry foundation
-- Creates current discovery tracking and preserves retired Closed Alpha ownership.
-- SAFE ORDER: run this BEFORE any all-player progression reset.

begin;

create table if not exists public.user_kith_discoveries (
  user_id uuid not null references auth.users(id) on delete cascade,
  species_key text not null,
  display_name text not null,
  first_hatched_at timestamp with time zone not null default now(),
  primary key (user_id, species_key)
);

create table if not exists public.retired_kith_species (
  species_key text primary key,
  display_name text not null,
  element_key text not null,
  retirement_group text not null default 'Closed Alpha',
  retirement_note text not null default 'Retired to the void of unused Alpha content.',
  created_at timestamp with time zone not null default now()
);

create table if not exists public.user_retired_kith (
  user_id uuid not null references auth.users(id) on delete cascade,
  species_key text not null references public.retired_kith_species(species_key) on delete restrict,
  first_owned_at timestamp with time zone not null,
  archived_at timestamp with time zone not null default now(),
  primary key (user_id, species_key)
);

insert into public.retired_kith_species (
  species_key,
  display_name,
  element_key
)
values
  ('kithna_day_pet_01', 'Ripplin', 'water'),
  ('kithna_day_pet_02', 'Peblin', 'earth'),
  ('kithna_day_pet_03', 'Glimmet', 'light'),
  ('kithna_night_pet_01', 'Frilo', 'ice'),
  ('kithna_night_pet_03', 'Murklin', 'shadow')
on conflict (species_key) do update
set
  display_name = excluded.display_name,
  element_key = excluded.element_key;

-- Snapshot retired ownership BEFORE a future progression reset removes pets.
insert into public.user_retired_kith (
  user_id,
  species_key,
  first_owned_at
)
select
  p.user_id,
  retired.species_key,
  min(p.created_at) as first_owned_at
from public.pets as p
join (
  values
    ('kithna_day_pet_01'::text, 'Ripplin'::text),
    ('kithna_day_pet_02'::text, 'Peblin'::text),
    ('kithna_day_pet_03'::text, 'Glimmet'::text),
    ('kithna_night_pet_01'::text, 'Frilo'::text),
    ('kithna_night_pet_03'::text, 'Murklin'::text)
) as retired(species_key, hatchling_name)
  on p.species = retired.species_key
  or lower(coalesce(p.name, '')) = lower(retired.hatchling_name)
group by
  p.user_id,
  retired.species_key
on conflict (user_id, species_key) do update
set first_owned_at = least(
  public.user_retired_kith.first_owned_at,
  excluded.first_owned_at
);

create or replace function public.record_kith_discovery_from_pet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.stage::text = 'hatchling'
     and new.species is not null
     and (
       tg_op = 'INSERT'
       or old.stage::text is distinct from 'hatchling'
     )
  then
    insert into public.user_kith_discoveries (
      user_id,
      species_key,
      display_name,
      first_hatched_at
    )
    values (
      new.user_id,
      new.species,
      coalesce(nullif(new.name, ''), new.species),
      coalesce(new.hatched_at, now())
    )
    on conflict (user_id, species_key) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists record_kith_discovery_after_hatch on public.pets;

create trigger record_kith_discovery_after_hatch
after insert or update of stage on public.pets
for each row
execute function public.record_kith_discovery_from_pet();

alter table public.user_kith_discoveries enable row level security;
alter table public.retired_kith_species enable row level security;
alter table public.user_retired_kith enable row level security;

drop policy if exists "Users can read their own Kith discoveries"
  on public.user_kith_discoveries;

create policy "Users can read their own Kith discoveries"
  on public.user_kith_discoveries
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Authenticated users can read retired Kith species"
  on public.retired_kith_species;

create policy "Authenticated users can read retired Kith species"
  on public.retired_kith_species
  for select
  to authenticated
  using (true);

drop policy if exists "Users can read their own retired Kith ownership"
  on public.user_retired_kith;

create policy "Users can read their own retired Kith ownership"
  on public.user_retired_kith
  for select
  to authenticated
  using (auth.uid() = user_id);

grant select on public.user_kith_discoveries to authenticated;
grant select on public.retired_kith_species to authenticated;
grant select on public.user_retired_kith to authenticated;

revoke insert, update, delete on public.user_kith_discoveries from authenticated;
revoke insert, update, delete on public.retired_kith_species from authenticated;
revoke insert, update, delete on public.user_retired_kith from authenticated;

commit;
