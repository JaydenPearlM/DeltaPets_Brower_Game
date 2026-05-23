export type PetCareAction =
  | "feed"
  | "clean"
  | "play"
  | "comfort"
  | "rest"
  | null;

type CareNeed = "hunger" | "clean" | "happy" | "comfort" | "rest" | "energy";
type PersonalityMood = "positive" | "neutral" | "negative";
type PersonalityVoice =
  | "soft"
  | "bold"
  | "playful"
  | "calm"
  | "proud"
  | "curious"
  | "loyal"
  | "chaotic"
  | "gloomy"
  | "greedy"
  | "feral"
  | "stern";

type PersonalityProfile = {
  mood: PersonalityMood;
  voice: PersonalityVoice;
};

type DialogueInput = {
  petName: string;
  personalityKey?: string | null;
  hunger: number;
  clean: number;
  happy: number;
  comfort: number;
  rest: number;
  energy: number;
  bond: number;
  lastAction?: PetCareAction;
};

const LOW_STAT_LIMIT = 25;
const MID_STAT_LIMIT = 36;
const HIGH_BOND_LIMIT = 70;

const personalityProfiles: Record<string, PersonalityProfile> = {
  friendly: { mood: "positive", voice: "soft" },
  respectful: { mood: "positive", voice: "stern" },
  reasonable: { mood: "positive", voice: "calm" },
  loyalist: { mood: "positive", voice: "loyal" },
  scholar: { mood: "positive", voice: "curious" },
  radiant: { mood: "positive", voice: "soft" },
  guardian: { mood: "positive", voice: "loyal" },
  brightspark: { mood: "positive", voice: "curious" },
  humble: { mood: "positive", voice: "soft" },
  honest: { mood: "positive", voice: "stern" },
  optimistic: { mood: "positive", voice: "playful" },
  diligent: { mood: "positive", voice: "stern" },
  generous: { mood: "positive", voice: "soft" },
  gentle: { mood: "positive", voice: "soft" },
  loyal: { mood: "positive", voice: "loyal" },
  brave: { mood: "positive", voice: "bold" },
  kind: { mood: "positive", voice: "soft" },

  cowardly: { mood: "neutral", voice: "soft" },
  sprinter: { mood: "neutral", voice: "bold" },
  anxious: { mood: "neutral", voice: "soft" },
  wildheart: { mood: "neutral", voice: "feral" },
  naive: { mood: "neutral", voice: "curious" },
  dreamer: { mood: "neutral", voice: "gloomy" },
  stoic: { mood: "neutral", voice: "calm" },
  drifter: { mood: "neutral", voice: "calm" },
  lazy: { mood: "neutral", voice: "calm" },
  tinker: { mood: "neutral", voice: "curious" },
  impulsive: { mood: "neutral", voice: "chaotic" },
  royal: { mood: "neutral", voice: "proud" },

  gremlin: { mood: "negative", voice: "chaotic" },
  prankster: { mood: "negative", voice: "chaotic" },
  shadowed: { mood: "negative", voice: "gloomy" },
  glutton: { mood: "negative", voice: "greedy" },
  snob: { mood: "negative", voice: "proud" },
  greedy: { mood: "negative", voice: "greedy" },
  vengeful: { mood: "negative", voice: "stern" },
  feral: { mood: "negative", voice: "feral" },
  deceiver: { mood: "negative", voice: "chaotic" },
  blazeborn: { mood: "negative", voice: "bold" },
  cruel: { mood: "negative", voice: "stern" },
  arrogant: { mood: "negative", voice: "proud" },
  pessimistic: { mood: "negative", voice: "gloomy" },
};

const personalityIdleLines: Record<
  string,
  { low: string[]; mid: string[]; high: string[] }
