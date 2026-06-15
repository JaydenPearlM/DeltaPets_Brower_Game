import { FERAL_NODES } from "./talentTrees/feralPath";
import { AEGIS_NODES } from "./talentTrees/aegisPath";
import { MAJO_NODES } from "./talentTrees/majoPath";

export type TalentTreeKey = "feral" | "aegis" | "majo" | "genesis";
export type TalentNodeTree = TalentTreeKey;

export type TalentBranch =
  | "bleed"
  | "attack"
  | "warrior"
  | "sentinel"
  | "sorcerer"
  | "healer"
  | "merge"
  | "capstone";

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
  | "hp_percent"
  | "health_percent"
  | "magi_percent"
  | "mana_percent"
  | "speed_percent"
  | "dodge_chance"
  | "damage_reduction"
  | "reflect_damage"
  | "shield_value"
  | "threat_generation"
  | "taunt_chance"
  | "counter_attack_damage"
  | "damage_redirect"
  | "party_defense_aura"
  | "party_shield_value"
  | "low_health_hp_percent"
  | "low_health_defense_percent"
  | "spell_damage_percent"
  | "burst_spell_damage"
  | "status_effect_chance"
  | "status_damage_percent"
  | "spell_crit_chance"
  | "heal_power"
  | "party_heal_power"
  | "heal_over_time_power"
  | "healing_buff_power"
  | "cleanse_chance"
  | "mana_efficiency"
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

export type TalentNodeId = string;

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

export const TALENT_NODES: TalentNode[] = [
  ...FERAL_NODES,
  ...AEGIS_NODES,
  ...MAJO_NODES,
];
