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
  'A thank-you package for DeltaPets alpha testers.',
  3,
  1,
  '{"rewardKind":"care_package"}'::jsonb
)
on conflict (slug) do update set
  name = excluded.name,
  type = excluded.type,
  description = excluded.description,
  rarity = excluded.rarity,
  stack_limit = excluded.stack_limit,
  effects = excluded.effects;

insert into public.inventory (
  user_id,
  item_id,
  qty
)
select
  users.id,
  item_defs.id,
  1
from auth.users as users
cross join public.item_defs as item_defs
where item_defs.slug = 'closed-alpha-care-package'
on conflict (user_id, item_id) do nothing;