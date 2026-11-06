-- Read-only reconciliation evidence. Never infer or grant missing entitlements.
BEGIN READ ONLY;
WITH earned AS (
  SELECT pet_id,2 AS level,points_awarded,points_spent FROM public.pet_level2_rewards
  UNION ALL
  SELECT pet_id,level,points_awarded,points_spent FROM public.pet_starter_level_rewards
)
SELECT p.id AS pet_id,p.level AS current_level,p.xp,p.unspent_points,
  expected.level AS earned_level,e.points_awarded,e.points_spent,
  coalesce(a.hp+a.atk+a.magi+a.def+a.spd+a.mana,0) AS allocated,
  CASE WHEN e.pet_id IS NULL THEN 'MISSING_EVIDENCE_NO_AUTOMATIC_BACKFILL'
    WHEN e.points_spent<>coalesce(a.hp+a.atk+a.magi+a.def+a.spd+a.mana,0)
      THEN 'CONFLICT_REQUIRES_INDIVIDUAL_REVIEW'
    ELSE 'RECORDED' END AS review_status
FROM public.pets p
CROSS JOIN LATERAL generate_series(2,p.level) expected(level)
LEFT JOIN earned e ON e.pet_id=p.id AND e.level=expected.level
LEFT JOIN public.pet_stat_allocations a ON a.pet_id=p.id AND a.level=expected.level
WHERE p.species IN ('water_starter','fire_starter','earth_starter','air_starter','ice_starter',
  'storm_starter','light_starter','shadow_night_bad','shadow_day_good')
ORDER BY p.id,expected.level;
ROLLBACK;
