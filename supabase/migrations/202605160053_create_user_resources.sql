create table if not exists public.user_resources (
  user_id uuid primary key references auth.users(id) on delete cascade,
  trough_capacity integer not null default 0 check (trough_capacity >= 0),
  trough_fill integer not null default 0 check (trough_fill >= 0),
  updated_at timestamptz not null default now()
);

alter table public.user_resources enable row level security;

alter table public.user_resources
  add column if not exists trough_capacity integer not null default 0 check (trough_capacity >= 0);

alter table public.user_resources
  add column if not exists trough_fill integer not null default 0 check (trough_fill >= 0);

create policy "Users can view their own resources"
on public.user_resources
for select
using (auth.uid() = user_id);

create policy "Users can update their own resources"
on public.user_resources
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);