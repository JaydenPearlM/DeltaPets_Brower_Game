begin;

create unique index if not exists pets_one_active_pet_per_user
  on public.pets (user_id)
  where is_active = true;

create unique index if not exists battle_runs_one_active_run_per_user
  on public.battle_runs (user_id)
  where status = 'active';

commit;