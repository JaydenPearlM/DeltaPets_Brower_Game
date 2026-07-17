import { randomInt as cryptoRandomInt } from "node:crypto";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { rollGrowthTraits, type GrowthStatKey } from "../../pets/growthTraits";

// --- Alpha testing override -------------------------------------------------
// Tutorial/testing eggs hatch on a flat timer so testing stays fast and
// predictable, real quality scaling below still runs and gets calculated,
// it's just not what gets returned yet. Flip this to false once stat /
// passive trait / mutation-based hatch time is ready to go live (planned:
// wire in after the Gym and elemental affinities land).
const ALPHA_FLAT_HATCH_MINUTES_ENABLED = true;
const ALPHA_FLAT_HATCH_MINUTES = 2;

// Real quality-scaled range, used once ALPHA_FLAT_HATCH_MINUTES_ENABLED is
// false. More strong stats, no weak stat, and rarer passive traits (up to
// legendary) all push the hatch time toward the max.
const NON_STARTER_EGG_MIN_HATCH_MINUTES = 2;
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

  const finalHatchMinutes = ALPHA_FLAT_HATCH_MINUTES_ENABLED
    ? ALPHA_FLAT_HATCH_MINUTES
    : hatchMinutes;

  return {
    growth_strong_stats: strongStats,
    growth_weak_stat: weakStat,
    passive_trait_id: passiveTrait?.id ?? null,
    passive_trait_key: passiveTrait?.key ?? null,
    hatch_minutes: finalHatchMinutes,
    mutation_capacity: 1,
  };
}
