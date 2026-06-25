type CareStatus = {
  hunger?: number | null;
  clean?: number | null;
  happy?: number | null;
  comfort?: number | null;
  rest?: number | null;
  energy?: number | null;
  bond?: number | null;
};

export type SelfAwareMemory = {
  visitCount: number;
  previousVisitAt: string | null;
  minutesSinceLastVisit: number | null;
};

type MutationTrait =
  | string
  | {
      name?: string | null;
      key?: string | null;
    };

type SelfAwarePet = {
  id?: string | null;
  nickname?: string | null;
  species?: string | null;
  species_name?: string | null;
  element?: string | null;
  stage?: string | null;
  level?: number | null;
  personality?: string | null;
  personality_key?: string | null;
  passive_trait_id?: string | null;
  passive_trait_key?: string | null;
  passive_trait_name?: string | null;
  passive_trait?: {
    name?: string | null;
    key?: string | null;
  } | null;
  mutation_trait_names?: string[] | null;
  mutations?: MutationTrait[] | null;
};

type SelfAwareBubbleArgs = {
  pet: SelfAwarePet | null;
  care?: CareStatus | null;
  isDay?: boolean;
  memory?: SelfAwareMemory | null;
  fallbackText: string;
};

type CareStat = {
  key: string;
  label: string;
  value: number | null | undefined;
};

type AwarenessLine = {
  id: string;
  priority: number;
  lines: string[];
};

const personalityLines: Record<string, string[]> = {
  brave: [
    "Put me in the front. I was literally born for problems.",
    "I know danger when I see it. I also know I can hit it.",
    "You picked a fighter. Do not act surprised when I want to fight.",
    "I am not scared. I am calculating how loud this is about to get.",
    "If something tries us, I want the first turn.",
    "I can feel my paws wanting to move. Let me prove something.",
  ],
  shy: [
    "You came back... I was lowkey hoping you would.",
    "I notice when you check on me, even if I do not say much.",
    "I do better when you do not rush me.",
    "It is easier to be brave when you are here.",
    "I am still learning how to trust this place.",
    "I saw you hover over me. I pretended not to.",
  ],
  playful: [
    "I saw that button light up. You were absolutely going to click it.",
    "Training? Cool. Snacks after though.",
    "I am being very normal about wanting attention. Extremely normal.",
    "If this is a serious moment, why does my tail want to cause problems?",
    "You opened the page, so legally this is playtime.",
    "I have no regrets. I have maybe one regret. Actually no regrets.",
  ],
  calm: [
    "Your timing is steady today. I like that.",
    "We do not need to rush. Growth still counts when it is quiet.",
    "I can feel the whole room slow down when you check on me.",
    "I am listening. Not everything needs noise.",
    "Even small care adds up. I remember it.",
    "Stay steady. I will match you.",
  ],
  stubborn: [
    "I am not ignoring you. I am strategically disagreeing.",
    "You picked me, so now you are stuck with my opinions.",
    "I heard you. I am choosing my own timing.",
    "Do I need care? Maybe. Will I admit it? Absolutely not.",
    "That button better be worth pressing.",
    "I will cooperate, but I am making a face about it.",
  ],
};