> = {
  friendly: {
    low: ["I am happy you checked on me.", "You came back. I like that."],
    mid: [
      "This room feels nicer when you are here.",
      "I think we are getting pretty good at this.",
    ],
    high: [
      "You always make this place feel safe.",
      "I missed you a little. Okay, a lot.",
    ],
  },
  gremlin: {
    low: [
      "I did not touch anything. The shelf moved itself.",
      "No crimes today. Probably.",
    ],
    mid: [
      "I only rearranged one thing. For art.",
      "You are fun to annoy. That is a compliment.",
    ],
    high: [
      "I saved my best chaos for you.",
      "I was good today. Mostly. Be proud.",
    ],
  },
  respectful: {
    low: [
      "I am maintaining proper care standards.",
      "Your attention is noted.",
    ],
    mid: ["Your routine is improving. Good.", "I appreciate steady care."],
    high: [
      "You have earned my full respect.",
      "I trust your judgment, caretaker.",
    ],
  },
  cowardly: {
    low: [
      "Is it safe in here?",
      "I heard a sound. It was probably nothing. Probably.",
    ],
    mid: [
      "I feel safer when you are nearby.",
      "Maybe I can be brave for a little bit.",
    ],
    high: [
      "I am still scared, but I will stand with you.",
      "With you here, I can try.",
    ],
  },
  sprinter: {
    low: [
      "I need to move. Standing still is illegal.",
      "Can we do something fast?",
    ],
    mid: ["I am ready to bolt whenever you are.", "My legs have opinions."],
    high: [
      "Point me forward and I will handle the rest.",
      "I would race the stars for you.",
    ],
  },
  reasonable: {
    low: ["Everything seems manageable.", "A balanced routine would help."],
    mid: ["This care plan is working.", "Steady choices are paying off."],
    high: ["We make a reliable team.", "I trust the rhythm we built."],
  },
  loyalist: {
    low: ["I am staying close.", "I do better with consistency."],
    mid: ["I know your routine now.", "I will be here when you return."],
    high: [
      "I am yours to protect, and you are mine.",
      "I will follow you anywhere.",
    ],
  },
  scholar: {
    low: [
      "I am observing the shelf geometry.",
      "There is a pattern in this room.",
    ],
    mid: [
      "Care increases stability. Interesting.",
      "I am learning your habits.",
    ],
    high: [
      "Our bond is a fascinating system.",
      "I have studied you. I trust you.",
    ],
  },
  radiant: {
    low: ["Today still has a little shine.", "I can feel the room glowing."],
    mid: ["You brought good energy with you.", "I feel bright around you."],
    high: ["You make my light stronger.", "This bond feels warm as starlight."],
  },
  guardian: {
    low: ["I am keeping watch.", "Nothing gets near us without my say."],
    mid: ["You care for me. I guard you. Fair trade.", "This room is secure."],
    high: ["I would shield you first, always.", "Your safety matters to me."],
  },
  anxious: {
    low: ["Could you stay a second?", "I am trying not to overthink."],
    mid: ["Your routine helps calm me down.", "I feel less shaky today."],
    high: [
      "I breathe easier when you are here.",
      "You make the noise feel quieter.",
    ],
  },
  wildheart: {
    low: ["The walls feel too still today.", "I smell outside air in my head."],
    mid: [
      "I like this room more when it changes.",
      "You understand my wild edges.",
    ],
    high: [
      "I could run anywhere, but I came back to you.",
      "You feel like home without being a cage.",
    ],
  },
  naive: {
    low: ["Is the sparkle friendly?", "I trust this room. Should I?"],
    mid: [
      "I learned that food goes in me. Great system.",
      "You explain things nicely.",
    ],
    high: [
      "I trust you with the scary stuff.",
      "You keep me safe when I miss things.",
    ],
  },
  brightspark: {
    low: ["Did you see that shimmer?", "I want to discover something new."],
    mid: [
      "This room has ideas. I can tell.",
      "Let us experiment carefully. Maybe.",
    ],
    high: [
      "You make every discovery better.",
      "I found something rare. It is us.",
    ],
  },
  prankster: {
    low: [
      "I did not hide anything important.",
      "That weird noise was not me. Maybe.",
    ],
    mid: [
      "You laughed. I count that as success.",
      "I promise the next prank is educational.",
    ],
    high: [
      "I only prank my favorite person.",
      "You make trouble feel like home.",
    ],
  },
  humble: {
    low: ["I do not need much.", "Thank you for noticing me."],
    mid: ["This care is more than enough.", "I am quietly happy."],
    high: [
      "You make me feel important.",
      "I am grateful every time you return.",
    ],
  },
  honest: {
    low: [
      "I am doing okay, but I could be better.",
      "I will tell you if something is wrong.",
    ],
    mid: ["You have been reliable. That matters.", "Truthfully, I like this."],
    high: [
      "I trust you. No exaggeration.",
      "Honestly, you are my favorite person.",
    ],
  },
  shadowed: {
    low: ["I am here. That counts.", "The quiet is heavy today."],
    mid: ["You make the silence less sharp.", "I noticed you came back."],
    high: [
      "The dark feels smaller with you here.",
      "I do not say this often, but stay.",
    ],
  },
  optimistic: {
    low: [
      "Today can still be good!",
      "I believe snacks may improve everything.",
    ],
    mid: ["We are doing better than yesterday.", "I knew this would work out."],
    high: [
      "With you here, I feel unstoppable.",
      "We are absolutely winning at this.",
    ],
  },
  drifter: {
    low: ["I am fine on my own. Mostly.", "No need to fuss over me."],
    mid: ["I got used to you being around.", "You are not bad company."],
    high: [
      "I could leave, but I do not want to.",
      "You became my place to return to.",
    ],
  },
  diligent: {
    low: ["Routine check complete.", "Care schedule acknowledged."],
    mid: ["Your consistency is effective.", "I respond well to structure."],
    high: [
      "We have built something dependable.",
      "I am proud of our progress.",
    ],
  },
  glutton: {
    low: ["I am thinking about food again.", "The hunger drain is real."],
    mid: [
      "Care is good. Snacks are better.",
      "You understand the snack economy.",
    ],
    high: [
      "You feed my heart. Also my stomach.",
      "I love you almost as much as food.",
    ],
  },
  dreamer: {
    low: ["I saw a star blink backwards.", "My thoughts are floating today."],
    mid: [
      "I dreamed this room had wings.",
      "You keep me from drifting too far.",
    ],
    high: [
      "When I dream, you are there now.",
      "You feel real in all my weird skies.",
    ],
  },
  stoic: {
    low: ["I am steady.", "No concern required."],
    mid: ["Your care is effective.", "I am calmer than before."],
    high: ["I rely on you. Quietly.", "You have my trust."],
  },
  snob: {
    low: ["This room could use refinement.", "I require quality attention."],
    mid: ["Your care is improving. Finally.", "Acceptable. Nearly impressive."],
    high: ["You meet my standards. Rare.", "I suppose you are exceptional."],
  },
  generous: {
    low: ["I hope you are cared for too.", "You give a lot. I noticed."],
    mid: ["I want to share this warmth.", "Your kindness comes back around."],
    high: [
      "You give me so much. I want to protect it.",
      "My heart feels full around you.",
    ],
  },
  greedy: {
    low: ["I want more. Obviously.", "Rewards motivate me."],
    mid: [
      "You give good things. Keep doing that.",
      "More care means more loyalty. Simple.",
    ],
    high: [
      "I wanted everything, then somehow wanted you most.",
      "Fine. You are my favorite treasure.",
    ],
  },
  lazy: {
    low: ["Can caring happen while I lie down?", "Low effort sounds perfect."],
    mid: [
      "This is comfortable. Keep it that way.",
      "I support naps as a lifestyle.",
    ],
    high: ["You make rest feel safe.", "I would get up for you. Slowly."],
  },
  tinker: {
    low: [
      "The shelf system needs upgrades.",
      "I have thoughts about this room.",
    ],
    mid: [
      "If I had tools, this would glow more.",
      "Inventory interactions excite me.",
    ],
    high: [
      "Let us build something impossible together.",
      "You are my favorite project partner.",
    ],
  },
  vengeful: {
    low: ["I remember neglect.", "I do not forgive quickly."],
    mid: [
      "You are making repairs. Continue.",
      "I am still watching, but less angrily.",
    ],
    high: ["I remember kindness too.", "You changed the story I was keeping."],
  },
  feral: {
    low: ["Do not corner me.", "I am watching everything."],
    mid: ["You move safely. I noticed.", "I do not hate this room."],
    high: [
      "I am still wild, but I choose you.",
      "My claws rest when you are near.",
    ],
  },
  deceiver: {
    low: [
      "Everything is fine. Obviously. Maybe.",
      "Trust me. Or do not. Interesting either way.",
    ],
    mid: ["I tell fewer lies around you.", "You are annoyingly hard to trick."],
    high: [
      "I could lie, but you would know.",
      "Truth feels less dangerous with you.",
    ],
  },
  blazeborn: {
    low: ["Give me a challenge.", "I do not do boring."],
    mid: [
      "You keep up better than most.",
      "I want action, but this care works.",
    ],
    high: ["I would burn through danger for you.", "You earned my fire."],
  },
  cruel: {
    low: [
      "Do not expect sweetness from me.",
      "Careful. I bite feelings first.",
    ],
    mid: [
      "That was not awful. Do not celebrate.",
      "I did not even want attention, but it helped.",
    ],
    high: [
      "I did not want to trust you. Then you kept showing up.",
      "I was ready to hate this. I had fun instead.",
    ],
  },
  arrogant: {
    low: ["You may admire me now.", "I expect proper respect."],
    mid: [
      "Your care suits someone of my caliber.",
      "You are learning my standards.",
    ],
    high: [
      "I chose well when I tolerated you.",
      "You are worthy of standing beside me.",
    ],
  },
  gentle: {
    low: ["Soft care is nice.", "I like peaceful moments."],
    mid: ["This room feels safe today.", "Thank you for being kind."],
    high: ["Your kindness lives in me now.", "I feel loved here."],
  },
  pessimistic: {
    low: [
      "Something will probably go wrong.",
      "I am not convinced this helps.",
    ],
    mid: ["This is less bad than expected.", "Maybe today will not collapse."],
    high: [
      "You keep proving my worst thoughts wrong.",
      "I expected disappointment. I found you.",
    ],
  },
  loyal: {
    low: ["I am watching for your return.", "I stay where trust can grow."],
    mid: ["You have my attention.", "I am beginning to count on you."],
    high: ["My loyalty is yours.", "I will always come back to you."],
  },
  impulsive: {
    low: [
      "Can we do the thing now?",
      "I have decided. No, I will not explain.",
    ],
    mid: [
      "You slow me down in a good way.",
      "I almost thought first. Progress.",
    ],
    high: [
      "I still leap first, but I look for you after.",
      "You are my favorite bad idea.",
    ],
  },
  royal: {
    low: ["Attend me properly.", "My standards are not suggestions."],
    mid: ["Your service has improved.", "This chamber is nearly suitable."],
    high: ["You are my chosen companion.", "I grant you my full favor."],
  },
  brave: {
    low: ["I can face it.", "Point me toward the threat."],
    mid: ["Your care sharpens my courage.", "I feel ready beside you."],
    high: [
      "I would stand between you and anything.",
      "Together, I am fearless.",
    ],
  },
  kind: {
    low: ["I am glad you are here.", "I hope you are having a good day too."],
    mid: ["You make me want to be even softer.", "This care feels good."],
    high: ["My heart knows you.", "You are safe with me too."],
  },
};

