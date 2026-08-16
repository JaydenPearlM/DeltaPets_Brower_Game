-- Keep runaway pets out of Main Team and Storage UI state.
-- The Lost Kith Registry continues to use pets.ran_away and runaway_at.

update public.pets
set
  is_active = false,
  location = 'storage'
where ran_away = true
  and (
    is_active = true
    or location <> 'storage'
  );

delete from public.party_slots as slot
using public.pets as pet
where slot.pet_id = pet.id
  and pet.ran_away = true;

-- Rescue hatches can be stranded if a runaway pet held the only party slot.
-- Repair only accounts that now have exactly one healthy non-egg pet and no
-- party rows, which is the rescue-egg case without choosing between pets.
with only_healthy_pet as (
  select
    pet.user_id,
    (array_agg(pet.id order by pet.hatched_at desc nulls last, pet.created_at desc))[1]
      as pet_id
  from public.pets as pet
  where pet.ran_away = false
    and pet.stage <> 'egg'
  group by pet.user_id
  having count(*) = 1
    and not exists (
      select 1
      from public.party_slots as existing_slot
      where existing_slot.user_id = pet.user_id
    )
),
inserted as (
  insert into public.party_slots (
    user_id,
    slot_index,
    pet_id
  )
  select
    only_healthy_pet.user_id,
    1,
    only_healthy_pet.pet_id
  from only_healthy_pet
  on conflict do nothing
  returning user_id, pet_id
)
update public.pets as pet
set
  location = 'active',
  is_active = true
from inserted
where pet.id = inserted.pet_id
  and pet.user_id = inserted.user_id;
