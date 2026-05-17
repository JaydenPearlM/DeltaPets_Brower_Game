alter table public.daily_care
add column if not exists completed_delta_day integer;

create index if not exists daily_care_user_completed_delta_day_idx
on public.daily_care (user_id, completed_delta_day);