function pick(lines: string[]) {
  return lines[Math.floor(Math.random() * lines.length)];
}

function normalizePersonality(key?: string | null) {
  return String(key || "friendly")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function getProfile(personalityKey?: string | null): PersonalityProfile {
  return (
    personalityProfiles[normalizePersonality(personalityKey)] || {
      mood: "neutral",
      voice: "calm",
    }
  );
}

function getBondSoftener(bond: number) {
  return bond >= HIGH_BOND_LIMIT;
}

function getBondTier(bond: number): "low" | "mid" | "high" {
  if (bond >= 70) return "high";
  if (bond >= 35) return "mid";
  return "low";
}

function getLowestNeed(options: DialogueInput) {
  const needs: Array<{ key: CareNeed; value: number }> = [
    { key: "hunger", value: options.hunger },
    { key: "clean", value: options.clean },
    { key: "happy", value: options.happy },
    { key: "comfort", value: options.comfort },
    { key: "rest", value: options.rest },
    { key: "energy", value: options.energy },
  ];

  return needs.sort((a, b) => a.value - b.value)[0];
}

function getNeedLine(
  need: CareNeed,
  profile: PersonalityProfile,
  softened: boolean,
) {
  const kind =
    softened && profile.mood === "negative" ? "neutral" : profile.mood;

  const lines: Record<PersonalityMood, Record<CareNeed, string[]>> = {
    positive: {
      hunger: [
        "Could we grab a snack soon?",
        "My tummy is asking nicely for food.",
        "I am trying to be polite, but food sounds amazing.",
      ],
      clean: [
        "A quick clean would feel amazing.",
        "I want to sparkle again.",
        "The care room feels dusty around me.",
      ],
      happy: [
        "Can we play for a bit?",
        "I could use a little fun today.",
        "I want to do something with you.",
      ],
      comfort: [
        "Can you stay close for a moment?",
        "A little comfort would help me.",
        "I feel better when you are nearby.",
      ],
      rest: [
        "I think I need a cozy nap.",
        "My eyes are getting heavy.",
        "Quiet time sounds really nice.",
      ],
      energy: [
        "I need to take it slow for a bit.",
        "My energy feels low today.",
        "I am running on tiny sparks.",
      ],
    },
    neutral: {
      hunger: [
        "Food would help right now.",
        "I am running low on snacks.",
        "My stomach is making decisions for me.",
      ],
      clean: [
        "I need a clean soon.",
        "This mess is starting to bother me.",
        "Clean care would stabilize things.",
      ],
      happy: [
        "I am getting bored.",
        "Playtime would help.",
        "Some attention would improve my mood.",
      ],
      comfort: [
        "Stay nearby for a second.",
        "I need a little comfort.",
        "The room feels better when you check in.",
      ],
      rest: [
        "I need rest.",
        "A nap would fix this.",
        "My body is asking for quiet.",
      ],
      energy: [
        "My energy is low.",
        "I need a slower pace.",
        "I am not ready to move much.",
      ],
    },
    negative: {
      hunger: [
        "Food. Now would be smart.",
        "I am hungry, and you noticed late.",
        "Feed me before I start judging harder.",
      ],
      clean: [
        "I feel gross. Fix it.",
        "This is beneath me. Clean me.",
        "I refuse to sparkle under these conditions.",
      ],
      happy: [
        "I am bored. Impress me.",
        "Play with me before I start plotting.",
        "I require entertainment. Try not to fail.",
      ],
      comfort: [
        "I need comfort. Do not make it weird.",
        "Stay close. I did not say I liked it.",
        "This room feels wrong. Be useful.",
      ],
      rest: [
        "I need sleep before I become everyone's problem.",
        "Nap time. Obviously.",
        "I am one bad minute away from menace mode.",
      ],
      energy: [
        "I am drained. Try keeping up later.",
        "My energy is gone. Tragic.",
        "Even my attitude needs a recharge.",
      ],
    },
  };

  return pick(lines[kind][need]);
}

function getActionLine(
  action: Exclude<PetCareAction, null>,
  profile: PersonalityProfile,
  softened: boolean,
) {
  const kind =
    softened && profile.mood === "negative" ? "neutral" : profile.mood;

  const lines: Record<
    Exclude<PetCareAction, null>,
    Record<PersonalityMood, string[]>
  > = {
    feed: {
      positive: [
        "Thank you, that tasted great!",
        "My tummy feels much better now.",
        "Snack secured. Happiness rising.",
      ],
      neutral: [
        "Good. Food helped.",
        "That snack did the job.",
        "Fuel restored.",
      ],
      negative: [
        "Finally. I was fading over here.",
        "Acceptable snack tribute.",
        "I will allow this offering.",
      ],
    },
    clean: {
      positive: [
        "I feel fresh again!",
        "Sparkly mode activated.",
        "That feels so much better.",
      ],
      neutral: [
        "Clean feels better.",
        "That helped more than I expected.",
        "Better. The mess was getting annoying.",
      ],
      negative: [
        "Fine. I needed that.",
        "I am less gross now. Congratulations.",
        "Acceptable. Do not make me ask twice next time.",
      ],
    },
    play: {
      positive: ["That was fun!", "Again sometime, please!", "I loved that!"],
      neutral: [
        "That was pretty good.",
        "Playtime helped.",
        "I needed that more than I thought.",
      ],
      negative: [
        "That was not terrible.",
        "I enjoyed nothing. Maybe a little.",
        "I did not even want to play, but I had fun.",
      ],
    },
    comfort: {
      positive: [
        "I feel safe with you.",
        "Thanks for staying close.",
        "That made the room feel warmer.",
      ],
      neutral: [
        "That comfort helped.",
        "I feel steadier now.",
        "Stay nearby a little longer.",
      ],
      negative: [
        "Do not tell anyone I liked that.",
        "That helped. Barely. Maybe.",
        "I did not ask for softness, but... thanks.",
      ],
    },
    rest: {
      positive: [
        "A cozy rest sounds perfect.",
        "I feel sleepy in a good way.",
        "Wake me if stars fall.",
      ],
      neutral: [
        "Rest is a good idea.",
        "I need the quiet.",
        "I will recharge for a bit.",
      ],
      negative: [
        "Good. Silence time.",
        "Nap time before I become a menace.",
        "I am resting because everyone else is exhausting.",
      ],
    },
  };

  return pick(lines[action][kind]);
}

function getIdleLine(
  petName: string,
  personalityKey: string | null | undefined,
  profile: PersonalityProfile,
  bond: number,
) {
  const normalized = normalizePersonality(personalityKey);
  const bondTier = getBondTier(bond);
  const personalityLines = personalityIdleLines[normalized];

  if (personalityLines) {
    return pick(personalityLines[bondTier]);
  }

  if (bond >= 85) {
    return pick([
      `I trust you, ${petName ? "you know" : "caretaker"}.`,
      "Being with you feels safe.",
      "I am glad you came back.",
      "This bond feels steady.",
    ]);
  }

  const lines: Record<PersonalityVoice, string[]> = {
    soft: [
      "I am happy you are here.",
      "This place feels gentle today.",
      "The room feels warmer when you check in.",
    ],
    bold: [
      "I am ready for whatever comes next.",
      "Point me at trouble.",
      "If something happens, I can handle it.",
    ],
    playful: [
      "I am just vibing in here!",
      "What are we doing next?",
      "I have tiny chaos energy today.",
    ],
    calm: [
      "Everything feels peaceful right now.",
      "I am doing okay.",
      "The room is quiet in a good way.",
    ],
    proud: [
      "Your finest Kith is present.",
      "I expect excellent care, obviously.",
      "My standards remain impressive.",
    ],
    curious: [
      "Did you notice that weird sparkle?",
      "I wonder what is outside today.",
      "This chamber has secrets. I know it.",
    ],
    loyal: [
      "I will stay close.",
      "I am glad you are here.",
      "I keep listening for your return.",
    ],
    chaotic: [
      "No crimes today. Probably.",
      "I touched nothing. Ignore the sparkle.",
      "The shelves look prankable. Hypothetically.",
    ],
    gloomy: [
      "It is quiet today.",
      "I am here. That counts.",
      "The room feels a little heavy, but I am okay.",
    ],
    greedy: [
      "I could always eat again.",
      "Snacks improve most situations.",
      "I am emotionally available for treats.",
    ],
    feral: [
      "The room smells different today.",
      "I am watching everything.",
      "The walls are calm, so I am calm. Mostly.",
    ],
    stern: [
      "I am ready when you are.",
      "The chamber is holding steady.",
      "No problems yet. Keep it that way.",
    ],
  };

  return pick(lines[profile.voice]);
}

export function getPetCareDialogue(options: DialogueInput): string {
  const profile = getProfile(options.personalityKey);
  const softened = getBondSoftener(options.bond);

  if (options.lastAction) {
    return getActionLine(options.lastAction, profile, softened);
  }

  const lowestNeed = getLowestNeed(options);

  if (lowestNeed.value <= LOW_STAT_LIMIT) {
    return getNeedLine(lowestNeed.key, profile, softened);
  }

  if (lowestNeed.value <= MID_STAT_LIMIT && Math.random() < 0.55) {
    return getNeedLine(lowestNeed.key, profile, softened);
  }

  return getIdleLine(
    options.petName,
    options.personalityKey,
    profile,
    options.bond,
  );
}

export function getPetDialogue(options: DialogueInput): string {
  return getPetCareDialogue(options);
}
