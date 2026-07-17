-- moveEggToIncubator() previously moved eggs from Storage into the
-- Hatchery without ever setting hatch_ends_at. Those eggs occupy a
-- hatchery_slots row (blocking new eggs from incubating) but never show
-- up in the rack UI because the frontend only treats a slot as filled
-- when hatch_ends_at is present. This repairs anyone already stuck in
-- that state as of this migration. Two minutes matches the current
-- alpha Kithna hatch time.

update public.pets
set hatch_ends_at = now() + interval '2 minutes'
where location = 'hatchery'
  and stage = 'egg'
  and hatch_ends_at is null;