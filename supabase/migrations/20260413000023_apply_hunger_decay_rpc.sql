create or replace function apply_hunger_decay(p_pet_id uuid)
returns int
language plpgsql
as $$
declare
  v_hunger int;
  v_last_decay timestamptz;
  v_minutes_passed int;
  v_decay_amount int;
  v_new_hunger int;
begin
  select hunger, last_hunger_decay_at
  into v_hunger, v_last_decay
  from pets
  where id = p_pet_id;

  if not found then
    raise exception 'Pet not found: %', p_pet_id;
  end if;

  v_last_decay := coalesce(v_last_decay, now());
  v_minutes_passed := floor(extract(epoch from (now() - v_last_decay)) / 60);
  v_decay_amount := floor(v_minutes_passed / 30);
  v_hunger := greatest(0, least(100, coalesce(v_hunger, 100)));

  if v_decay_amount <= 0 then
    update pets
    set last_hunger_decay_at = coalesce(last_hunger_decay_at, now())
    where id = p_pet_id and last_hunger_decay_at is null;
    return v_hunger;
  end if;

  v_new_hunger := greatest(0, v_hunger - v_decay_amount);

  update pets
  set hunger = v_new_hunger,
      last_hunger_decay_at = now()
  where id = p_pet_id;

  return v_new_hunger;
end;
$$;