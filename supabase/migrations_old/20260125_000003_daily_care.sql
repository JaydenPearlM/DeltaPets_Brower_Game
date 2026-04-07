-- 20260125_000003_daily_care.sql
-- Daily Care (once per day) state table

create table if not exists public.daily_care (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_completed_at timestamptz,
  streak int not null default 0,
  alpha_ribbon_awarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_care_streak_nonnegative check (streak >= 0)
);

-- updated_at trigger
drop trigger if exists trg_daily_care_updated_at on public.daily_care;
create trigger trg_daily_care_updated_at
before update on public.daily_care
for each row execute function public.set_updated_at();

-- RLS
alter table public.daily_care enable row level security;

drop policy if exists daily_care_select_own on public.daily_care;
create policy daily_care_select_own
on public.daily_care
for select
using (auth.uid() = user_id);

drop policy if exists daily_care_insert_own on public.daily_care;
create policy daily_care_insert_own
on public.daily_care
for insert
with check (auth.uid() = user_id);

drop policy if exists daily_care_update_own on public.daily_care;
create policy daily_care_update_own
on public.daily_care
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
