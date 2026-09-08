begin;

create unique index if not exists hatchery_slots_user_slot_unique
  on public.hatchery_slots (user_id, slot_index);

create unique index if not exists hatchery_shelf_slots_user_slot_unique
  on public.hatchery_shelf_slots (user_id, slot_index);

create unique index if not exists party_slots_user_slot_unique
  on public.party_slots (user_id, slot_index);

create unique index if not exists party_slots_user_pet_unique
  on public.party_slots (user_id, pet_id);

commit;