import { z } from "zod";
import { findCharacterProfileBySpeciesId } from "../../shared/pets/characterProfiles/characterRegistry";

export const statKeys = ["hp", "atk", "magi", "def", "spd", "mana"] as const;
export const combatRoleSchema = z.enum(["tank", "healer", "dps", "sorcerer"]);
const points = z.number().int().min(0).max(2);
export const allocationSchema = z.object({
  hp: points, atk: points, magi: points, def: points, spd: points, mana: points,
}).strict().refine(value => {
  const sum = statKeys.reduce((total, key) => total + value[key], 0);
  return sum >= 1 && sum <= 2;
}, "Spend one or two Level 2 points");
export type Allocation = z.infer<typeof allocationSchema>;
export const allocationRequestSchema = z.object({
  requestId: z.uuid(), allocation: allocationSchema,
}).strict();
export const choiceRequestSchema = z.object({ skillSlug: z.string().regex(/^[a-z][a-z0-9-]*$/).max(100) }).strict();
export const petIdSchema = z.uuid();

const candidateSchema = z.object({
  proposed_skill_id: z.string(), name: z.string(), element: z.string(),
  role: combatRoleSchema, category: z.string(), description: z.string(),
  proposed_unlock_level: z.literal(2),
  damage: z.null(), healing_amount: z.null(), defense_modifier: z.null(),
  duration_turns: z.null(), accuracy: z.null(), mana_cost: z.null(), cooldown: z.null(),
});
const designSchema = z.object({ skills: z.object({
  level_2_skill_choice: z.object({
    level: z.literal(2), selection_count: z.literal(1), milestone_key: z.literal("level-2"),
    selection_method: z.literal("player_choice"), automatic_grant: z.literal(false),
    candidate_skill_ids: z.array(z.string()).length(4),
  }),
  hatchling_move_design_draft: z.object({
    implementation_approved: z.literal(false), candidate_moves: z.array(candidateSchema).length(4),
  }),
}) });

/** Static design eligibility only. Database claims and learned rows remain authoritative. */
export function getLevel2Design(speciesId: string, element: string) {
  const profile = findCharacterProfileBySpeciesId(speciesId);
  if (!profile || !profile.profile_enabled || profile.element !== element) return null;
  const parsed = designSchema.safeParse(profile.progression);
  if (!parsed.success) return null;
  const { level_2_skill_choice: choice, hatchling_move_design_draft: draft } = parsed.data.skills;
  const candidates = draft.candidate_moves;
  if (new Set(candidates.map(candidate => candidate.role)).size !== 4
    || new Set(choice.candidate_skill_ids).size !== 4
    || new Set(candidates.map(candidate => candidate.proposed_skill_id)).size !== 4
    || candidates.some(candidate => candidate.element !== element
      || !choice.candidate_skill_ids.includes(candidate.proposed_skill_id))) return null;
  return { milestoneKey: choice.milestone_key, configVersion: "level-2-v1", candidates, combatEnabled: false };
}

/** Pure preview/check; the database repeats checks under a row lock. */
export function allocationCost(input: unknown, unspent: number, alreadySpent: number) {
  const allocation = allocationSchema.parse(input);
  const cost = statKeys.reduce((sum, key) => sum + allocation[key], 0);
  if (!Number.isSafeInteger(unspent) || unspent < cost
    || !Number.isSafeInteger(alreadySpent) || alreadySpent < 0 || alreadySpent + cost > 2) {
    throw new Error("Insufficient Level 2 points");
  }
  return cost;
}

// Starter accumulated allocation; authoritative entitlement checks remain in the RPC.
const starterPoints = z.number().int().min(0).max(58);
export const starterAllocationRequestSchema = z.object({
  requestId: z.uuid(),
  allocation: z.object({ hp: starterPoints, atk: starterPoints, magi: starterPoints,
    def: starterPoints, spd: starterPoints, mana: starterPoints }).strict().refine(value => {
      const total = statKeys.reduce((sum, key) => sum + value[key], 0);
      return total >= 1 && total <= 58;
    }, "Spend between one and 58 earned starter points"),
}).strict();

export function allocationHistoryStatus(level: number, unspent: number,
  rewards: { level: number; points_awarded: number; points_spent: number }[],
  allocations: { level: number; hp: number; atk: number; magi: number; def: number; spd: number; mana: number }[]) {
  const missingLevels = Array.from({ length: Math.max(0, level - 1) }, (_, i) => i + 2)
    .filter(earnedLevel => !rewards.some(row => row.level === earnedLevel));
  const conflicts = rewards.filter(row => row.level > level || row.points_awarded !== 2
    || row.points_spent < 0 || row.points_spent > 2
    || row.points_spent !== allocations.filter(a => a.level === row.level)
      .reduce((sum, a) => sum + statKeys.reduce((n, key) => n + a[key], 0), 0)).map(row => row.level);
  const remaining = rewards.reduce((sum, row) => sum + row.points_awarded - row.points_spent, 0);
  const consistent = missingLevels.length === 0 && conflicts.length === 0 && remaining <= unspent
    && new Set(rewards.map(row => row.level)).size === rewards.length;
  return { missingLevels, conflictingLevels: conflicts, availablePoints: consistent ? remaining : 0,
    status: level < 2 ? 'ineligible' : consistent ? 'available' : 'reconciliation_required' };
}

export function localAllocationEnabled(mode: string | undefined, flag: string | undefined, url: string | undefined) {
  if (mode !== 'development' || flag !== 'true' || !url) return false;
  try { return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname); }
  catch { return false; }
}
