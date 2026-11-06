/** Design preparation only. Never use these entries as learned skills or battle actions. */
export type CombatRole = "Tank" | "Healer" | "DPS" | "Sorcerer";

export type DraftSkillCandidate = {
  readonly name: string;
  readonly element: "earth";
  readonly role: CombatRole;
  readonly description: string;
  readonly status: "design-only";
  readonly skillId: null;
  readonly damage: null;
  readonly mpCost: null;
  readonly accuracy: null;
  readonly cooldown: null;
  readonly duration: null;
  readonly target: null;
};

const undecided = {
  element: "earth",
  status: "design-only",
  skillId: null,
  damage: null,
  mpCost: null,
  accuracy: null,
  cooldown: null,
  duration: null,
  target: null,
} as const;

// This milestone is a design reference, not a runtime unlock rule.
export const TWIGLET_LEVEL_2_DRAFT: {
  readonly species: "Twiglet";
  readonly level: 2;
  readonly candidates: readonly DraftSkillCandidate[];
} = {
  species: "Twiglet",
  level: 2,
  candidates: [
    { ...undecided, name: "Root Brace", role: "Tank", description: "Temporary Earth defense." },
    { ...undecided, name: "Sprout Mend", role: "Healer", description: "Minor healing." },
    { ...undecided, name: "Seed Tap", role: "DPS", description: "Light physical Earth damage." },
    { ...undecided, name: "Pollen Puff", role: "Sorcerer", description: "Light ranged Earth magic." },
  ],
};

/** Future request contract, not an implementation or proof of authorization.
 * IDs must come from an authenticated pending-choice response, never the draft.
 * The server must validate ownership, milestone, element and expected old skill.
 * Keeping does not alter learned skills; replacing requires a confirmed atomic write.
 */
export type SkillChoiceDecision =
  | { readonly kind: "keep"; readonly petId: string; readonly choiceId: string }
  | {
      readonly kind: "replace";
      readonly petId: string;
      readonly choiceId: string;
      readonly expectedOldSkillId: string;
      readonly replacementSkillId: string;
      readonly confirmed: true;
    };
