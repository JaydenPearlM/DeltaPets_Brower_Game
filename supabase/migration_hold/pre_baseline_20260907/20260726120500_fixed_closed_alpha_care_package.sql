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
  'closed-alpha-care-package',
  'Closed Alpha Care Package',
  'care',
  'A thank-you gift for Closed Alpha testers.',
  3,
  1,
  '{"closedAlphaCarePackage":true}'::jsonb
)
on conflict (slug) do update set
  name = excluded.name,
  type = excluded.type,
  description = excluded.description,
  rarity = excluded.rarity,
  stack_limit = excluded.stack_limit,
  effects = excluded.effects;