-- 20260604000066_add_passive_traits.sql

create table if not exists public.passive_traits (
  id uuid primary key default gen_random_uuid(),

  key text not null unique,
  name text not null,

  stat_key text not null check (
    stat_key in ('hp', 'atk', 'def', 'spd', 'magi', 'mana')
  ),

  rarity text not null check (
    rarity in ('common', 'uncommon', 'rare', 'legendary')
  ),

  description text not null,
  effect_summary text not null,
  effects jsonb not null default '{}'::jsonb,

  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.pet_passive_traits (
  pet_id uuid not null references public.pets(id) on delete cascade,
  passive_trait_id uuid not null references public.passive_traits(id),
  stat_key text not null check (
    stat_key in ('hp', 'atk', 'def', 'spd', 'magi', 'mana')
  ),
  assigned_at timestamptz not null default now(),

  primary key (pet_id, passive_trait_id),
  unique (pet_id, stat_key)
);

create index if not exists idx_passive_traits_stat_key
on public.passive_traits(stat_key);

create index if not exists idx_passive_traits_rarity
on public.passive_traits(rarity);

insert into public.passive_traits
  (key, name, stat_key, rarity, description, effect_summary, effects)
values
  ('iron_lungs', 'Iron Lungs', 'hp', 'common', 'This Kith was born with a sturdy life force.', '+1 HP', '{"hp":1}'),
  ('thick_hide', 'Thick Hide', 'hp', 'uncommon', 'This Kith can take a hit better than most.', '+2 HP', '{"hp":2}'),
  ('ancient_vitality', 'Ancient Vitality', 'hp', 'rare', 'Old life energy pulses through this Kith.', '+3 HP', '{"hp":3}'),

  ('sharp_instinct', 'Sharp Instinct', 'atk', 'common', 'This Kith strikes with natural confidence.', '+1 Attack', '{"atk":1}'),
  ('battleborn', 'Battleborn', 'atk', 'uncommon', 'This Kith seems eager for combat.', '+2 Attack', '{"atk":2}'),
  ('titan_fang', 'Titan Fang', 'atk', 'rare', 'A powerful offensive instinct sleeps within this Kith.', '+3 Attack', '{"atk":3}'),

  ('steady_shell', 'Steady Shell', 'def', 'common', 'This Kith has naturally firm defenses.', '+1 Defense', '{"def":1}'),
  ('stoneblood', 'Stoneblood', 'def', 'uncommon', 'The strength of stone flows through this Kith.', '+2 Defense', '{"def":2}'),
  ('crystal_hide', 'Crystal Hide', 'def', 'rare', 'This Kith was born with reinforced crystalline skin.', '+3 Defense', '{"def":3}'),

  ('quickstep', 'Quickstep', 'spd', 'common', 'This Kith moves with surprising agility.', '+1 Speed', '{"spd":1}'),
  ('wind_runner', 'Wind Runner', 'spd', 'uncommon', 'This Kith reacts faster than most.', '+2 Speed', '{"spd":2}'),
  ('storm_soul', 'Storm Soul', 'spd', 'rare', 'Lightning energy crackles beneath the surface.', '+3 Speed', '{"spd":3}'),

  ('mana_spark', 'Mana Spark', 'mana', 'common', 'A faint magical current flows through this Kith.', '+1 Mana', '{"mana":1}'),
  ('deep_reservoir', 'Deep Reservoir', 'mana', 'uncommon', 'This Kith holds extra magical reserves.', '+2 Mana', '{"mana":2}'),
  ('eternal_well', 'Eternal Well', 'mana', 'rare', 'A deep source of mana rests within this Kith.', '+3 Mana', '{"mana":3}'),

  ('arcane_pulse', 'Arcane Pulse', 'magi', 'common', 'This Kith has a small but steady magical pulse.', '+1 Magi', '{"magi":1}'),
  ('spellheart', 'Spellheart', 'magi', 'uncommon', 'Magic gathers naturally around this Kith.', '+2 Magi', '{"magi":2}'),
  ('arcane_heart', 'Arcane Heart', 'magi', 'rare', 'A powerful magical core rests within this Kith.', '+3 Magi', '{"magi":3}'),

  ('ancient_bloodline', 'Ancient Bloodline', 'hp', 'legendary', 'A forgotten lineage awakens within this Kith.', '+1 to strongest stat calculation later', '{"legendary":true}'),

  ('wild_heart', 'Wild Heart', 'hp', 'common', 'This Kith has a lively survival instinct.', '+1 HP', '{"hp":1}'),
  ('warm_blood', 'Warm Blood', 'hp', 'uncommon', 'This Kith recovers from strain with steady endurance.', '+2 HP', '{"hp":2}'),
  ('giant_core', 'Giant Core', 'hp', 'legendary', 'This Kith carries the impossible vitality of ancient giants.', '+4 HP', '{"hp":4}'),

  ('snap_strike', 'Snap Strike', 'atk', 'common', 'This Kith reacts with sharp attacking instinct.', '+1 Attack', '{"atk":1}'),
  ('feral_edge', 'Feral Edge', 'atk', 'uncommon', 'This Kith has a fierce natural bite.', '+2 Attack', '{"atk":2}'),
  ('solar_claw', 'Solar Claw', 'atk', 'legendary', 'This Kith attacks with radiant force burning beneath its claws.', '+4 Attack', '{"atk":4}'),

  ('guarded_stance', 'Guarded Stance', 'def', 'common', 'This Kith naturally braces before danger.', '+1 Defense', '{"def":1}'),
  ('iron_bark', 'Iron Bark', 'def', 'uncommon', 'This Kith has a hardened outer resilience.', '+2 Defense', '{"def":2}'),
  ('diamond_bone', 'Diamond Bone', 'def', 'legendary', 'This Kith was born with nearly unbreakable inner structure.', '+4 Defense', '{"def":4}'),

  ('light_feet', 'Light Feet', 'spd', 'common', 'This Kith steps lightly and moves with ease.', '+1 Speed', '{"spd":1}'),
  ('blur_dash', 'Blur Dash', 'spd', 'uncommon', 'This Kith can burst forward with sudden speed.', '+2 Speed', '{"spd":2}'),
  ('thunder_step', 'Thunder Step', 'spd', 'legendary', 'This Kith moves like a crack of thunder across the ground.', '+4 Speed', '{"spd":4}'),

  ('mana_thread', 'Mana Thread', 'mana', 'common', 'A small thread of mana runs through this Kith.', '+1 Mana', '{"mana":1}'),
  ('moon_reservoir', 'Moon Reservoir', 'mana', 'uncommon', 'This Kith stores mana like moonlight caught in water.', '+2 Mana', '{"mana":2}'),

  ('infinite_font', 'Infinite Font', 'mana', 'legendary', 'This Kith carries a mana source that feels impossibly deep.', '+4 Mana', '{"mana":4}'),

  ('spark_mind', 'Spark Mind', 'magi', 'common', 'This Kith understands magic with unusual instinct.', '+1 Magi', '{"magi":1}'),
  ('rune_touched', 'Rune Touched', 'magi', 'uncommon', 'A faint ancient mark strengthens this Kith’s magic.', '+2 Magi', '{"magi":2}'),
  ('starborn_mind', 'Starborn Mind', 'magi', 'legendary', 'This Kith’s magic feels connected to something far above Aliune.', '+4 Magi', '{"magi":4}')
on conflict (key) do nothing;