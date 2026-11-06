-- UNAPPLIED - REQUIRES EXPLICIT APPROVAL. Read-only evidence proposal, NOT a backfill.
-- Run only after the foundation proposal has been separately approved and installed.
-- Historical XP receipts are evidence, not a complete ledger of stat grants/spending.
-- This query deliberately does not infer how many additional points to award.
BEGIN READ ONLY;
SELECT p.id AS pet_id, p.level, p.xp, p.unspent_points,
  coalesce(a.level_2_allocated, 0) AS level_2_allocated,
  coalesce(a.later_allocated, 0) AS later_allocated,
  r.points_awarded AS recorded_award, r.points_spent AS recorded_spending,
  evidence.level_2_crossing_receipts,
  CASE
    WHEN r.pet_id IS NULL THEN 'AMBIGUOUS_REQUIRES_INDIVIDUAL_EVIDENCE_REVIEW'
    WHEN r.points_spent IS DISTINCT FROM coalesce(a.level_2_allocated, 0)
      THEN 'CONFLICT_PRESERVE_AND_REVIEW'
    ELSE 'RECORDED_NO_BACKFILL'
  END AS review_status
FROM public.pets p
LEFT JOIN public.pet_level2_rewards r ON r.pet_id = p.id
LEFT JOIN LATERAL (
  SELECT sum(hp+atk+magi+def+spd+mana) FILTER (WHERE level = 2) AS level_2_allocated,
    sum(hp+atk+magi+def+spd+mana) FILTER (WHERE level > 2) AS later_allocated
  FROM public.pet_stat_allocations WHERE pet_id = p.id
) a ON true
LEFT JOIN LATERAL (
  SELECT jsonb_agg(room.event_payload->'xpReward') AS level_2_crossing_receipts
  FROM public.wildwood_rooms room
  JOIN public.wildwood_expeditions expedition ON expedition.id = room.expedition_id
  WHERE expedition.user_id = p.user_id
    AND room.event_payload #>> '{xpReward,petId}' = p.id::text
    AND room.event_payload #>> '{xpReward,previousLevel}' = '1'
    AND room.event_payload #>> '{xpReward,level}' IN
      ('2','3','4','5','6','7','8','9','10','11','12','13','14','15','16',
       '17','18','19','20','21','22','23','24','25','26','27','28','29','30')
) evidence ON true
WHERE p.level >= 2
ORDER BY p.id;
ROLLBACK;
