-- supabase/migrations/20260701000101_trainer_awards.sql

create table if not exists public.trainer_awards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  award_id uuid not null references public.awards(id) on delete cascade,
  earned_at timestamptz not null default now(),
  context jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, award_id)
);

alter table public.trainer_awards enable row level security;

create policy "trainer_awards_select_own"
  on public.trainer_awards
  for select
  using (auth.uid() = user_id);

-- No insert/update/delete policy for authenticated users.
-- Only the service role (used by your backend) can write here,
-- matching the pattern already used on wallets and battle_run_fights.