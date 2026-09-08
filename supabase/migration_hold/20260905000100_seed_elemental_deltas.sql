-- Seed elemental Delta evolution materials.
-- These item_defs are required by the hatch reward system.
-- Safe to run multiple times because slug is unique and this uses upsert.

insert into public.item_defs (
  slug,
  name,
  type,
  description,
  rarity,
  stack_limit,
  effects
)
values
  (
    'water-delta',
    'Water Delta',
    'material',
    'A Delta symbol infused with Water energy. Used for Water evolution.',
    1,
    999,
    '{"element":"water"}'::jsonb
  ),
  (
    'fire-delta',
    'Fire Delta',
    'material',
    'A Delta symbol infused with Fire energy. Used for Fire evolution.',
    1,
    999,
    '{"element":"fire"}'::jsonb
  ),
  (
    'earth-delta',
    'Earth Delta',
    'material',
    'A Delta symbol infused with Earth energy. Used for Earth evolution.',
    1,
    999,
    '{"element":"earth"}'::jsonb
  ),
  (
    'air-delta',
    'Air Delta',
    'material',
    'A Delta symbol infused with Air energy. Used for Air evolution.',
    1,
    999,
    '{"element":"air"}'::jsonb
  ),
  (
    'ice-delta',
    'Ice Delta',
    'material',
    'A Delta symbol infused with Ice energy. Used for Ice evolution.',
    1,
    999,
    '{"element":"ice"}'::jsonb
  ),
  (
    'storm-delta',
    'Storm Delta',
    'material',
    'A Delta symbol infused with Storm energy. Used for Storm evolution.',
    1,
    999,
    '{"element":"storm"}'::jsonb
  ),
  (
    'light-delta',
    'Light Delta',
    'material',
    'A Delta symbol infused with Light energy. Used for Light evolution.',
    1,
    999,
    '{"element":"light"}'::jsonb
  ),
  (
    'shadow-delta',
    'Shadow Delta',
    'material',
    'A Delta symbol infused with Shadow energy. Used for Shadow evolution.',
    1,
    999,
    '{"element":"shadow"}'::jsonb
  )

on conflict (slug) do update set
  name = excluded.name,
  type = excluded.type,
  description = excluded.description,
  rarity = excluded.rarity,
  stack_limit = excluded.stack_limit,
  effects = excluded.effects;