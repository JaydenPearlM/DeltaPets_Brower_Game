import type { BattleElement } from "./battleTypes";

// Extracted from the existing PvE route without changing its tuning.
type DamageUnit = {
  element: BattleElement;
  atk: number;
  def: number;
  magi: number;
  guarding: boolean;
  status?: { exposed?: number; weakened?: number };
};
export function getElementMultiplier(
  attacker: BattleElement,
  defender: BattleElement,
) {
  const strongAgainst: Partial<Record<BattleElement, BattleElement[]>> = {
    fire: ["earth", "ice"],
    water: ["fire"],
    earth: ["air", "storm"],
    air: ["water"],
    ice: ["air"],
    storm: ["water"],
    light: ["shadow"],
    shadow: ["light"],
  };

  const weakAgainst: Partial<Record<BattleElement, BattleElement[]>> = {
    fire: ["water"],
    water: ["air", "storm"],
    earth: ["fire", "ice"],
    air: ["earth", "ice"],
    ice: ["fire"],
    storm: ["earth"],
    light: ["shadow"],
    shadow: ["light"],
  };

  if (strongAgainst[attacker]?.includes(defender)) return 1.25;
  if (weakAgainst[attacker]?.includes(defender)) return 0.85;

  return 1;
}

export function calculateDamage(params: {
  attacker: DamageUnit;
  defender: DamageUnit;
  power: number;
  useMagi?: boolean;
  elemental?: boolean;
}) {
  const { attacker, defender, power, useMagi, elemental } = params;

  const offense = useMagi ? attacker.magi : attacker.atk;
  const defense = defender.guarding ? defender.def * 1.35 : defender.def;

  const exposedBonus = defender.status?.exposed ? 1.2 : 1;
  const weakenedPenalty = attacker.status?.weakened ? 0.8 : 1;
  const elementBonus = elemental
    ? getElementMultiplier(attacker.element, defender.element)
    : 1;

  const raw =
    offense * power * weakenedPenalty * exposedBonus * elementBonus -
    defense * 0.45;

  return Math.max(1, Math.round(raw));
}

export function calculateMend(magi: number, level: number, multiplier: number) {
  const baseHeal = Math.max(4, Math.round(magi * 1.25 + level * 2));
  return Math.round(baseHeal * multiplier);
}