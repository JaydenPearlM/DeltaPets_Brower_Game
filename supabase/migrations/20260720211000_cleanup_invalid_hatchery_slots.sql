begin;

update public.hatchery_slots as slot
set pet_id = null
where slot.pet_id is not null
  and not exists (
    select 1
    from public.pets as pet
    where pet.id = slot.pet_id
      and pet.user_id = slot.user_id
      and pet.stage::text = 'egg'
      and pet.location = 'hatchery'
  );

commit;
