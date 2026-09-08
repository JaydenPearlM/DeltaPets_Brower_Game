alter table public.profiles
  add column if not exists active_title text;

update public.profiles p
set
  active_title = 'Alpha Pro',
  alpha_ribbon_awarded = true
where exists (
  select 1
  from public.trainer_awards ta
  join public.awards a on a.id = ta.award_id
  where ta.user_id = p.user_id
    and a.key = 'alpha_tester'
)
or exists (
  select 1
  from public.pets pet
  join public.pet_awards pa on pa.pet_id = pet.id
  join public.awards a on a.id = pa.award_id
  where pet.user_id = p.user_id
    and a.key = 'alpha_tester'
);