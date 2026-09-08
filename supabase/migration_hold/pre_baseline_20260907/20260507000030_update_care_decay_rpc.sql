drop function if exists public.apply_pet_care_decay(uuid);

create or replace function public.apply_pet_care_decay(p_pet_id uuid)
returns table (
  hunger int,
  clean int,
  happy int,
  comfort int,
  rest int,
  energy int,
  ran_away boolean,
  last_care_decay_at timestamptz
)
language plpgsql
as $$
declare
  v_pet record;
  v_minutes_passed int;
  v_ticks int;

  v_new_hunger int;
  v_new_clean int;
  v_new_happy int;
  v_new_comfort int;
  v_new_rest int;
  v_new_energy int;
begin
  select
    pets.id,
    pets.hunger,
    pets.clean,
    pets.happy,
    pets.comfort,
    pets.rest,
    pets.energy,
    pets.ran_away,
    pets.last_care_decay_at
  into v_pet
  from public.pets
  where pets.id = p_pet_id
  for update;

  if not found then
    raise exception 'Pet not found: %', p_pet_id;
  end if;

  if coalesce(v_pet.ran_away, false) then
    return query
    select
      coalesce(v_pet.hunger, 0),
      coalesce(v_pet.clean, 0),
      coalesce(v_pet.happy, 0),
      coalesce(v_pet.comfort, 0),
      coalesce(v_pet.rest, 0),
      coalesce(v_pet.energy, 0),
      true,
      coalesce(v_pet.last_care_decay_at, now());
    return;
  end if;

  v_minutes_passed :=
    floor(extract(epoch from (now() - coalesce(v_pet.last_care_decay_at, now()))) / 60);

  v_ticks := floor(v_minutes_passed / 30);

  if v_ticks <= 0 then
    return query
    select
      coalesce(v_pet.hunger, 50),
      coalesce(v_pet.clean, 50),
      coalesce(v_pet.happy, 50),
      coalesce(v_pet.comfort, 50),
      coalesce(v_pet.rest, 50),
      coalesce(v_pet.energy, 50),
      coalesce(v_pet.ran_away, false),
      coalesce(v_pet.last_care_decay_at, now());
    return;
  end if;

  v_new_hunger  := greatest(0, least(50, coalesce(v_pet.hunger, 50) - v_ticks));
  v_new_clean   := greatest(0, least(50, coalesce(v_pet.clean, 50) - floor(v_ticks / 2)));
  v_new_happy   := greatest(0, least(50, coalesce(v_pet.happy, 50) - floor(v_ticks / 2)));
  v_new_comfort := greatest(0, least(50, coalesce(v_pet.comfort, 50) - v_ticks));
  v_new_rest    := greatest(0, least(50, coalesce(v_pet.rest, 50) - floor(v_ticks / 3)));
  v_new_energy  := greatest(0, least(50, coalesce(v_pet.energy, 50) - floor(v_ticks / 3)));

  update public.pets
  set
    hunger = v_new_hunger,
    clean = v_new_clean,
    happy = v_new_happy,
    comfort = v_new_comfort,
    rest = v_new_rest,
    energy = v_new_energy,
    ran_away = (
      v_new_hunger = 0
      or v_new_clean = 0
      or v_new_happy = 0
      or v_new_comfort = 0
      or v_new_rest = 0
    ),
    runaway_at = case
      when (
        v_new_hunger = 0
        or v_new_clean = 0
        or v_new_happy = 0
        or v_new_comfort = 0
        or v_new_rest = 0
      ) and public.pets.runaway_at is null
      then now()
      else public.pets.runaway_at
    end,
    last_care_decay_at = now()
  where public.pets.id = p_pet_id
  returning
    public.pets.hunger,
    public.pets.clean,
    public.pets.happy,
    public.pets.comfort,
    public.pets.rest,
    public.pets.energy,
    public.pets.ran_away,
    public.pets.last_care_decay_at
  into
    hunger,
    clean,
    happy,
    comfort,
    rest,
    energy,
    ran_away,
    last_care_decay_at;

  return next;
end;
$$;