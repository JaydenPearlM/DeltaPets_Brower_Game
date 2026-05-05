import { FERAL_NODES } from "./talentTrees/feralPath";

export type TalentTreeKey = "feral" | "aegis" | "majo" | "genesis";
export type TalentNodeTree = TalentTreeKey;
export type TalentBranch = "bleed" | "attack" | "merge" | "capstone";
export type TalentNodeShape = "circle" | "triangle" | "square";
export type TalentRequireMode = "all" | "any";

export type TalentEffectType =
  | "attack"
  | "defense"
  | "health"
  | "attack_defense"
  | "bleed_chance"
  | "bleed_power"
  | "bleed_bonus_damage"
  | "bleed_refresh_chance"
  | "wounded_bonus_damage"
  | "low_health_defense"
  | "attack_defense_damage"
  | "basic_strike_bonus_damage"
  | "defense_after_hit"
  | "attack_percent"
  | "defense_percent"
  | "speed_percent"
  | "dodge_chance"
  | "bleed_on_priority"
  | "bleed_accuracy_bonus"
  | "bleed_missing_hp_scale"
  | "damage_taken_attack_stack"
  | "double_attack_chance"
  | "shred_storm_active"
  | "bleed_detonate"
  | "self_damage_to_attack"
  | "deathwish_active"
  | "dodge_counter"
  | "blood_debt_reflect"
  | "apex_scaling"
  | "death_save"
  | "kill_reset";

export type TalentEffect = {
  type: TalentEffectType;
  value: number;
};

export type TalentNodeId =
  | "feral-root"
  | "feral-swift-predator"
  | "feral-crimson-fangs"
  | "feral-reckless-charge"
  | "feral-blur-step"
  | "feral-rush-synergy"
  | "feral-blood-scent"
  | "feral-wound-synergy"
  | "feral-adrenaline-spike"
  | "feral-phantom-strikes"
  | "feral-shred-storm"
  | "feral-savage-rend"
  | "feral-pain-engine"
  | "feral-deathwish-gambit"
  | "feral-fang-over-fang"
  | "feral-frenzy-state"
  | "feral-blood-debt"
  | "feral-primal-fury"
  | "feral-extinction"
  | "feral-last-breath";

export type TalentNode = {
  id: TalentNodeId;
  tree: TalentNodeTree;
  branch?: TalentBranch;
  shape: TalentNodeShape;
  name: string;
  description: string;
  tradeoff?: string | null;
  maxRank: number;
  costPerRank: number;
  requiredLevel: number;
  requires: TalentNodeId[];
  requireMode?: TalentRequireMode;
  position: {
    x: number;
    y: number;
  };
  effects: TalentEffect[];
};

export const TALENT_POINTS_PER_LEVEL = 3;

export const TALENT_TREE_LABELS: Record<TalentTreeKey, string> = {
  feral: "Feral Path",
  aegis: "Aegis Path",
  majo: "Majo Path",
  genesis: "Genesis Path",
};

export const TALENT_NODES: TalentNode[] = [...FERAL_NODES];