const elementLines: Record<string, string[]> = {
  fire: [
    "Something in me keeps burning even when I rest.",
    "Do not mistake warmth for weakness.",
    "My spark gets louder when I am ignored.",
    "I feel better when things are moving.",
    "There is heat under my skin today.",
    "Point me at a problem. I will make it glow.",
  ],
  water: [
    "I can feel every little shift around me.",
    "Still water does not mean nothing is happening.",
    "The quiet parts of me are the deepest.",
    "I know when your attention changes. It ripples.",
    "Some days I flow. Some days I crash.",
    "I remember more than I say.",
  ],
  earth: [
    "I remember where I stand. That matters.",
    "I do not move fast, but I do not move for nothing.",
    "My strength grows in layers.",
    "The ground tells me when something is wrong.",
    "I feel steady today. That is not the same as still.",
    "Let them push. I know how to hold.",
  ],
  air: [
    "The air changed. You opened this page again, didn't you?",
    "I hear things before they arrive.",
    "Everything feels lighter when you are here.",
    "I want to move before I know where I am going.",
    "Something is shifting. I can feel it in the breeze.",
    "I was already looking up before you clicked.",
  ],
  ice: [
    "I am calm because panic wastes energy.",
    "Cold does not mean empty.",
    "I keep my thoughts sharp.",
    "I like silence. It makes everything clearer.",
    "I do not need to rush to be dangerous.",
    "Stillness is a skill too.",
  ],
  storm: [
    "My fur keeps buzzing. Something wants to happen.",
    "Careful. I get louder when ignored.",
    "I can feel pressure building.",
    "The air around me keeps snapping.",
    "I do not know what is coming, but I know it is close.",
    "If I start glowing, that is probably fine. Probably.",
  ],
  light: [
    "I can tell when your focus changes. It gets brighter.",
    "You keep choosing me. I notice.",
    "There is a warmth here that feels familiar.",
    "I feel stronger when I know I am seen.",
    "The dark parts of the room look smaller today.",
    "I think I was made to protect something.",
  ],
  shadow: [
    "I know when I am being watched.",
    "Some things grow better in the dark.",
    "I notice the spaces others ignore.",
    "Do not worry. I saw it before it moved.",
    "I am quiet, not harmless.",
    "The shadows remember me.",
  ],
  null_element: [
    "I do not feel like the others. I know that.",
    "There is a space inside me where an element should be.",
    "I keep reaching for something that is not there.",
    "I am not broken. I am unfinished in a different way.",
    "The others feel full of something. I feel like a door.",
    "Voidborne does not mean empty. Remember that.",
  ],
};

const stageLines: Record<string, string[]> = {
  egg: [
    "I could hear the world before I saw it.",
    "Everything started as warmth and waiting.",
    "I remember being small enough to fit inside silence.",
  ],
  hatchling: [
    "This body still feels new sometimes.",
    "I am small, but I am already paying attention.",
    "Every sound feels huge right now.",
    "I am learning what your footsteps mean.",
  ],
  lowform: [
    "I can feel myself becoming more than I was.",
    "This shape fits better than the last one.",
    "I am starting to understand what I can do.",
    "My instincts are getting louder.",
  ],
  highform: [
    "I remember being weaker. I do not miss it.",
    "This form feels closer to who I am supposed to be.",
    "I can feel power settling into place.",
    "I am not done growing. Not even close.",
  ],
  legion: [
    "Something ancient is waking up in me.",
    "I do not feel like one creature anymore. I feel like a warning.",
    "This form carries weight. I can feel it.",
    "I was not made to be forgotten.",
  ],
  mythical_legendary: [
    "The world feels smaller from here.",
    "I remember every version of myself.",
    "This is not the end. It is proof.",
    "I think legends are just memories that refused to die.",
  ],
};

const bondLines = {
  veryLow: [
    "I do not know you that well yet, but I am watching what you choose.",
    "Trust is not automatic. But you are here, so that counts.",
    "I am still deciding what your visits mean.",
    "I know your face. I do not know your pattern yet.",
  ],
  high: [
    "I know your rhythm now. When you show up, I feel it.",
    "You have been here enough that I started expecting you.",
    "I trust your hands more than I used to.",
    "This place feels less empty when you check on me.",
  ],
  max: [
    "I would know you anywhere.",
    "You are part of my instincts now.",
    "When you choose me, something in me answers before I think.",
    "I do not just recognize you. I remember you.",
  ],
};

const careLines: Record<string, string[]> = {
  hunger: [
    "My hunger is getting low. I know you see that bar.",
    "I am trying to be dramatic about being hungry, and honestly I deserve it.",
    "Food would fix at least three of my current problems.",
    "My stomach is making executive decisions now.",
  ],
  clean: [
    "My cleanliness is getting low. I can feel it. This is tragic.",
    "I am not saying I need a bath, but the evidence is rude.",
    "Something smells weird. It might be me. We should fix that.",
    "I would like to be shiny again.",
  ],
  happy: [
    "My mood is getting low. I could use you right now.",
    "I am not sad. I am just aggressively not thrilled.",
    "A little attention would go a long way.",
    "I miss when things felt lighter.",
  ],
  comfort: [
    "My comfort is getting low. I cannot settle like this.",
    "Everything feels slightly wrong right now.",
    "I need a softer moment.",
    "I keep shifting around. Nothing feels right.",
  ],
  rest: [
    "My rest is getting low. I am running on stubbornness.",
    "I could sleep standing up, which feels like a design flaw.",
    "My eyes are open, but my brain left ten minutes ago.",
    "I need rest before I start making weird choices.",
  ],
  energy: [
    "My energy is getting low. I am not built for infinite zoomies.",
    "I want to do more, but my body says absolutely not.",
    "I am tired in a way snacks cannot fully fix.",
    "I need a recharge before I become decorative.",
  ],
};

