alter table public.pets
  add column if not exists comfort int not null default 50 check (comfort between 0 and 100),
  add column if not exists rest int not null default 50 check (rest between 0 and 100),
  add column if not exists last_care_decay_at timestamptz not null default now();

create index if not exists pets_last_care_decay_at_idx
  on public.pets (last_care_decay_at);

create or replace function public.apply_pet_care_decay(p_pet_id uuid)
returns table (
  hunger int,
  cleanliness int,
  happiness int,
  comfort int,
  rest int,
  is_runaway boolean,
  runaway_at timestamptz,
  last_care_decay_at timestamptz
)
language plpgsql
as $$
declare
  v_pet public.pets%rowtype;
  v_minutes_passed int;
  v_ticks int;

  v_new_hunger int;
  v_new_cleanliness int;
  v_new_happiness int;
  v_new_comfort int;
  v_new_rest int;

  -- tuning
  -- 1 tick = 30 minutes
  -- this means a full drain takes a while, not instantly
begin
  select *
  into v_pet
  from public.pets
  where id = p_pet_id
  for update;

  if not found then
    raise exception 'Pet not found: %', p_pet_id;
  end if;

  if coalesce(v_pet.is_runaway, false) then
    return query
    select
      coalesce(v_pet.hunger, 0),
      coalesce(v_pet.cleanliness, 0),
      coalesce(v_pet.happiness, 0),
      coalesce(v_pet.comfort, 0),
      coalesce(v_pet.rest, 0),
      true,
      v_pet.runaway_at,
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
      coalesce(v_pet.cleanliness, 50),
      coalesce(v_pet.happiness, 50),
      coalesce(v_pet.comfort, 50),
      coalesce(v_pet.rest, 50),
      coalesce(v_pet.is_runaway, false),
      v_pet.runaway_at,
      coalesce(v_pet.last_care_decay_at, now());
    return;
  end if;

  -- decay rules
  -- hunger:     -1 every tick       (30 min)
  -- comfort:    -1 every tick       (30 min)
  -- happiness:  -1 every 2 ticks    (60 min)
  -- cleanliness:-1 every 2 ticks    (60 min)
  -- rest:       -1 every 3 ticks    (90 min)

  v_new_hunger      := greatest(0, least(100, coalesce(v_pet.hunger, 50) - v_ticks));
  v_new_comfort     := greatest(0, least(100, coalesce(v_pet.comfort, 50) - v_ticks));
  v_new_happiness   := greatest(0, least(100, coalesce(v_pet.happiness, 50) - floor(v_ticks / 2)));
  v_new_cleanliness := greatest(0, least(100, coalesce(v_pet.cleanliness, 50) - floor(v_ticks / 2)));
  v_new_rest        := greatest(0, least(100, coalesce(v_pet.rest, 50) - floor(v_ticks / 3)));

  update public.pets
  set
    hunger = v_new_hunger,
    cleanliness = v_new_cleanliness,
    happiness = v_new_happiness,
    comfort = v_new_comfort,
    rest = v_new_rest,
    is_runaway = (
      v_new_hunger = 0
      or v_new_cleanliness = 0
      or v_new_happiness = 0
      or v_new_comfort = 0
      or v_new_rest = 0
    ),
    runaway_at = case
      when (
        v_new_hunger = 0
        or v_new_cleanliness = 0
        or v_new_happiness = 0
        or v_new_comfort = 0
        or v_new_rest = 0
      ) and v_pet.runaway_at is null
      then now()
      else v_pet.runaway_at
    end,
    last_care_decay_at = now()
  where id = p_pet_id
  returning
    pets.hunger,
    pets.cleanliness,
    pets.happiness,
    pets.comfort,
    pets.rest,
    pets.is_runaway,
    pets.runaway_at,
    pets.last_care_decay_at
  into
    hunger,
    cleanliness,
    happiness,
    comfort,
    rest,
    is_runaway,
    runaway_at,
    last_care_decay_at;

  return next;
end;
$$;