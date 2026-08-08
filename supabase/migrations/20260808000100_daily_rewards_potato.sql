alter table public.daily_login_rewards
add column if not exists potato_received boolean not null default false;

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
  'potato',
  'Potato',
  'care',
  'Just a potato.',
  1,
  1,
  '{}'::jsonb
)
on conflict (slug) do update set
  name = excluded.name,
  type = excluded.type,
  description = excluded.description,
  rarity = excluded.rarity,
  stack_limit = excluded.stack_limit,
  effects = excluded.effects;