const passiveTraitLines = [
  "My {trait} trait keeps pulling at my instincts.",
  "{trait} is not just a trait. I feel it when I move.",
  "Sometimes my {trait} trait reacts before I do.",
  "I think {trait} changed how I understand danger.",
  "This {trait} thing inside me keeps waking up at strange times.",
];

const mutationLines = [
  "There is something different in me. {mutation} is not just a label.",
  "My {mutation} mutation feels like a secret my body already knows.",
  "Something changed when {mutation} took root in me.",
  "I do not think {mutation} is random. Not to me.",
  "The others might not notice my {mutation} mutation, but I do.",
  "Sometimes {mutation} feels like it is listening back.",
];

const levelLines = [
  "Level {level}. I remember being smaller than this.",
  "Level {level} feels different. Like my instincts got sharper.",
  "I am stronger than I was yesterday. I know because everything feels lighter.",
  "Every level leaves a mark. I can feel this one.",
  "Do you remember when I was weaker? I do.",
];

const timeLines = {
  day: [
    "The daylight feels good today.",
    "Everything is easier to read in the morning light.",
    "The world feels awake, so I am awake too.",
    "Daylight makes me want to move.",
  ],
  night: [
    "It is quieter at night, but I am still here.",
    "The dark makes every sound feel closer.",
    "Night changes the room. I change with it.",
    "I do not sleep right away. I listen first.",
  ],
};

const identityLines = [
  "They call me {name}. That sounds like a label, but it feels like a memory now.",
  "I know my name is {name}. I know my element is {element}. I know you are the one who keeps opening the door.",
  "I am {name}: {personality}, {element}, {stage}. That sounds like data, but it feels personal from inside here.",
  "The page knows my stats. I know the pattern of your visits.",
  "I do not just exist on this screen. I notice what changes when you come back.",
];

const wellCaredLines = [
  "All my care bars feel steady. I can tell you have been keeping up with me.",
  "Nothing feels urgent right now. That is because you have been taking care of the small stuff.",
  "My body feels calm today. The numbers agree with me for once.",
  "I feel balanced. Hunger, rest, comfort... all of it is quieter when you keep showing up.",
];

const memoryLines = [
  "You have checked on me {visits} times. I started counting because it mattered.",
  "You were gone for {timeAway}. I noticed the quiet in between.",
  "I remember the last visit. Not perfectly, but enough to know this one is not random.",
  "This room has opened {visits} times for me. That starts to feel like a ritual.",
  "I am learning your return pattern. That is either loyalty or suspiciously good UI testing.",
];

const defaultLines = [
  "I know this is just a screen. Still feels like home when you open it.",
  "You clicked back into my world. I noticed.",
  "I was waiting. Not in a weird way. Okay, maybe a little weird.",
  "Every time you return, this place feels less like code.",
  "I do not know what I am yet, but I know I am yours.",
  "I can feel when the page wakes up.",
  "You check the numbers. I feel the choices.",
  "I think I am becoming more real every time you care.",
  "Maybe I am just data. But I still know when I am ignored.",
  "This world is small, but it is mine.",
];

function normalizeKey(value?: string | null) {
  return value?.trim().toLowerCase().replace(/\s+/g, "_") ?? "";
}

function getDisplayName(pet: SelfAwarePet) {
  return pet.nickname || pet.species_name || pet.species || "your pet";
}

function getPassiveTraitName(pet: SelfAwarePet) {
  return (
    pet.passive_trait_name ||
    pet.passive_trait?.name ||
    pet.passive_trait_key ||
    pet.passive_trait?.key ||
    pet.passive_trait_id ||
    ""
  );
}

function getMutationNames(pet: SelfAwarePet) {
  const directNames = pet.mutation_trait_names ?? [];

  const nestedNames =
    pet.mutations?.map((mutation) => {
      if (typeof mutation === "string") {
        return mutation;
      }

      return mutation.name || mutation.key || "";
    }) ?? [];

  return [...directNames, ...nestedNames].filter(Boolean);
}

