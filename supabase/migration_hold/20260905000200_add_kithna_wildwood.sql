begin;

create table public.player_quests (
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_key text not null,
  status text not null default 'available'
    check (status in ('available', 'active', 'ready_to_turn_in', 'completed')),
  progress integer not null default 0 check (progress >= 0),
  target integer not null check (target > 0),
  accepted_at timestamptz,
  completed_at timestamptz,
  reward_claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, quest_key),
  constraint player_quests_somethings_afoot_progress_check check (
    quest_key <> 'somethings_afoot'
    or (target = 5 and progress between 0 and 5)
  )
);

create table public.wildwood_expeditions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'left', 'completed')),
  intro_step integer not null default 0 check (intro_step >= 0),
  depth integer not null default 0 check (depth >= 0),
  rooms_since_corrupted integer not null default 0
    check (rooms_since_corrupted >= 0),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index wildwood_one_active_expedition_per_user
  on public.wildwood_expeditions (user_id)
  where status = 'active';

create table public.wildwood_rooms (
  id uuid primary key default gen_random_uuid(),
  expedition_id uuid not null
    references public.wildwood_expeditions(id) on delete cascade,
  sequence_number integer not null check (sequence_number >= 0),
  event_kind text not null
    check (event_kind in ('flavor', 'quest_clue', 'corrupted_battle')),
  event_payload jsonb not null default '{}'::jsonb,
  status text not null default 'unresolved'
    check (status in ('unresolved', 'resolved', 'left')),
  battle_id uuid,
  generated_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (expedition_id, sequence_number),
  unique (battle_id)
);

alter table public.player_quests enable row level security;
alter table public.wildwood_expeditions enable row level security;
alter table public.wildwood_rooms enable row level security;

create policy "Players can read their own quests"
  on public.player_quests
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Players can read their own expeditions"
  on public.wildwood_expeditions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Players can read their own Wildwood rooms"
  on public.wildwood_rooms
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.wildwood_expeditions expedition
      where expedition.id = wildwood_rooms.expedition_id
        and expedition.user_id = (select auth.uid())
    )
  );

revoke insert, update, delete
  on public.player_quests,
     public.wildwood_expeditions,
     public.wildwood_rooms
  from anon, authenticated;

grant select
  on public.player_quests,
     public.wildwood_expeditions,
     public.wildwood_rooms
  to authenticated;

commit;