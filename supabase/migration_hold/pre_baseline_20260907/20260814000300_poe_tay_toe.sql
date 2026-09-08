create table if not exists public.poe_tay_toe_state (
  id smallint primary key default 1 check (id = 1),
  current_location_key text not null,
  hidden_by_user_id uuid references auth.users(id) on delete set null,
  hidden_at timestamptz not null default now(),
  claimed_by_user_id uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  find_count int not null default 0 check (find_count >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.poe_tay_toe_finds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  location_key text not null,
  dots_awarded int not null check (dots_awarded >= 0),
  item_slug text not null,
  item_qty int not null check (item_qty > 0),
  found_at timestamptz not null default now()
);

create index if not exists poe_tay_toe_finds_user_found_at_idx
  on public.poe_tay_toe_finds(user_id, found_at desc);

insert into public.poe_tay_toe_state (id, current_location_key)
values (1, 'hatchery-back')
on conflict (id) do nothing;