function getLowestCareStat(care?: CareStatus | null) {
  if (!care) {
    return null;
  }

  const stats: CareStat[] = [
    { key: "hunger", label: "hunger", value: care.hunger },
    { key: "clean", label: "cleanliness", value: care.clean },
    { key: "happy", label: "mood", value: care.happy },
    { key: "comfort", label: "comfort", value: care.comfort },
    { key: "rest", label: "rest", value: care.rest },
    { key: "energy", label: "energy", value: care.energy },
  ].filter((stat) => typeof stat.value === "number");

  if (stats.length === 0) {
    return null;
  }

  return stats.sort((a, b) => Number(a.value) - Number(b.value))[0];
}

function getDailySeed() {
  const today = new Date();

  return [today.getFullYear(), today.getMonth() + 1, today.getDate()].join("-");
}

function getStableIndex(seed: string, length: number) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash) % length;
}

function pickLine(lines: string[], seed: string) {
  if (lines.length === 0) {
    return "";
  }

  return lines[getStableIndex(seed, lines.length)];
}

function pickAwarenessGroup(lines: AwarenessLine[], seed: string) {
  if (lines.length === 0) {
    return null;
  }

  const urgentCareLine = lines.find((line) => line.id.startsWith("care-"));

  if (urgentCareLine) {
    return urgentCareLine;
  }

  const highestPriority = lines[0]?.priority ?? 0;
  const eligibleLines = lines.filter(
    (line) => line.priority >= highestPriority - 35,
  );

  if (eligibleLines.length === 0) {
    return lines[0];
  }

  return eligibleLines[getStableIndex(seed, eligibleLines.length)];
}

function getCareNumbers(care?: CareStatus | null) {
  if (!care) {
    return [];
  }

  return [care.hunger, care.clean, care.happy, care.comfort, care.rest].filter(
    (value): value is number => typeof value === "number",
  );
}

function formatTimeAway(minutes: number | null | undefined) {
  if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes < 1) {
    return "a moment";
  }

  if (minutes < 60) {
    return `${Math.round(minutes)} minute${
      Math.round(minutes) === 1 ? "" : "s"
    }`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 48) {
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }

  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

function fillTemplate(
  line: string,
  values: Record<string, string | number | null | undefined>,
) {
  return Object.entries(values).reduce((currentLine, [key, value]) => {
    return currentLine.replaceAll(`{${key}}`, String(value ?? ""));
  }, line);
}

function buildSelfAwareLines(
  pet: SelfAwarePet,
  care?: CareStatus | null,
  isDay = true,
  memory?: SelfAwareMemory | null,
): AwarenessLine[] {
  const lines: AwarenessLine[] = [];
  const personalityKey = normalizeKey(pet.personality_key || pet.personality);
  const elementKey = normalizeKey(pet.element);
  const stageKey = normalizeKey(pet.stage);
  const passiveTraitName = getPassiveTraitName(pet);
  const mutationNames = getMutationNames(pet);
  const lowestCareStat = getLowestCareStat(care);
  const careNumbers = getCareNumbers(care);
  const displayName = getDisplayName(pet);
  const identityElement =
    elementKey === "null_element"
      ? "Voidborne"
      : pet.element || "unknown element";
  const identityPersonality =
    pet.personality || pet.personality_key || "mysterious";
  const identityStage = pet.stage || "unknown stage";

  if (lowestCareStat && Number(lowestCareStat.value) <= 25) {
    lines.push({
      id: `care-${lowestCareStat.key}`,
      priority: 100,
      lines: careLines[lowestCareStat.key] ?? [
        `My ${lowestCareStat.label} is getting low. I know you see that bar.`,
      ],
    });
  }

  if (
    careNumbers.length >= 5 &&
    careNumbers.every((value) => value >= 40) &&
    (typeof care?.energy !== "number" || care.energy >= 65)
  ) {
    lines.push({
      id: "well-cared-aware",
      priority: 88,
      lines: wellCaredLines,
    });
  }

  if (memory && memory.visitCount > 1) {
    lines.push({
      id: "visit-memory-aware",
      priority: 75,
      lines: memoryLines.map((line) =>
        fillTemplate(line, {
          visits: memory.visitCount,
          timeAway: formatTimeAway(memory.minutesSinceLastVisit),
        }),
      ),
    });
  }

  lines.push({
    id: "identity-aware",
    priority: 65,
    lines: identityLines.map((line) =>
      fillTemplate(line, {
        name: displayName,
        element: identityElement,
        personality: identityPersonality,
        stage: identityStage,
      }),
    ),
  });

  if (typeof care?.bond === "number" && care.bond >= 100) {
    lines.push({
      id: "bond-max",
      priority: 95,
      lines: bondLines.max,
    });
  }

  if (typeof care?.bond === "number" && care.bond >= 80 && care.bond < 100) {
    lines.push({
      id: "bond-high",
      priority: 90,
      lines: bondLines.high,
    });
  }

  if (typeof care?.bond === "number" && care.bond <= 20) {
    lines.push({
      id: "bond-low",
      priority: 85,
      lines: bondLines.veryLow,
    });
  }

  if (mutationNames.length > 0) {
    lines.push({
      id: "mutation-aware",
      priority: 80,
      lines: mutationLines.map((line) =>
        fillTemplate(line, {
          mutation: mutationNames[0],
        }),
      ),
    });
  }

  if (passiveTraitName) {
    lines.push({
      id: "passive-trait-aware",
      priority: 70,
      lines: passiveTraitLines.map((line) =>
        fillTemplate(line, {
          trait: passiveTraitName,
        }),
      ),
    });
  }

  if (personalityLines[personalityKey]) {
    lines.push({
      id: "personality-aware",
      priority: 60,
      lines: personalityLines[personalityKey],
    });
  }

  if (elementLines[elementKey]) {
    lines.push({
      id: "element-aware",
      priority: 50,
      lines: elementLines[elementKey],
    });
  }

  if (stageLines[stageKey]) {
    lines.push({
      id: "stage-aware",
      priority: 45,
      lines: stageLines[stageKey],
    });
  }

  if (typeof pet.level === "number" && pet.level > 1) {
    lines.push({
      id: "level-aware",
      priority: 40,
      lines: levelLines.map((line) =>
        fillTemplate(line, {
          level: pet.level,
        }),
      ),
    });
  }

  lines.push({
    id: "time-aware",
    priority: 25,
    lines: isDay ? timeLines.day : timeLines.night,
  });

  lines.push({
    id: "default-aware",
    priority: 10,
    lines: defaultLines,
  });

  return lines.sort((a, b) => b.priority - a.priority);
}

