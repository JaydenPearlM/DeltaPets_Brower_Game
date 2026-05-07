export type SkillId =
  | "basic-strike"
  | "guard"
  | "mend"
  | "species-skill"
  | "lowform-skill"
  | "highform-skill"
  | "legion-skill"
  | "mythic-legendary-skill";

export type SkillTreeKey =
  | "combat"
  | "defense"
  | "magic"
  | "breeder"
  | "element"
  | "evolution";

export type PetSkill = {
  id: SkillId;
  name: string;
  tree: SkillTreeKey;
  description: string;
  sellable?: boolean;
};

export const CORE_SKILLS: PetSkill[] = [
  {
    id: "basic-strike",
    name: "Basic Strike",
    tree: "combat",
    description: "A simple starter attack.",
    sellable: false,
  },
  {
    id: "guard",
    name: "Guard",
    tree: "defense",
    description: "Brace to reduce incoming damage.",
    sellable: false,
  },
  {
    id: "mend",
    name: "Mend",
    tree: "magic",
    description: "Restores a small amount of health.",
    sellable: false,
  },
];

export const PROGRESSION_SKILLS: PetSkill[] = [
  {
    id: "species-skill",
    name: "Hatchling Skill",
    tree: "evolution",
    description:
      "A hatchling species skill that improves ATK or SPD based on the Kith species.",
    sellable: true,
  },

  {
    id: "lowform-skill",
    name: "Lowform Skill",
    tree: "evolution",
    description: "A focused technique unlocked after reaching Lowform.",
    sellable: true,
  },
  {
    id: "highform-skill",
    name: "Highform Skill",
    tree: "evolution",
    description: "A stronger technique unlocked after reaching Highform.",
    sellable: true,
  },
  {
    id: "legion-skill",
    name: "Legion Skill",
    tree: "evolution",
    description: "A powerful combat skill unlocked after reaching Legion.",
    sellable: true,
  },
  {
    id: "mythic-legendary-skill",
    name: "Mythical Legendary Skill",
    tree: "evolution",
    description: "A rare awakened technique unlocked at Mythical Legendary.",
    sellable: true,
  },
];

export const ALL_SKILLS: PetSkill[] = [...CORE_SKILLS, ...PROGRESSION_SKILLS];
