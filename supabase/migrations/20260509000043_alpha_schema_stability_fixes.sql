begin;

alter table public.pet_stat_allocations
  drop constraint if exists pet_alloc_one_point_per_level;

alter table public.pet_stat_allocations
  add constraint pet_alloc_points_valid check (
    hp >= 0
    and atk >= 0
    and magi >= 0
    and def >= 0
    and spd >= 0
    and mana >= 0
    and (
      (
        level = 1
        and (hp + atk + magi + def + spd + mana) between 0 and 30
      )
      or
      (
        level > 1
        and (hp + atk + magi + def + spd + mana) = 1
      )
    )
  );

commit;