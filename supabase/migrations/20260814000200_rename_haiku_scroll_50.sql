update public.item_defs
set
  slug = 'haiku_scroll_50',
  name = 'Haiku Scroll #50',
  description = 'A tiny ribbon-bound scroll containing a piece of Aliune lore.',
  effects = '{
    "scrollNumber": 50,
    "collection": "haiku",
    "haiku": [
      "Twin moons cross the mist",
      "Old roads hum beneath starlight",
      "Aliune listens"
    ]
  }'::jsonb
where slug = 'haiku_scroll_01'; `