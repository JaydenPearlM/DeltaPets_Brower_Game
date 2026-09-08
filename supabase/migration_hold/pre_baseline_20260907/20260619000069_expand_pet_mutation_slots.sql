-- 20260619000069_expand_pet_mutation_slots.sql
--
-- Expands the mutation system from one stored result per pet to as many as
-- four mutation slots.
--
-- New pets still receive only the original single randomized mutation roll.
-- Future wild-egg creation must insert mutation_capacity = 1.
-- Other pets default to a maximum capacity of 4 for future breeding systems.

alter table public.pets
add column if not exists mutation_capacity smallint not null default 4;

alter table public.pets
drop constraint if exists pets_mutation_capacity_check;

alter table public.pets
add constraint pets_mutation_capacity_check
check (mutation_capacity between 1 and 4);

alter table public.pet_mutations
add column if not exists slot_index smallint not null default 1;

alter table public.pet_mutations
drop constraint if exists pet_mutations_slot_index_check;

alter table public.pet_mutations
add constraint pet_mutations_slot_index_check
check (slot_index between 1 and 4);

alter table public.pet_mutations
drop constraint if exists pet_mutations_pkey;

alter table public.pet_mutations
add constraint pet_mutations_pkey
primary key (pet_id, slot_index);

create unique index if not exists idx_pet_mutations_unique_mutation_per_pet
on public.pet_mutations(pet_id, mutation_id)
where mutation_id is not null;

create or replace function public.enforce_pet_mutation_capacity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_capacity smallint;
begin
  select mutation_capacity
  into v_capacity
  from public.pets
  where id = new.pet_id;

  if v_capacity is null then
    raise exception 'Cannot assign mutation: pet % does not exist.', new.pet_id;
  end if;

  if new.slot_index > v_capacity then
    raise exception
      'Cannot assign mutation slot %: pet % has a mutation capacity of %.',
      new.slot_index,
      new.pet_id,
      v_capacity;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_pet_mutation_capacity
on public.pet_mutations;

create trigger trg_enforce_pet_mutation_capacity
before insert or update of pet_id, slot_index
on public.pet_mutations
for each row
execute function public.enforce_pet_mutation_capacity();

create or replace function public.assign_pet_mutation(p_pet_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing_mutation_id uuid;
  v_existing_assignment boolean;
  v_mutation_roll double precision;
  v_rarity_roll double precision;
  v_rarity text;
  v_mutation_id uuid;
begin
  select true, mutation_id
  into v_existing_assignment, v_existing_mutation_id
  from public.pet_mutations
  where pet_id = p_pet_id
    and slot_index = 1;

  if coalesce(v_existing_assignment, false) then
    return v_existing_mutation_id;
  end if;

  if not exists (
    select 1
    from public.pets
    where id = p_pet_id
  ) then
    raise exception 'Cannot assign mutation: pet % does not exist.', p_pet_id;
  end if;

  v_mutation_roll := random();

  if v_mutation_roll >= 0.30 then
    insert into public.pet_mutations
      (pet_id, slot_index, mutation_id, has_mutation, roll_value)
    values
      (p_pet_id, 1, null, false, v_mutation_roll)
    on conflict (pet_id, slot_index) do nothing;

    return null;
  end if;

  v_rarity_roll := random();

  v_rarity := case
    when v_rarity_roll < 0.50 then 'common'
    when v_rarity_roll < 0.80 then 'uncommon'
    when v_rarity_roll < 0.95 then 'rare'
    else 'legendary'
  end;

  select id
  into v_mutation_id
  from public.mutations
  where rarity = v_rarity
    and is_active = true
  order by random()
  limit 1;

  if v_mutation_id is null then
    raise exception 'Cannot assign mutation: no active % mutations exist.', v_rarity;
  end if;

  insert into public.pet_mutations
    (pet_id, slot_index, mutation_id, has_mutation, roll_value)
  values
    (p_pet_id, 1, v_mutation_id, true, v_mutation_roll)
  on conflict (pet_id, slot_index) do nothing;

  return v_mutation_id;
end;
$$;

revoke all
on function public.enforce_pet_mutation_capacity()
from public, anon, authenticated;

revoke all
on function public.assign_pet_mutation(uuid)
from public, anon, authenticated;
