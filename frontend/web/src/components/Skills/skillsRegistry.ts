export type SkillId =
  | "basic-strike"
  | "guard"
  | "mend"
  | "weak-element-strike"
  | "lowform-skill"
  | "highform-skill"
  | "legion-skill"
  | "mythic-legendary-skill";

export type SkillTreeKey =
  | "attack"
  | "defense"
  | "healing"
  | "element"
  | "evolution";

export type PetSkill = {
  id: SkillId;
  name: string;
  tree: SkillTreeKey;
  description: string;
};

export const CORE_SKILLS: PetSkill[] = [
  {
    id: "basic-strike",
    name: "Basic Strike",
    tree: "attack",
    description: "A simple starter attack",
  },
  {
    id: "guard",
    name: "Guard",
    tree: "defense",
    description: "Brace to reduce incoming damage",
  },
  {
    id: "mend",
    name: "Mend",
    tree: "healing",
    description: "Restores a small amount of health",
  },
];

export const PROGRESSION_SKILLS: PetSkill[] = [
  {
    id: "weak-element-strike",
    name: "Weak Element Strike",
    tree: "element",
    description: "A weak elemental attack awakened through early growth.",
  },
  {
    id: "lowform-skill",
    name: "Lowform Skill",
    tree: "evolution",
    description: "A focused technique unlocked after reaching Lowform.",
  },
  {
    id: "highform-skill",
    name: "Highform Skill",
    tree: "evolution",
    description: "A stronger technique unlocked after reaching Highform.",
  },
  {
    id: "legion-skill",
    name: "Legion Skill",
    tree: "evolution",
    description: "A powerful combat skill unlocked after reaching Legion.",
  },
  {
    id: "mythic-legendary-skill",
    name: "Mythical Legendary Skill",
    tree: "evolution",
    description: "A rare awakened technique unlocked at Mythical Legendary.",
  },
];
