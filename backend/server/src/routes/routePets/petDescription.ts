type StatKey = "hp" | "atk" | "def" | "spd" | "magi" | "mana";
type PetStage =
  | "egg"
  | "hatchling"
  | "lowform"
  | "highform"
  | "legion"
  | "mythical_legendary";

type PetForDescription = {
  species?: string | null;
  name: string;
  nickname?: string | null;
  stage: string;
  element: string | null;
  personality_name?: string | null;
  trait?: string | null;
  strengths?: StatKey[] | null;
  weakness?: StatKey | null;
};

function toTitleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getDisplayName(
  species: string | null | undefined,
  nickname: string | null | undefined,
  fallbackName: string,
) {
  if (nickname?.trim()) return nickname.trim();
  if (fallbackName?.trim()) return fallbackName.trim();
  if (species?.trim()) return toTitleCase(species);
  return "Your Delta";
}

function normalizeElement(value: string | null | undefined) {
  if (!value) return "null";
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
  return normalized === "null_element" ? "null" : normalized;
}

function getStagePhrase(stage: string) {
  switch (stage as PetStage) {
    case "egg":
      return "still feels full of hidden potential";
    case "hatchling":
      return "is beginning to show its nature more clearly";
    case "lowform":
      return "has grown into a more defined and capable companion";
    case "highform":
      return "has evolved into a more imposing and experienced partner";
    case "legion":
      return "has ascended into a powerful and battle-tested form";
    case "mythical_legendary":
      return "has reached an extraordinary state few Deltas ever attain";
    default:
      return "still carries an air of mystery";
  }
}

function getElementPhrase(element: string | null | undefined) {
  switch (normalizeElement(element)) {
    case "water":
      return "Its presence feels fluid, patient, and difficult to pin down.";
    case "fire":
      return "There is a sharp spark to it, like it is always one breath away from action.";
    case "earth":
      return "It gives off a steady, grounded presence that feels hard to shake.";
    case "air":
      return "It moves with a lightness that makes it seem difficult to catch or corner.";
    case "ice":
      return "Its temperament feels cool and precise, with a quiet edge underneath.";
    case "storm":
      return "There is a restless charge around it, like tension gathering before lightning.";
    case "light":
      return "It carries a bright, reassuring energy that stands out immediately.";
    case "shadow":
      return "It has a darker, stranger aura that makes its intentions harder to read.";
    case "null":
      return "Something about it feels unusual, almost outside the usual rules of Aliune.";
    default:
      return "It has a distinct presence that immediately sets it apart.";
  }
}

function getPersonalityPhrase(personality: string | null | undefined) {
  const p = String(personality ?? "")
    .toLowerCase()
    .trim();

  if (!p) {
    return "Its personality is still taking shape, but the bond forming between you already feels important.";
  }

  if (p.includes("gentle") || p.includes("calm")) {
    return "Its behavior leans soft and measured rather than reckless.";
  }
  if (p.includes("curious") || p.includes("clever") || p.includes("scholar")) {
    return "It seems to study everything around it before deciding how to act.";
  }
  if (p.includes("brave") || p.includes("bold") || p.includes("guardian")) {
    return "It carries itself with steady confidence, as if it would rather face danger than avoid it.";
  }
  if (
    p.includes("playful") ||
    p.includes("cheerful") ||
    p.includes("prankster")
  ) {
    return "There is a lively streak in it that shows up whenever attention or movement is nearby.";
  }
  if (p.includes("shy") || p.includes("anxious")) {
    return "It seems more cautious than most, watching carefully before it fully settles in.";
  }
  if (
    p.includes("loyal") ||
    p.includes("loyalist") ||
    p.includes("protective")
  ) {
    return "It gives the impression that once trust is earned, it will hold onto that bond tightly.";
  }
  if (
    p.includes("fiery") ||
    p.includes("wild") ||
    p.includes("wildheart") ||
    p.includes("blazeborn")
  ) {
    return "Its emotions feel close to the surface, giving it a fierce and immediate presence.";
  }
  if (p.includes("sleepy") || p.includes("dreamer") || p.includes("stoic")) {
    return "Its energy feels quieter and more inward, like it is always half lost in its own rhythm.";
  }
  if (p.includes("shadowed") || p.includes("drifter") || p.includes("feral")) {
    return "There is something less predictable about it, as if part of it still answers to instinct first.";
  }

  return "Its personality is starting to show more clearly, and the bond between you two is shaping who it becomes.";
}

function getStrengthPhrase(strengths: StatKey[] | null | undefined) {
  const list = (strengths ?? []).filter(Boolean);

  if (list.length === 0) {
    return "Its natural talents have not fully revealed a dominant edge yet.";
  }

  if (list.length === 1) {
    switch (list[0]) {
      case "hp":
        return "It already shows a noticeable gift for endurance.";
      case "atk":
        return "Its natural offensive instincts are already easy to spot.";
      case "def":
        return "It seems built to hold firm when pressure starts to build.";
      case "spd":
        return "Its movements suggest a natural edge in speed and reaction.";
      case "magi":
        return "There is a strong mystical current in the way it carries itself.";
      case "mana":
        return "Its magical reserves seem deeper than they first appear.";
      default:
        return "One of its natural strengths is already starting to stand out.";
    }
  }

  const formatted = list.map((item) => {
    switch (item) {
      case "hp":
        return "endurance";
      case "atk":
        return "offense";
      case "def":
        return "defense";
      case "spd":
        return "speed";
      case "magi":
        return "mystic force";
      case "mana":
        return "mana flow";
      default:
        return toTitleCase(item);
    }
  });

  if (formatted.length === 2) {
    return `Its strongest natural edges seem to be ${formatted[0]} and ${formatted[1]}.`;
  }

  return "Several strengths are beginning to stand out in the way it grows.";
}

function getWeaknessPhrase(weakness: StatKey | null | undefined) {
  switch (weakness) {
    case "hp":
      return "It may need extra care before it can endure longer battles comfortably.";
    case "atk":
      return "Raw physical force does not seem to be its sharpest edge right now.";
    case "def":
      return "It may need care when facing heavier retaliation.";
    case "spd":
      return "It may not always be the first to move when things get tense.";
    case "magi":
      return "Mystical force does not seem to be its strongest lane.";
    case "mana":
      return "It may struggle more when long magical pressure is required.";
    default:
      return "It still has one softer edge that could shape how it grows.";
  }
}

export function generatePetDescription(input: PetForDescription): string {
  const label = getDisplayName(input.species, input.nickname, input.name);
  const stagePhrase = getStagePhrase(input.stage);
  const elementPhrase = getElementPhrase(input.element);
  const personalityPhrase = getPersonalityPhrase(
    input.personality_name || input.trait || null,
  );
  const strengthPhrase = getStrengthPhrase(input.strengths);
  const weaknessPhrase = getWeaknessPhrase(input.weakness);

  return `${label} ${stagePhrase}. ${elementPhrase} ${personalityPhrase} ${strengthPhrase} ${weaknessPhrase}`;
}
