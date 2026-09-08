insert into public.item_defs (
  slug,
  name,
  type,
  description,
  rarity,
  stack_limit,
  effects
)
values (
  'haiku_scroll_01',
  'Haiku Scroll #1',
  'material',
  'A tiny ribbon-bound scroll containing a piece of Aliune lore.',
  2,
  99,
  '{
    "scrollNumber": 1,
    "collection": "haiku",
    "haiku": [
      "Twin moons cross the mist",
      "Old roads hum beneath starlight",
      "Aliune listens"
    ]
  }'::jsonb
)
on conflict (slug) do nothing;