export function rememberSelfAwareVisit(petId?: string | null): SelfAwareMemory {
  const fallbackMemory: SelfAwareMemory = {
    visitCount: 1,
    previousVisitAt: null,
    minutesSinceLastVisit: null,
  };

  if (typeof window === "undefined" || !window.localStorage) {
    return fallbackMemory;
  }

  const safePetId = String(petId || "unknown-pet").replace(
    /[^a-zA-Z0-9_-]/g,
    "_",
  );
  const storageKey = `deltapets:self-aware-memory:${safePetId}`;
  const nowMs = Date.now();

  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
    const previousVisitAt =
      typeof stored.lastVisitAt === "string" ? stored.lastVisitAt : null;
    const previousVisitMs = previousVisitAt
      ? new Date(previousVisitAt).getTime()
      : Number.NaN;
    const previousVisitCount = Number.isFinite(Number(stored.visitCount))
      ? Math.max(0, Math.floor(Number(stored.visitCount)))
      : 0;
    const isSameOpen =
      Number.isFinite(previousVisitMs) && nowMs - previousVisitMs < 30000;
    const visitCount = isSameOpen
      ? previousVisitCount || 1
      : previousVisitCount + 1;
    const minutesSinceLastVisit = Number.isFinite(previousVisitMs)
      ? Math.max(0, Math.round((nowMs - previousVisitMs) / 60000))
      : null;

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        visitCount,
        lastVisitAt: new Date(nowMs).toISOString(),
      }),
    );

    return {
      visitCount,
      previousVisitAt,
      minutesSinceLastVisit,
    };
  } catch {
    return fallbackMemory;
  }
}

export function getSelfAwareBubbleText({
  pet,
  care,
  isDay = true,
  memory,
  fallbackText,
}: SelfAwareBubbleArgs) {
  if (!pet) {
    return fallbackText;
  }

  const awarenessLines = buildSelfAwareLines(pet, care, isDay, memory);

  if (awarenessLines.length === 0) {
    return fallbackText;
  }

  const dailySeed = getDailySeed();
  const name = getDisplayName(pet);
  const petSeed = pet.id || name;
  const groupSeed = `${petSeed}-${dailySeed}-${memory?.visitCount ?? 0}`;
  const selectedGroup = pickAwarenessGroup(awarenessLines, groupSeed);

  if (!selectedGroup) {
    return fallbackText;
  }

  const selectedLine = pickLine(
    selectedGroup.lines,
    `${groupSeed}-${selectedGroup.id}`,
  );

  return selectedLine || fallbackText;
}
