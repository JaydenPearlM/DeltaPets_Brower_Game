begin;

-- =========================================================
-- PVE INSTABILITY SYSTEM TABLES
-- =========================================================

-- Instability events (dynamic world events)
create table if not exists public.pve_instabilities (
  id uuid primary key default gen_random_uuid(),
  region text not null default 'Kithna',
  condition text not null check (condition in ('minor', 'major', 'critical')),
  corruption_level text not null check (corruption_level in ('low', 'rising', 'high')),
  description text not null,
  total_fights integer not null default 3 check (total_fights between 1 and 5),
  has_boss boolean not null default false,
  reward_xp integer not null default 100 check (reward_xp >= 0),
  reward_materials jsonb not null default '[]'::jsonb,
  reward_buffs jsonb not null default '[]'::jsonb,
  spawned_at timestamptz not null default now(),
  expires_at timestamptz not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- User progress on instabilities
create table if not exists public.pve_instability_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  instability_id uuid not null references public.pve_instabilities(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  current_fight integer not null default 1,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Individual fights within instability runs
create table if not exists public.pve_instability_fights (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.pve_instability_runs(id) on delete cascade,
  fight_number integer not null check (fight_number > 0),
  enemy_name text not null,
  enemy_level integer not null,
  enemy_element text not null,
  enemy_line text not null,
  result text check (result in ('victory', 'defeat', 'abandoned')),
  rewards jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, fight_number)
);

-- Temporary buffs from clearing instabilities
create table if not exists public.pve_active_buffs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  buff_type text not null check (buff_type in ('bonus_xp', 'reduced_decay', 'hatch_speed', 'drop_rate')),
  strength numeric not null default 1.0 check (strength >= 0),
  description text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Instability research tracking
create table if not exists public.pve_research_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_instabilities_cleared integer not null default 0,
  total_fights_won integer not null default 0,
  total_bosses_defeated integer not null default 0,
  rarest_drop_tier integer not null default 0,
  first_clear_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- INDEXES (fixed: removed now() from WHERE clause)
-- =========================================================

create index idx_pve_instabilities_active
  on public.pve_instabilities (enabled, region, expires_at desc)
  where enabled = true;

create index idx_pve_instability_runs_user_status
  on public.pve_instability_runs (user_id, status, created_at desc);

create index idx_pve_active_buffs_user_active
  on public.pve_active_buffs (user_id, expires_at desc);

-- =========================================================
-- RLS POLICIES
-- =========================================================

alter table public.pve_instabilities enable row level security;
alter table public.pve_instability_runs enable row level security;
alter table public.pve_instability_fights enable row level security;
alter table public.pve_active_buffs enable row level security;
alter table public.pve_research_stats enable row level security;

-- Anyone can view active instabilities
create policy "Anyone can view active instabilities"
  on public.pve_instabilities for select
  using (enabled = true and expires_at > now());

-- Users can view their own runs
create policy "Users can view own runs"
  on public.pve_instability_runs for select
  using (auth.uid() = user_id);

-- Users can view their own fights
create policy "Users can view own fights"
  on public.pve_instability_fights for select
  using (
    exists (
      select 1 from public.pve_instability_runs
      where id = pve_instability_fights.run_id
        and user_id = auth.uid()
    )
  );

-- Users can view their own active buffs
create policy "Users can view own buffs"
  on public.pve_active_buffs for select
  using (auth.uid() = user_id);

-- Users can view their own research stats
create policy "Users can view own research"
  on public.pve_research_stats for select
  using (auth.uid() = user_id);

-- =========================================================
-- UPDATED_AT TRIGGERS
-- =========================================================

create trigger set_pve_instabilities_updated_at
before update on public.pve_instabilities
for each row execute function public.set_updated_at();

create trigger set_pve_instability_runs_updated_at
before update on public.pve_instability_runs
for each row execute function public.set_updated_at();

create trigger set_pve_instability_fights_updated_at
before update on public.pve_instability_fights
for each row execute function public.set_updated_at();

create trigger set_pve_active_buffs_updated_at
before update on public.pve_active_buffs
for each row execute function public.set_updated_at();

create trigger set_pve_research_stats_updated_at
before update on public.pve_research_stats
for each row execute function public.set_updated_at();

-- =========================================================
-- HELPER FUNCTIONS
-- =========================================================

-- Get active instabilities for a region
create or replace function public.get_active_instabilities(p_region text default 'Kithna')
returns setof public.pve_instabilities
language sql
security definer
set search_path = public
as $$
  select *
  from public.pve_instabilities
  where enabled = true
    and expires_at > now()
    and region = p_region
  order by spawned_at desc
  limit 10;
$$;

grant execute on function public.get_active_instabilities(text) to authenticated, anon;

-- Get user's active buffs
create or replace function public.get_active_buffs(p_user_id uuid default null)
returns setof public.pve_active_buffs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := coalesce(p_user_id, auth.uid());
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select *
  from public.pve_active_buffs
  where user_id = v_user_id
    and expires_at > now()
  order by expires_at desc;
end;
$$;

grant execute on function public.get_active_buffs(uuid) to authenticated;

-- Increment PvE research stats (for tracking player progress)
create or replace function public.increment_pve_research_stats(
  p_user_id uuid,
  p_instabilities_cleared integer default 0,
  p_fights_won integer default 0,
  p_bosses_defeated integer default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.pve_research_stats (
    user_id,
    total_instabilities_cleared,
    total_fights_won,
    total_bosses_defeated,
    first_clear_at
  )
  values (
    p_user_id,
    p_instabilities_cleared,
    p_fights_won,
    p_bosses_defeated,
    case when p_instabilities_cleared > 0 then now() else null end
  )
  on conflict (user_id) do update set
    total_instabilities_cleared = pve_research_stats.total_instabilities_cleared + p_instabilities_cleared,
    total_fights_won = pve_research_stats.total_fights_won + p_fights_won,
    total_bosses_defeated = pve_research_stats.total_bosses_defeated + p_bosses_defeated,
    first_clear_at = coalesce(pve_research_stats.first_clear_at, case when p_instabilities_cleared > 0 then now() else null end),
    updated_at = now();
end;
$$;

grant execute on function public.increment_pve_research_stats(uuid, integer, integer, integer) to authenticated;

commit;