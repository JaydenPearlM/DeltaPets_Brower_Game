-- 20260710000001_seed_item_defs.sql
-- item_defs was created in 20260113000001_alpha_schema.sql but never seeded.
-- This left two real bugs:
--   1. rewards.ts giveItem() throws "Missing item_defs slug" for
--      "starter_equipment" and "potion_small" whenever the weekly reward
--      pool hits those days, because the rows never existed.
--   2. There was no real, backend-tracked row for the four care items
--      (food/soap/toy/bed) referenced by the frontend care-inventory system,
--      so they had no legitimate way to exist outside localStorage.
--
-- This migration only inserts rows. It does not alter any existing table,
-- column, or policy. Safe to run multiple times (upsert on slug).

insert into public.item_defs (slug, name, type, description, rarity, stack_limit, effects)
values
  ('starter_equipment', 'Starter Equipment', 'equipment',
   'A basic equipment bundle awarded from the weekly reward track.', 2, 99, '{}'::jsonb),

  ('potion_small', 'Small Potion', 'battle_food',
   'A small restorative potion awarded from the weekly reward track.', 1, 99, '{}'::jsonb),

  ('kithna-food-pack', 'Kithna Food Pack', 'care',
   'A simple meal for restoring hunger.', 1, 99, '{"careCategory":"food"}'::jsonb),

  ('soft-cleaning-brush', 'Soft Cleaning Brush', 'care',
   'A gentle brush for restoring clean.', 1, 99, '{"careCategory":"soap"}'::jsonb),

  ('spark-jingle-toy', 'Spark Jingle Toy', 'care',
   'A tiny toy for restoring mood.', 1, 99, '{"careCategory":"toy"}'::jsonb),

  ('moon-nap-pillow', 'Moon Nap Pillow', 'care',
   'A soft pillow for restoring comfort.', 1, 99, '{"careCategory":"bed"}'::jsonb)

on conflict (slug) do update set
  name = excluded.name,
  type = excluded.type,
  description = excluded.description,
  rarity = excluded.rarity,
  stack_limit = excluded.stack_limit,
  effects = excluded.effects;

-- Rollback:
-- delete from public.item_defs where slug in (
--   'starter_equipment', 'potion_small', 'kithna-food-pack',
--   'soft-cleaning-brush', 'spark-jingle-toy', 'moon-nap-pillow'
-- );

-- Verification:
-- select slug, name, type, rarity, stack_limit from public.item_defs order by slug;
