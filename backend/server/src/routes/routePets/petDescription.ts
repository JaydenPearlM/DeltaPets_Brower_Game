type StatKey = "hp" | "atk" | "def" | "spd" | "magi" | "mana";

type PetStage =
  | "egg"
  | "hatchling"
  | "lowform"
  | "highform"
  | "legion"
  | "mythical_legendary";

type PetStats = {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  magi: number;
  mana: number;
};

type PetForDescription = {
  species?: string | null;
  name: string;
  nickname?: string | null;
  stage: string;
  element: string | null;
  elements?: string[] | null;
  personality_name?: string | null;
  trait?: string | null;
  strengths?: StatKey[] | null;
  weakness?: StatKey | null;
  passive_trait?: string | null;
  mutations?: string[] | null;
  day_night?: string | null;
  stats?: PetStats | null;
};

const STAT_ORDER: StatKey[] = ["hp", "atk", "def", "spd", "magi", "mana"];

function toTitleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatList(values: string[]) {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;

  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function getDisplayName(
  species: string | null | undefined,
  nickname: string | null | undefined,
  fallbackName: string,
) {
  if (nickname?.trim()) return nickname.trim();
  if (species?.trim()) return toTitleCase(species);
  if (fallbackName?.trim()) return fallbackName.trim();

  return "Your Delta";
}

function normalizeElement(value: string | null | undefined) {
  if (!value) return "";

  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");

  return normalized === "null_element" ? "null" : normalized;
}

function getElementLabel(element: string) {
  return element === "null" ? "Voidborne" : toTitleCase(element);
}

function getStagePhrase(stage: string) {
  switch (stage as PetStage) {
    case "egg":
      return "has not hatched yet";
    case "hatchling":
      return "is currently a Hatchling";
    case "lowform":
      return "is currently in its Lowform";
    case "highform":
      return "is currently in its Highform";
    case "legion":
      return "is currently in its Legion form";
    case "mythical_legendary":
      return "has reached its Mythical Legendary form";
    default:
      return "continues to grow";
  }
}

function getElementPhrase(element: string | null | undefined) {
  switch (normalizeElement(element)) {
    case "water":
      return "Its Water nature gives it a fluid, patient presence that can be difficult to pin down.";
    case "fire":
      return "Its Fire nature gives it a sharp spark, like it is always one breath away from action.";
    case "earth":
      return "Its Earth nature gives it a steady, grounded presence that feels difficult to shake.";
    case "air":
      return "Its Air nature gives it a lightness that makes it seem difficult to catch or corner.";
    case "ice":
      return "Its Ice nature feels cool and precise, with a quiet edge underneath.";
    case "storm":
      return "Its Storm nature carries a restless charge, like tension gathering before lightning.";
    case "light":
      return "Its Light nature gives it a bright, reassuring energy that stands out immediately.";
    case "shadow":
      return "Its Shadow nature gives it a darker, stranger aura that can make its intentions difficult to read.";
    case "null":
      return "Its Voidborne nature feels unusual, almost as though part of it exists outside the usual rules of Aliune.";
    default:
      return "There is something distinct about its elemental presence that immediately sets it apart.";
  }
}

function getElementsPhrase(
  baseElement: string | null | undefined,
  elements: string[] | null | undefined,
) {
  const normalizedBase = normalizeElement(baseElement);

  const trainedElements = (elements ?? [])
    .map((element) => normalizeElement(element))
    .filter(
      (element, index, list) =>
        element &&
        element !== normalizedBase &&
        list.indexOf(element) === index,
    )
    .slice(0, 3);

  const basePhrase = getElementPhrase(baseElement);

  if (trainedElements.length === 0) {
    return basePhrase;
  }

  const trainedLabels = trainedElements.map(getElementLabel);

  return `${basePhrase} It has also developed an affinity for ${formatList(
    trainedLabels,
  )}, adding new elemental instincts without replacing its natural ${getElementLabel(
    normalizedBase,
  )} nature.`;
}

function getPersonalityPhrase(personality: string | null | undefined) {
  const p = String(personality ?? "")
    .toLowerCase()
    .trim();

  switch (p) {
    case "friendly":
      return "It is naturally social and tends to warm up to friendly attention quickly.";
    case "honest":
      return "Its reactions tend to be straightforward, making its approval and displeasure difficult to mistake.";
    case "deceiver":
      return "It has a sly streak and seems surprisingly comfortable hiding what it intends to do next.";
    case "loyal":
      return "Once it trusts someone, it forms attachments deeply and is reluctant to abandon them.";
    case "cowardly":
      return "It is cautious around danger and usually prefers to understand an escape route before taking a risk.";
    case "brave":
      return "It carries itself with steady courage and seems more willing than most Kith to face danger directly.";
    case "vengeful":
      return "It remembers when it has been wronged and can hold onto a grudge far longer than expected.";
    case "impulsive":
      return "It tends to act on instinct before fully considering what might happen afterward.";
    case "reasonable":
      return "It has a measured temperament and rarely seems eager to waste energy on unnecessary conflict.";
    case "lazy":
      return "It enjoys conserving its energy and can be remarkably difficult to motivate when it sees no reason to move.";
    case "diligent":
      return "It is unusually diligent, often staying focused on a task long after another Kith would have lost interest.";
    case "naive":
      return "It approaches unfamiliar situations with an open trust that can make it both endearing and easy to surprise.";
    case "cruel":
      return "There is a harsher edge to its temperament, and it does not always seem bothered when another creature backs down.";
    case "optimistic":
      return "It tends to recover quickly from setbacks and approaches unfamiliar situations with an almost stubborn confidence.";
    case "pessimistic":
      return "It watches unfamiliar situations carefully and often seems to expect trouble before deciding whether something is safe.";
    case "arrogant":
      return "It carries itself with obvious confidence and often behaves as though it expects others to keep up with it.";
    case "humble":
      return "It has a quiet temperament and rarely seems interested in drawing attention to its own accomplishments.";
    case "snob":
      return "It can be remarkably particular about what earns its interest, approval, or attention.";
    case "respectful":
      return "It pays close attention to boundaries and responds strongly to trainers who treat it with the same consideration.";
    case "greedy":
      return "It has a possessive streak and tends to notice food, objects, and rewards very quickly.";
    case "generous":
      return "It is unusually willing to share attention and resources with creatures it considers part of its group.";
    case "kind":
      return "It has a naturally gentle disposition and often reacts to others with more patience than aggression.";
  }

  if (p.includes("gentle") || p.includes("calm")) {
    return "Its behavior leans soft and measured rather than reckless.";
  }

  if (p.includes("curious") || p.includes("clever") || p.includes("scholar")) {
    return "It seems to study everything around it before deciding how to act.";
  }

  if (p.includes("bold") || p.includes("guardian")) {
    return "It carries itself with steady confidence, as though it would rather face danger than avoid it.";
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

  if (p.includes("loyalist") || p.includes("protective")) {
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
    return "Its energy feels quieter and more inward, as though it is always half lost in its own rhythm.";
  }

  if (p.includes("shadowed") || p.includes("drifter") || p.includes("feral")) {
    return "There is something less predictable about it, as though part of it still answers to instinct first.";
  }

  if (!p) {
    return "Its temperament is difficult to categorize, but it already has habits and reactions that make it distinctly its own.";
  }

  return `Its ${toTitleCase(
    p,
  )} personality strongly influences the way it reacts to the world around it.`;
}

function getHighestStats(stats: PetStats | null | undefined) {
  if (!stats) return [];

  const highestValue = Math.max(...STAT_ORDER.map((stat) => stats[stat]));

  return STAT_ORDER.filter((stat) => stats[stat] === highestValue);
}

function getLowestStat(stats: PetStats | null | undefined) {
  if (!stats) return null;

  const lowestValue = Math.min(...STAT_ORDER.map((stat) => stats[stat]));

  return STAT_ORDER.find((stat) => stats[stat] === lowestValue) ?? null;
}

function resolveStrengths(
  strengths: StatKey[] | null | undefined,
  stats: PetStats | null | undefined,
) {
  const provided = (strengths ?? []).filter(
    (stat, index, list) =>
      STAT_ORDER.includes(stat) && list.indexOf(stat) === index,
  );

  if (provided.length > 0) {
    return provided;
  }

  return getHighestStats(stats).slice(0, 2);
}

function resolveWeakness(
  weakness: StatKey | null | undefined,
  stats: PetStats | null | undefined,
) {
  if (weakness && STAT_ORDER.includes(weakness)) {
    return weakness;
  }

  return getLowestStat(stats);
}

function getStrengthTrait(stat: StatKey) {
  switch (stat) {
    case "hp":
      return "healthy and hardy, with the stamina to keep going when many Kith would begin to tire";
    case "atk":
      return "physically forceful and confident when it commits itself to an action";
    case "def":
      return "naturally sturdy, patient, and difficult to unsettle once it stands its ground";
    case "spd":
      return "quick to react, alert to movement, and difficult to catch completely off guard";
    case "magi":
      return "highly perceptive and magically intelligent, with a strong instinct for unusual energies";
    case "mana":
      return "deeply attuned to magical energy, with unusually strong reserves to draw from";
  }
}

function getStrengthPhrase(
  strengths: StatKey[] | null | undefined,
  stats: PetStats | null | undefined,
) {
  const list = resolveStrengths(strengths, stats);

  if (list.length === 0) {
    return "Its abilities are fairly even right now, without one natural strength completely defining it.";
  }

  if (list.length === 1) {
    return `Its natural strength in ${list[0].toUpperCase()} makes it ${getStrengthTrait(
      list[0],
    )}.`;
  }

  const traits = list.map(getStrengthTrait);

  return `Its strongest natural traits make it ${formatList(traits)}.`;
}

function getWeaknessPhrase(
  weakness: StatKey | null | undefined,
  stats: PetStats | null | undefined,
) {
  const resolvedWeakness = resolveWeakness(weakness, stats);

  switch (resolvedWeakness) {
    case "hp":
      return "It is less naturally hardy than some Kith and can tire more easily when pushed for too long.";
    case "atk":
      return "Raw physical power is not its specialty, so it tends to depend more heavily on its other talents.";
    case "def":
      return "It is not naturally built to absorb heavy punishment and is less comfortable remaining under pressure.";
    case "spd":
      return "Speed is its weaker point, making it more deliberate than quick and more dependent on patience and timing.";
    case "magi":
      return "Complex magical force does not come as naturally to it as its other abilities.";
    case "mana":
      return "Its magical reserves are more limited, so sustained magical effort can wear it down faster.";
    default:
      return "";
  }
}

function getCurrentStatsPhrase(
  stats: PetStats | null | undefined,
  strengths: StatKey[] | null | undefined,
  weakness: StatKey | null | undefined,
) {
  if (!stats) return "";

  const naturalStrengths = resolveStrengths(strengths, null);
  const naturalWeakness = resolveWeakness(weakness, null);
  const currentHighest = getHighestStats(stats);
  const currentLowest = getLowestStat(stats);

  const shiftedStrength = currentHighest.find(
    (stat) => !naturalStrengths.includes(stat),
  );

  if (shiftedStrength) {
    switch (shiftedStrength) {
      case "hp":
        return "Its current growth has also made its health and endurance increasingly noticeable.";
      case "atk":
        return "Its current growth is beginning to give it more physical force than its natural traits alone would suggest.";
      case "def":
        return "Its current growth has made it increasingly resilient when holding its ground.";
      case "spd":
        return "Its current growth has made it noticeably quicker and more responsive than its natural profile would suggest.";
      case "magi":
        return "Its current growth is sharpening its magical awareness beyond what its natural traits alone would suggest.";
      case "mana":
        return "Its current growth has begun deepening the amount of magical energy it can comfortably sustain.";
    }
  }

  if (currentLowest && naturalWeakness && currentLowest !== naturalWeakness) {
    return `Its current training has also left ${currentLowest.toUpperCase()} as the least developed part of its present stat profile.`;
  }

  return "";
}

function getMutationPhrase(mutations: string[] | null | undefined) {
  const list = (mutations ?? [])
    .map((mutation) => mutation?.trim())
    .filter(
      (mutation, index, values): mutation is string =>
        Boolean(mutation) && values.indexOf(mutation) === index,
    );

  if (list.length === 0) {
    return "";
  }

  const labels = list.map(toTitleCase);

  if (labels.length === 1) {
    return `It carries the ${labels[0]} mutation, another trait that makes this individual different from others of its species.`;
  }

  return `It carries the ${formatList(
    labels,
  )} mutations, giving it a combination of traits that is distinctly its own.`;
}

function getPassiveTraitPhrase(passiveTrait: string | null | undefined) {
  const trait = passiveTrait?.trim();

  if (!trait) {
    return "";
  }

  return `Its ${toTitleCase(
    trait,
  )} passive trait is another part of what makes this individual Kith distinct.`;
}

function getDayNightPhrase(dayNight: string | null | undefined) {
  const alignment = String(dayNight ?? "")
    .trim()
    .toLowerCase();

  if (!alignment) {
    return "";
  }

  if (alignment.includes("night")) {
    return "It is naturally more alert and comfortable at night, when its preferred rhythm seems to come most easily.";
  }

  if (alignment.includes("day")) {
    return "It is naturally more alert and comfortable during the day, when its preferred rhythm seems to come most easily.";
  }

  return "";
}

export function generatePetDescription(input: PetForDescription): string {
  const label = getDisplayName(input.species, input.nickname, input.name);
  const stagePhrase = getStagePhrase(input.stage);

  const elementPhrase = getElementsPhrase(input.element, input.elements);

  const personalityPhrase = getPersonalityPhrase(
    input.personality_name || input.trait || null,
  );

  const strengthPhrase = getStrengthPhrase(input.strengths, input.stats);

  const weaknessPhrase = getWeaknessPhrase(input.weakness, input.stats);

  const currentStatsPhrase = getCurrentStatsPhrase(
    input.stats,
    input.strengths,
    input.weakness,
  );

  const mutationPhrase = getMutationPhrase(input.mutations);
  const passiveTraitPhrase = getPassiveTraitPhrase(input.passive_trait);
  const dayNightPhrase = getDayNightPhrase(input.day_night);

  return [
    `${label} ${stagePhrase}.`,
    elementPhrase,
    personalityPhrase,
    strengthPhrase,
    weaknessPhrase,
    currentStatsPhrase,
    mutationPhrase,
    passiveTraitPhrase,
    dayNightPhrase,
  ]
    .filter(Boolean)
    .join(" ");
}
