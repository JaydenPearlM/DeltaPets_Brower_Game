import type {
  SolenAwarenessState,
  SolenMemory,
  SolenStatAwareness,
  SolenStatKey,
} from "./solenAwareness";

import type {
  SolenBehaviorProfile,
  SolenElementPreference,
} from "./solenGrowth";

export type SolenDialogueReason =
  | "low_health"
  | "hungry"
  | "dirty"
  | "unhappy"
  | "uncomfortable"
  | "tired"
  | "low_energy"
  | "battle_win"
  | "battle_loss"
  | "food_preference"
  | "strongest_stat"
  | "weakest_stat"
  | "desired_element"
  | "general";

export interface SolenDialogueContext {
  awareness: SolenAwarenessState;

  behavior: SolenBehaviorProfile;

  stats?: SolenStatAwareness;

  recentMemories?: SolenMemory[];

  personalityName?: string;
}

export interface SolenDialogueResult {
  reason: SolenDialogueReason;
  line: string;
}

const STAT_NAMES: Record<SolenStatKey, string> = {
  hp: "health",
  atk: "physical attacks",
  magi: "magic",
  def: "defense",
  spd: "speed",
  mana: "mana",
};

const ELEMENT_NAMES: Record<SolenElementPreference, string> = {
  fire: "Fire",
  water: "Water",
  earth: "Earth",
  air: "Air",
  ice: "Ice",
  storm: "Storm",
  shadow: "Shadow",
};

function hasRecentMemory(
  memories: SolenMemory[] | undefined,
  type: SolenMemory["type"],
): boolean {
  return memories?.some((memory) => memory.type === type) ?? false;
}

function getCareDialogue(
  awareness: SolenAwarenessState,
): SolenDialogueResult | null {
  if (awareness.lowHealth) {
    return {
      reason: "low_health",
      line: "I'm hurting pretty badly. I think I need some help.",
    };
  }

  if (awareness.hungry) {
    return {
      reason: "hungry",
      line: "I'm getting hungry. Do we have anything to eat?",
    };
  }

  if (awareness.lowEnergy) {
    return {
      reason: "low_energy",
      line: "I'm running out of energy. I should probably slow down.",
    };
  }

  if (awareness.tired) {
    return {
      reason: "tired",
      line: "I'm getting tired. A little rest sounds nice.",
    };
  }

  if (awareness.dirty) {
    return {
      reason: "dirty",
      line: "I think I could use some cleaning up.",
    };
  }

  if (awareness.unhappy) {
    return {
      reason: "unhappy",
      line: "I'm feeling a little down today.",
    };
  }

  if (awareness.uncomfortable) {
    return {
      reason: "uncomfortable",
      line: "Something feels uncomfortable. Can you check on me?",
    };
  }

  return null;
}

function getBattleDialogue(
  memories: SolenMemory[] | undefined,
): SolenDialogueResult | null {
  if (hasRecentMemory(memories, "battle_loss")) {
    return {
      reason: "battle_loss",
      line: "That battle didn't go our way. We'll do better next time.",
    };
  }

  if (hasRecentMemory(memories, "battle_win")) {
    return {
      reason: "battle_win",
      line: "We won! I think we're getting stronger.",
    };
  }

  return null;
}

function getFoodDialogue(
  behavior: SolenBehaviorProfile,
): SolenDialogueResult | null {
  if (behavior.preferredFoodCategory === "meat") {
    return {
      reason: "food_preference",
      line: "I think I've started liking meat more than vegetables.",
    };
  }

  if (behavior.preferredFoodCategory === "vegetables") {
    return {
      reason: "food_preference",
      line: "I think I like vegetables more than meat.",
    };
  }

  if (behavior.preferredFoodCategory === "balanced") {
    return {
      reason: "food_preference",
      line: "I don't think I have a favorite. I like both.",
    };
  }

  return null;
}

function getElementDialogue(
  desiredElement: SolenElementPreference | null,
): SolenDialogueResult | null {
  if (!desiredElement) {
    return null;
  }

  return {
    reason: "desired_element",
    line: `I've been wondering what learning ${ELEMENT_NAMES[desiredElement]} would be like.`,
  };
}

function getStrongStatDialogue(
  stats: SolenStatAwareness | undefined,
): SolenDialogueResult | null {
  if (!stats) {
    return null;
  }

  return {
    reason: "strongest_stat",
    line: `I think ${STAT_NAMES[stats.strongestStat]} comes pretty naturally to me.`,
  };
}

function getWeakStatDialogue(
  stats: SolenStatAwareness | undefined,
): SolenDialogueResult | null {
  if (!stats) {
    return null;
  }

  return {
    reason: "weakest_stat",
    line: `I think I need more practice with ${STAT_NAMES[stats.weakestStat]}.`,
  };
}

export function resolveSolenDialogue(
  context: SolenDialogueContext,
): SolenDialogueResult {
  const careDialogue = getCareDialogue(context.awareness);

  if (careDialogue) {
    return careDialogue;
  }

  const battleDialogue = getBattleDialogue(context.recentMemories);

  if (battleDialogue) {
    return battleDialogue;
  }

  const foodDialogue = getFoodDialogue(context.behavior);

  if (foodDialogue) {
    return foodDialogue;
  }

  const elementDialogue = getElementDialogue(context.behavior.desiredElement);

  if (elementDialogue) {
    return elementDialogue;
  }

  const strongStatDialogue = getStrongStatDialogue(context.stats);

  if (strongStatDialogue) {
    return strongStatDialogue;
  }

  const weakStatDialogue = getWeakStatDialogue(context.stats);

  if (weakStatDialogue) {
    return weakStatDialogue;
  }

  return {
    reason: "general",
    line: "What should we do today?",
  };
}
