// backend/server/src/routes/routePets/petsStats.ts

import { supabaseAdmin } from "../../lib/supabaseAdmin";
import type { BaseStatsTemplate } from "./petsType";

/** Shape of a row from the pet_stats table */
type PetStatsRow = {
  pet_id: string;
  base_hp: number;
  base_atk: number;
  base_magi: number;
  base_def: number;
  base_spd: number;
  base_mana: number;
  base_total: number;
  created_at?: string;
  updated_at?: string;
};

/** Shape of an allocation row */
type AllocRow = {
  level: number;
  hp: number;
  atk: number;
  magi: number;
  def: number;
  spd: number;
  mana: number;
};

/** MATCH YOUR DB columns */
export async function fetchBaseStatsMapped(petId: string) {
  const { data, error } = await supabaseAdmin
    .from("pet_stats")
    .select("*")
    .eq("pet_id", petId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as PetStatsRow;

  return {
    pet_id: row.pet_id,
    hp: row.base_hp ?? 0,
    atk: row.base_atk ?? 0,
    magi: row.base_magi ?? 0,
    def: row.base_def ?? 0,
    spd: row.base_spd ?? 0,
    mana: row.base_mana ?? 0,
    base_total: row.base_total ?? 0, // should be 10 for eggs
  };
}

export async function insertBaseStats(petId: string, s: BaseStatsTemplate) {
  const payload: Omit<PetStatsRow, "created_at" | "updated_at"> = {
    pet_id: petId,
    base_hp: s.hp,
    base_atk: s.atk,
    base_magi: s.magi,
    base_def: s.def,
    base_spd: s.spd,
    base_mana: s.mana,
    base_total: s.base_total,
  };

  const { error } = await supabaseAdmin.from("pet_stats").insert(payload);

  if (error) throw error;
}

/**
 * IMPORTANT:
 * Level 1 allocation = your IV roll (7 points).
 * So we MUST include level >= 1, not just > 1.
 */
export async function fetchAllocTotals(petId: string) {
  const { data, error } = await supabaseAdmin
    .from("pet_stat_allocations")
    .select("level, hp, atk, magi, def, spd, mana")
    .eq("pet_id", petId)
    .gte("level", 1);

  if (error) throw error;

  const rows = (data ?? []) as AllocRow[];
  const totals = rows.reduce(
    (acc, r) => {
      acc.hp += r.hp ?? 0;
      acc.atk += r.atk ?? 0;
      acc.magi += r.magi ?? 0;
      acc.def += r.def ?? 0;
      acc.spd += r.spd ?? 0;
      acc.mana += r.mana ?? 0;
      return acc;
    },
    { hp: 0, atk: 0, magi: 0, def: 0, spd: 0, mana: 0 },
  );

  return totals;
}

export async function fetchTotalPoints(petId: string) {
  const [base, alloc] = await Promise.all([
    fetchBaseStatsMapped(petId),
    fetchAllocTotals(petId),
  ]);

  if (!base) return null;

  // base(10) + iv(7) => total points 17 at level 1
  const total = {
    hp: (base.hp ?? 0) + alloc.hp,
    atk: (base.atk ?? 0) + alloc.atk,
    magi: (base.magi ?? 0) + alloc.magi,
    def: (base.def ?? 0) + alloc.def,
    spd: (base.spd ?? 0) + alloc.spd,
    mana: (base.mana ?? 0) + (alloc.mana ?? 0),
  };

  const total_points =
    total.hp + total.atk + total.magi + total.def + total.spd + total.mana;

  // Your rule: displayed HP = (hp stat) * 2
  const hp_display = total.hp * 2;

  return { base, alloc, total, total_points, hp_display };
}
