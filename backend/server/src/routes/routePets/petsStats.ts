// backend/server/src/routes/routePets/pets.stats.ts

import { supabaseAdmin } from "../../lib/supabaseAdmin";
import type { BaseStatsTemplate } from "./petsType";

/** MATCH YOUR DB columns */
export async function fetchBaseStatsMapped(petId: string) {
  const { data, error } = await supabaseAdmin
    .from("pet_stats")
    .select("*")
    .eq("pet_id", petId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    pet_id: (data as any).pet_id,
    hp: (data as any).base_hp ?? 0,
    atk: (data as any).base_atk ?? 0,
    magi: (data as any).base_magi ?? 0,
    def: (data as any).base_def ?? 0,
    spd: (data as any).base_spd ?? 0,
    mana: (data as any).base_mana ?? 0,
    base_total: (data as any).base_total ?? 0,
  };
}

export async function insertBaseStats(petId: string, s: BaseStatsTemplate) {
  const { error } = await supabaseAdmin.from("pet_stats").insert({
    pet_id: petId,
    base_hp: s.hp,
    base_atk: s.atk,
    base_magi: s.magi,
    base_def: s.def,
    base_spd: s.spd,
    base_mana: s.mana,
    base_total: s.base_total,
  } as any);

  if (error) throw error;
}

/**
 * IMPORTANT:
 * ignore allocations with level <= 1
 */
export async function fetchAllocTotals(petId: string) {
  const { data, error } = await supabaseAdmin
    .from("pet_stat_allocations")
    .select("level, hp, atk, magi, def, spd")
    .eq("pet_id", petId)
    .gt("level", 1);

  if (error) throw error;

  const rows = data ?? [];
  const totals = rows.reduce(
    (acc, r: any) => {
      acc.hp += r.hp ?? 0;
      acc.atk += r.atk ?? 0;
      acc.magi += r.magi ?? 0;
      acc.def += r.def ?? 0;
      acc.spd += r.spd ?? 0;
      return acc;
    },
    { hp: 0, atk: 0, magi: 0, def: 0, spd: 0 },
  );

  return totals;
}

export async function fetchTotalPoints(petId: string) {
  const base = await fetchBaseStatsMapped(petId);
  const alloc = await fetchAllocTotals(petId);

  if (!base) return null;

  const total = {
    hp: (base.hp ?? 0) + alloc.hp,
    atk: (base.atk ?? 0) + alloc.atk,
    magi: (base.magi ?? 0) + alloc.magi,
    def: (base.def ?? 0) + alloc.def,
    spd: (base.spd ?? 0) + alloc.spd,
    mana: base.mana ?? 0,
  };

  const total_points =
    total.hp +
    total.atk +
    total.magi +
    total.def +
    total.spd +
    (total.mana ?? 0);

  return { base, alloc, total, total_points };
}
