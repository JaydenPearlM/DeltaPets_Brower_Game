// ========================================
// pets/syncPetDerivedStats.ts
// Rebuilds a pet's derived snapshot stats from:
// 1) fixed base egg/template stats
// 2) stat allocation rows (IVs, level-up points, etc.)
// ========================================

import { supabaseAdmin } from "../lib/supabaseAdmin";

type Points = {
  hp: number;
  atk: number;
  magi: number;
  def: number;
  spd: number;
  mana: number;
};

function addPoints(a: Points, b: Points): Points {
  return {
    hp: a.hp + b.hp,
    atk: a.atk + b.atk,
    magi: a.magi + b.magi,
    def: a.def + b.def,
    spd: a.spd + b.spd,
    mana: a.mana + b.mana,
  };
}

function clampNonNegative(value: unknown): number {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

function deriveFromPoints(points: Points) {
  const hpMax = Math.max(1, points.hp * 2);

  return {
    hp_max: hpMax,
    atk: points.atk,
    magi: points.magi,
    def: points.def,
    spd: points.spd,
    mana: points.mana,
  };
}

export async function syncPetDerivedStats(
  petId: string,
  opts?: { refillHp?: boolean },
) {
  // ========================================
  // 1) Base template stats
  // These are the fixed egg/template stats.
  // DO NOT randomize these here.
  // ========================================
  const baseRes = await supabaseAdmin
    .from("pet_stats")
    .select("base_hp, base_atk, base_magi, base_def, base_spd, base_mana")
    .eq("pet_id", petId)
    .single();

  if (baseRes.error) throw baseRes.error;

  const base: Points = {
    hp: clampNonNegative(baseRes.data.base_hp),
    atk: clampNonNegative(baseRes.data.base_atk),
    magi: clampNonNegative(baseRes.data.base_magi),
    def: clampNonNegative(baseRes.data.base_def),
    spd: clampNonNegative(baseRes.data.base_spd),
    mana: clampNonNegative(baseRes.data.base_mana),
  };

  // ========================================
  // 2) Allocation rows
  // Includes IVs at hatch, level-up allocations, etc.
  // ========================================
  const allocRes = await supabaseAdmin
    .from("pet_stat_allocations")
    .select("hp, atk, magi, def, spd, mana")
    .eq("pet_id", petId);

  if (allocRes.error) throw allocRes.error;

  const allocTotal: Points = (allocRes.data ?? []).reduce<Points>(
    (acc, row) =>
      addPoints(acc, {
        hp: clampNonNegative(row.hp),
        atk: clampNonNegative(row.atk),
        magi: clampNonNegative(row.magi),
        def: clampNonNegative(row.def),
        spd: clampNonNegative(row.spd),
        mana: clampNonNegative((row as any).mana),
      }),
    { hp: 0, atk: 0, magi: 0, def: 0, spd: 0, mana: 0 },
  );

  // ========================================
  // 3) Total points and derived combat snapshot
  // ========================================
  const total = addPoints(base, allocTotal);
  const derived = deriveFromPoints(total);

  // ========================================
  // 4) Sync onto pets snapshot
  // Keep current HP capped unless refillHp is requested.
  // ========================================
  const petRes = await supabaseAdmin
    .from("pets")
    .select("hp_cur")
    .eq("id", petId)
    .single();

  if (petRes.error) throw petRes.error;

  const currentHp = clampNonNegative(petRes.data.hp_cur ?? derived.hp_max);
  const newHpCur = opts?.refillHp
    ? derived.hp_max
    : Math.min(currentHp, derived.hp_max);

  const upd = await supabaseAdmin
    .from("pets")
    .update({
      hp_max: derived.hp_max,
      hp_cur: newHpCur,
      atk: derived.atk,
      magi: derived.magi,
      def: derived.def,
      spd: derived.spd,
      mana: derived.mana,
    })
    .eq("id", petId);

  if (upd.error) throw upd.error;

  return {
    base,
    allocTotal,
    total,
    derived,
  };
}
