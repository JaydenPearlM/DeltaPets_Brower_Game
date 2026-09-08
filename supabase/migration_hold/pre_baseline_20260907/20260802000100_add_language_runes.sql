-- 20260802000100_add_language_runes.sql
--
-- Adds the 26-rune Delta language progression.
--
-- Rune tiers:
--   1-5   Hatchling
--   6-10  Lowform
--   11-15 Highform
--   16-21 Legion
--   22-26 Mythical Legendary
--
-- Only the first five Kithna runes are active initially.
-- Rune discovery writes remain server-controlled.

create table if not exists public.rune_defs (
  id uuid primary key default gen_random_uuid(),

  key text not null unique,
  name text not null,
  description text not null,

  rune_number smallint not null unique check (
    rune_number >= 1
    and rune_number <= 26
  ),

  stage_tier text not null check (
    stage_tier in (
      'hatchling',
      'lowform',
      'highform',
      'legion',
      'mythical_legendary'
    )
  ),

  vocabulary_group text not null,
  is_active boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_runes (
  user_id uuid not null references auth.users(id) on delete cascade,
  rune_id uuid not null references public.rune_defs(id) on delete cascade,

  discovered_at timestamptz not null default now(),
  discovery_context jsonb not null default '{}'::jsonb,

  primary key (user_id, rune_id)
);

create index if not exists idx_rune_defs_stage_tier
on public.rune_defs(stage_tier);

create index if not exists idx_rune_defs_active_number
on public.rune_defs(is_active, rune_number);

create index if not exists idx_user_runes_user_id
on public.user_runes(user_id);

create index if not exists idx_user_runes_rune_id
on public.user_runes(rune_id);

alter table public.rune_defs enable row level security;
alter table public.user_runes enable row level security;

create policy "rune_defs_read_active"
on public.rune_defs
for select
to authenticated
using (is_active = true);

create policy "users_read_own_runes"
on public.user_runes
for select
to authenticated
using (auth.uid() = user_id);

insert into public.rune_defs (
  key,
  name,
  description,
  rune_number,
  stage_tier,
  vocabulary_group,
  is_active
)
values
  (
    'rune_of_feeling',
    'Rune of Feeling',
    'Reveals emotions and physical states in Hatchling speech.',
    1,
    'hatchling',
    'feeling',
    true
  ),
  (
    'rune_of_need',
    'Rune of Need',
    'Reveals basic needs such as food, sleep, play, cleanliness, and help.',
    2,
    'hatchling',
    'need',
    true
  ),
  (
    'rune_of_recognition',
    'Rune of Recognition',
    'Reveals words connected to identity, names, friendship, home, and return.',
    3,
    'hatchling',
    'recognition',
    true
  ),
  (
    'rune_of_motion',
    'Rune of Motion',
    'Reveals simple actions and commands such as come, go, stay, give, and stop.',
    4,
    'hatchling',
    'motion',
    true
  ),
  (
    'rune_of_first_speech',
    'Rune of First Speech',
    'Completes the player''s understanding of ordinary Hatchling speech.',
    5,
    'hatchling',
    'hatchling_fluency',
    true
  ),

  (
    'rune_of_preference',
    'Rune of Preference',
    'Reveals how a Lowform expresses likes, dislikes, favorites, and avoidance.',
    6,
    'lowform',
    'preference',
    false
  ),
  (
    'rune_of_memory',
    'Rune of Memory',
    'Reveals words connected to previous events, remembrance, and passing time.',
    7,
    'lowform',
    'memory',
    false
  ),
  (
    'rune_of_questioning',
    'Rune of Questioning',
    'Reveals questions involving why, where, when, and how.',
    8,
    'lowform',
    'questioning',
    false
  ),
  (
    'rune_of_intention',
    'Rune of Intention',
    'Reveals plans, choices, requests, and deliberate actions.',
    9,
    'lowform',
    'intention',
    false
  ),
  (
    'rune_of_growing_speech',
    'Rune of Growing Speech',
    'Completes the player''s understanding of ordinary Lowform speech.',
    10,
    'lowform',
    'lowform_fluency',
    false
  ),

  (
    'rune_of_trust',
    'Rune of Trust',
    'Reveals language concerning trust, doubt, loyalty, and betrayal.',
    11,
    'highform',
    'trust',
    false
  ),
  (
    'rune_of_reflection',
    'Rune of Reflection',
    'Reveals thoughts about identity, growth, and previous forms.',
    12,
    'highform',
    'reflection',
    false
  ),
  (
    'rune_of_contradiction',
    'Rune of Contradiction',
    'Reveals mixed emotions and thoughts that appear to conflict.',
    13,
    'highform',
    'contradiction',
    false
  ),
  (
    'rune_of_instinct',
    'Rune of Instinct',
    'Reveals how passive traits, mutations, and natural impulses are experienced.',
    14,
    'highform',
    'instinct',
    false
  ),
  (
    'rune_of_knowing_speech',
    'Rune of Knowing Speech',
    'Completes the player''s understanding of ordinary Highform speech.',
    15,
    'highform',
    'highform_fluency',
    false
  ),

  (
    'rune_of_resonance',
    'Rune of Resonance',
    'Reveals elemental sensations and the way a Legion experiences its element.',
    16,
    'legion',
    'resonance',
    false
  ),
  (
    'rune_of_echoes',
    'Rune of Echoes',
    'Reveals ancestral impressions and memories that do not belong to one lifetime.',
    17,
    'legion',
    'echoes',
    false
  ),
  (
    'rune_of_corruption',
    'Rune of Corruption',
    'Reveals language used to describe corruption and unstable energy.',
    18,
    'legion',
    'corruption',
    false
  ),
  (
    'rune_of_many_thoughts',
    'Rune of Many Thoughts',
    'Reveals layered emotions and several connected thoughts expressed together.',
    19,
    'legion',
    'many_thoughts',
    false
  ),
  (
    'rune_of_aliune',
    'Rune of Aliune',
    'Reveals ancient concepts tied to Aliune, its people, and its history.',
    20,
    'legion',
    'aliune',
    false
  ),
  (
    'rune_of_legion_speech',
    'Rune of Legion Speech',
    'Completes the player''s understanding of ordinary Legion speech.',
    21,
    'legion',
    'legion_fluency',
    false
  ),

  (
    'rune_of_distance',
    'Rune of Distance',
    'Reveals awareness of places and presences beyond the pet''s immediate world.',
    22,
    'mythical_legendary',
    'distance',
    false
  ),
  (
    'rune_of_continuance',
    'Rune of Continuance',
    'Reveals memories and identity carried through every evolved form.',
    23,
    'mythical_legendary',
    'continuance',
    false
  ),
  (
    'rune_of_true_names',
    'Rune of True Names',
    'Reveals language connected to deep identity, origin, and true names.',
    24,
    'mythical_legendary',
    'true_names',
    false
  ),
  (
    'rune_of_the_other_side',
    'Rune of the Other Side',
    'Reveals a Mythical Legendary pet''s awareness of the player beyond Aliune.',
    25,
    'mythical_legendary',
    'other_side',
    false
  ),
  (
    'rune_of_understanding',
    'Rune of Understanding',
    'Completes the player''s understanding of Delta language across every form.',
    26,
    'mythical_legendary',
    'complete_fluency',
    false
  )
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description,
  rune_number = excluded.rune_number,
  stage_tier = excluded.stage_tier,
  vocabulary_group = excluded.vocabulary_group,
  is_active = excluded.is_active,
  updated_at = now();