import { randomInt as cryptoRandomInt } from "node:crypto";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { rollGrowthTraits, type GrowthStatKey } from "../../pets/growthTraits";

const NON_STARTER_EGG_MIN_HATCH_MINUTES = 3;
const NON_STARTER_EGG_MAX_HATCH_MINUTES = 10;

type PassiveTraitRoll = {
  id: string;
  key: string;
  rarity: string | null;
};

export type EggQualityRoll = {
  growth_strong_stats: GrowthStatKey[];
  growth_weak_stat: GrowthStatKey | null;
  passive_trait_id: string | null;
  passive_trait_key: string | null;
  hatch_minutes: number;
  mutation_capacity: number;
};

function getPassiveTraitHatchBonus(rarity: string | null): number {
  if (rarity === "legendary") return 3;
  if (rarity === "rare") return 2;
  if (rarity === "uncommon") return 1;

  return 0;
}

async function rollEggPassiveTrait(): Promise<PassiveTraitRoll | null> {
  const { data, error } = await supabaseAdmin
    .from("passive_traits")
    .select("id,key,rarity")
    .eq("is_active", true);

  if (error || !data?.length) return null;

  return data[cryptoRandomInt(0, data.length)] as PassiveTraitRoll;
}

export async function rollNonStarterEggQuality(): Promise<EggQualityRoll> {
  const { strongStats, weakStat } = rollGrowthTraits();
  const passiveTrait = await rollEggPassiveTrait();

  let hatchMinutes = NON_STARTER_EGG_MIN_HATCH_MINUTES;

  hatchMinutes += strongStats.length;

  if (!weakStat) {
    hatchMinutes += 2;
  }

  hatchMinutes += getPassiveTraitHatchBonus(passiveTrait?.rarity ?? null);

  hatchMinutes = Math.min(
    NON_STARTER_EGG_MAX_HATCH_MINUTES,
    Math.max(NON_STARTER_EGG_MIN_HATCH_MINUTES, hatchMinutes),
  );

  return {
    growth_strong_stats: strongStats,
    growth_weak_stat: weakStat,
    passive_trait_id: passiveTrait?.id ?? null,
    passive_trait_key: passiveTrait?.key ?? null,
    hatch_minutes: hatchMinutes,
    mutation_capacity: 1,
  };
}
