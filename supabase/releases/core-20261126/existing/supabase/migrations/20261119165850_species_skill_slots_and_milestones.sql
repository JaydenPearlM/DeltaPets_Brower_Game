-- REVIEW ONLY: do not apply without approval.
-- Prerequisite: 20261116161401_level2_skill_learning_and_allocation.sql.
-- Compatibility/recovery: output/skill-learning-storage-proposal.md.
-- Schema preparation only: no skills granted, no existing equipment reordered,
-- no new RPC or loadout endpoint enabled, no combat definitions activated.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.pet_skills
  ADD COLUMN equipped_slot smallint,
  ADD CONSTRAINT pet_skills_equipped_slot_range
    CHECK (equipped_slot IS NULL OR equipped_slot BETWEEN 1 AND 4),
  ADD CONSTRAINT pet_skills_equipped_slot_flag
    CHECK (equipped_slot IS NULL OR equipped = true);

-- Preserve legacy equipped=true/slot=NULL records for explicit reconciliation.
-- New writers must reject ambiguous legacy loadouts, not silently normalize them.
CREATE UNIQUE INDEX pet_skills_one_skill_per_equipped_slot
  ON public.pet_skills (pet_id, equipped_slot)
  WHERE equipped_slot IS NOT NULL;

-- The prerequisite migration creates this inline CHECK with this default name.
-- Fail on unexpected schema drift rather than dropping arbitrary constraints.
ALTER TABLE public.pet_skill_milestone_claims
  DROP CONSTRAINT pet_skill_milestone_claims_milestone_key_check,
  ADD CONSTRAINT pet_skill_milestone_claims_milestone_key_check
    CHECK (milestone_key IN (
      'level-2', 'level-5', 'level-8', 'level-11', 'level-14',
      'level-17', 'level-20', 'level-23', 'level-26', 'level-30'
    )),
  ADD COLUMN equipment_decision text NOT NULL DEFAULT 'legacy',
  ADD COLUMN equipment_decision_slot smallint,
  ADD CONSTRAINT pet_skill_claim_equipment_decision_valid
    CHECK (equipment_decision IN (
      'legacy', 'auto_equipped', 'pending', 'replaced', 'declined'
    )),
  ADD CONSTRAINT pet_skill_claim_equipment_decision_slot_valid
    CHECK (
      (equipment_decision IN ('auto_equipped', 'replaced')
        AND equipment_decision_slot IS NOT NULL
        AND equipment_decision_slot BETWEEN 1 AND 4)
      OR (equipment_decision IN ('legacy', 'pending', 'declined')
        AND equipment_decision_slot IS NULL)
    );

-- The original (pet_id, milestone_key) primary key still prevents duplicate claims.
CREATE UNIQUE INDEX pet_skill_claim_one_pending_equipment_decision
  ON public.pet_skill_milestone_claims (pet_id)
  WHERE equipment_decision = 'pending';

COMMENT ON COLUMN public.pet_skills.equipped_slot IS
  'Active skill slot 1-4 on this individual pet; null means unequipped or unreconciled legacy equipment. Passive skills must not occupy slots.';
COMMENT ON COLUMN public.pet_skill_milestone_claims.equipment_decision_slot IS
  'Historical slot selected by the original auto-equip or replacement decision; not the current loadout. Preserve for idempotent retries.';

COMMIT;
