import { randomInt as cryptoRandomInt } from "crypto";
import { Router } from "express";
import type { Response } from "express";

import { requireUser, type AuthedRequest } from "../../middleware/auth";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { rollGrowthTraits } from "../../pets/growthTraits";
import { insertBaseStats } from "../routePets/petsStats";
import { getStarterForSelection } from "../routePets/starters";

export const rewardsRouter = Router();

/* =============================================================================
   Rewards: Daily Login / Weekly Streak
   - Week 1 (streak 1..7): fixed rewards (Sunday grants the Alpha Tester ribbon)
   - After Week 1: random pick from POST_WEEK1_POOL, plus a rare egg chance
   - Any streak that completes a full 7-day block (14, 21, 28...) also attempts
     to award the Alpha Tester ribbon, in case it wasn't earned in Week 1
============================================================================= */

/** ---- Config ------------------------------------------------------------- */

const POST_WEEK1_EGG_CHANCE_PERMILLE = 10; // 10 / 1000 = 1%
const EGG_HATCH_MINUTES = 2;

const ELEMENTS = [
  "null_element",
  "water",
  "fire",
  "earth",
  "air",
  "ice",
  "storm",
  "light",
  "shadow",
] as const;

type Element = (typeof ELEMENTS)[number];

function displayElement(element: Element): string {
  if (element === "null_element") return "Neutral";

  return element.charAt(0).toUpperCase() + element.slice(1);
}

type Reward =
  | { kind: "dots"; amount: number; label: string }
  | { kind: "crystals"; amount: number; label: string }
  | { kind: "item"; slug: string; qty: number; label: string }
  | { kind: "xp"; amount: number; label: string }
  | { kind: "ribbon"; label: string }
  | { kind: "egg"; element: Element; label: string };

type Week1Reward =
  | { kind: "dots"; amount: number; label: string }
  | { kind: "crystals"; amount: number; label: string }
  | { kind: "item"; slug: string; qty: number; label: string }
  | { kind: "xp"; amount: number; label: string }
  | { kind: "ribbon"; label: string };

/** Week 1 fixed rewards (Mon..Sun, mapped by streak dayIndex 0..6). Unchanged. */
const WEEK1: readonly Week1Reward[] = [
  { kind: "dots", amount: 300, label: "300 Dots" }, // Mon
  { kind: "crystals", amount: 5, label: "5 Crystals" }, // Tue
  {
    kind: "item",
    slug: "starter_equipment",
    qty: 1,
    label: "Starter Equipment",
  }, // Wed
  { kind: "item", slug: "potion_small", qty: 3, label: "Potions x3" }, // Thu
  { kind: "xp", amount: 50, label: "Extra EXP +50" }, // Fri
  { kind: "dots", amount: 500, label: "500 Dots" }, // Sat
  { kind: "ribbon", label: "Alpha Tester Ribbon" }, // Sun
] as const;

/** Post-Week-1 random pool. Rolled after the rare egg-chance check misses. */
type PostWeek1PoolReward =
  | { kind: "dots"; amount: number; label: string }
  | { kind: "item"; slug: string; qty: number; label: string }
  | { kind: "xp"; amount: number; label: string };

const POST_WEEK1_POOL: readonly PostWeek1PoolReward[] = [
  { kind: "dots", amount: 300, label: "300 Dots" },
  { kind: "dots", amount: 200, label: "200 Dots" },
  { kind: "dots", amount: 100, label: "100 Dots" },
  { kind: "dots", amount: 600, label: "600 Dots" },
  {
    kind: "item",
    slug: "starter_equipment",
    qty: 1,
    label: "Starter Equipment",
  },
  { kind: "item", slug: "potion_small", qty: 3, label: "Potions x3" },
  { kind: "xp", amount: 100, label: "Extra EXP +100" },
  { kind: "xp", amount: 200, label: "Extra EXP +200" },
] as const;

/** ---- Date helpers ------------------------------------------------------- */
function daysBetweenUTC(a: Date, b: Date): number {
  const aDay = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bDay = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.floor((bDay - aDay) / 86_400_000);
}

/** ---- Random helpers ----------------------------------------------------- */

function pickRandomElement(): Element {
  return ELEMENTS[cryptoRandomInt(0, ELEMENTS.length)];
}

function rollPostWeek1(): Reward {
  // 1% egg chance (per-mille)
  const rollPermille = cryptoRandomInt(0, 1000); // 0..999
  if (rollPermille < POST_WEEK1_EGG_CHANCE_PERMILLE) {
    const element = pickRandomElement();
    return { kind: "egg", element, label: `Egg (${displayElement(element)})` };
  }

  const pick = POST_WEEK1_POOL[cryptoRandomInt(0, POST_WEEK1_POOL.length)];
  return pick;
}

/** ---- Supabase write helpers -------------------------------------------- */

async function ensureWalletRow(user_id: string) {
  const { error } = await supabaseAdmin
    .from("wallets")
    .upsert({ user_id }, { onConflict: "user_id" });
  if (error) throw error;
}

async function addWallet(
  user_id: string,
  currency: "dots" | "crystals",
  delta: number,
) {
  const { error } = await supabaseAdmin.rpc("increment_wallet", {
    p_user_id: user_id,
    p_dots: currency === "dots" ? delta : 0,
    p_crystals: currency === "crystals" ? delta : 0,
  });

  if (error) throw error;
}

async function giveItem(user_id: string, slug: string, qty: number) {
  const { data: item, error } = await supabaseAdmin
    .from("item_defs")
    .select("id")
    .eq("slug", slug)
    .single();
  if (error || !item) throw new Error(`Missing item_defs slug: ${slug}`);

  const { data: inv, error: e1 } = await supabaseAdmin
    .from("inventory")
    .select("qty")
    .eq("user_id", user_id)
    .eq("item_id", item.id)
    .maybeSingle();
  if (e1) throw e1;

  const nextQty = (inv?.qty ?? 0) + qty;

  const { error: e2 } = await supabaseAdmin
    .from("inventory")
    .upsert(
      { user_id, item_id: item.id, qty: nextQty },
      { onConflict: "user_id,item_id" },
    );
  if (e2) throw e2;
}

async function giveXPToActivePet(user_id: string, amount: number) {
  const { data: pet, error } = await supabaseAdmin
    .from("pets")
    .select("id, level")
    .eq("user_id", user_id)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!pet) return;

  const { data: row, error: e1 } = await supabaseAdmin
    .from("pet_stat_allocations")
    .select("id, xp")
    .eq("pet_id", pet.id)
    .eq("level", pet.level)
    .maybeSingle();
  if (e1) throw e1;

  if (!row) {
    const { error: e2 } = await supabaseAdmin
      .from("pet_stat_allocations")
      .insert({
        pet_id: pet.id,
        level: pet.level,
        xp: amount,
        hp: 0,
        atk: 0,
        magi: 0,
        def: 0,
        spd: 0,
        mana: 0,
      });
    if (e2) throw e2;
    return;
  }

  const { error: e3 } = await supabaseAdmin
    .from("pet_stat_allocations")
    .update({ xp: (row.xp ?? 0) + amount })
    .eq("id", row.id);
  if (e3) throw e3;
}

/**
 * Awards the Alpha Tester ribbon once, ever, per trainer.
 * Trainer-scoped (trainer_awards), not pet-scoped, so it survives
 * pet loss, pet swaps, or a pets-table reset. Safe to call repeatedly,
 * the unique(user_id, award_id) constraint makes it a no-op after the
 * first successful award.
 */
async function awardAlphaTesterRibbon(user_id: string, earnedAtIso: string) {
  const { data: award, error: awardErr } = await supabaseAdmin
    .from("awards")
    .upsert(
      {
        key: "alpha_tester",
        name: "Alpha Tester",
        type: "ribbon",
        rarity: "special",
        description:
          "Awarded for participating in the Alpha deployment testing.",
      },
      { onConflict: "key" },
    )
    .select("id")
    .single();

  if (awardErr) throw new Error(awardErr.message);
  if (!award?.id) throw new Error("Failed to resolve award id.");

  const { error: taErr } = await supabaseAdmin.from("trainer_awards").upsert(
    {
      user_id,
      award_id: award.id,
      earned_at: earnedAtIso,
      context: { source: "daily_login_rewards", deployment: "alpha" },
    },
    { onConflict: "user_id,award_id" },
  );

  if (taErr) throw new Error(taErr.message);
}

async function giveEgg(user_id: string, element: Element) {
  const hatchEndsAt = new Date(
    Date.now() + EGG_HATCH_MINUTES * 60 * 1000,
  ).toISOString();

  const starter = getStarterForSelection({ line: element });
  const { strongStats, weakStat } = rollGrowthTraits();

  const { data: egg, error } = await supabaseAdmin
    .from("pets")
    .insert({
      user_id,
      name: starter.eggName,
      species: starter.speciesId,
      line: starter.line,
      stage: "egg",
      energy: 100,
      hatch_ends_at: hatchEndsAt,
      is_active: false,
      location: "hatchery",
      growth_strong_stats: strongStats,
      growth_weak_stat: weakStat,
    })
    .select("id")
    .single();

  if (error) throw error;
  if (!egg?.id) throw new Error("Reward egg insert finished without an id.");

  await insertBaseStats(egg.id, starter.baseStats);
}

async function applyReward(user_id: string, reward: Reward) {
  switch (reward.kind) {
    case "dots":
      return addWallet(user_id, "dots", reward.amount);
    case "crystals":
      return addWallet(user_id, "crystals", reward.amount);
    case "item":
      return giveItem(user_id, reward.slug, reward.qty);
    case "xp":
      return giveXPToActivePet(user_id, reward.amount);
    case "ribbon":
      return awardAlphaTesterRibbon(user_id, new Date().toISOString());
    case "egg":
      return giveEgg(user_id, reward.element);
    default: {
      const _never: never = reward;
      return _never;
    }
  }
}

/** ---- Reward selection --------------------------------------------------- */

function rewardForStreak(nextStreak: number): Reward {
  const dayIndex = (nextStreak - 1) % 7;

  if (nextStreak <= 7) {
    const r = WEEK1[dayIndex];
    if (r.kind === "dots")
      return { kind: "dots", amount: r.amount, label: r.label };
    if (r.kind === "crystals")
      return { kind: "crystals", amount: r.amount, label: r.label };
    if (r.kind === "item")
      return { kind: "item", slug: r.slug, qty: r.qty, label: r.label };
    if (r.kind === "xp")
      return { kind: "xp", amount: r.amount, label: r.label };
    return { kind: "ribbon", label: r.label };
  }

  return rollPostWeek1();
}

/** ---- Routes ------------------------------------------------------------- */

rewardsRouter.get(
  "/status",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    const user_id = req.user!.id;
    const now = new Date();

    const { data: row, error } = await supabaseAdmin
      .from("daily_login_rewards")
      .select("id, streak, last_claimed_at")
      .eq("id", user_id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });

    const streak = row?.streak ?? 0;
    const last = row?.last_claimed_at ? new Date(row.last_claimed_at) : null;

    const diffDays = last ? daysBetweenUTC(last, now) : 999;
    const claimedToday = diffDays === 0;

    const resetIfClaiming = diffDays >= 4;

    const missesUsed = last ? Math.max(0, diffDays - 1) : 0;
    const missesRemaining = Math.max(0, 2 - missesUsed);

    const baseStreak = resetIfClaiming ? 0 : streak;
    const nextStreak = baseStreak + 1;
    const nextDayIndex = (nextStreak - 1) % 7;

    return res.json({
      streak,
      claimedToday,
      canClaim: !claimedToday,
      missesRemaining,
      nextDayIndex,
      week1: nextStreak <= 7,
      preview:
        nextStreak <= 7
          ? WEEK1[nextDayIndex]
          : { kind: "random", label: "Random Reward" },
    });
  },
);

rewardsRouter.post(
  "/claim",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    const user_id = req.user!.id;
    const now = new Date();

    const { data: row, error } = await supabaseAdmin
      .from("daily_login_rewards")
      .select("id, streak, last_claimed_at")
      .eq("id", user_id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });

    const streak = row?.streak ?? 0;
    const last = row?.last_claimed_at ? new Date(row.last_claimed_at) : null;

    const diffDays = last ? daysBetweenUTC(last, now) : 999;
    if (diffDays === 0)
      return res.status(400).json({ error: "Already claimed today." });

    const reset = diffDays >= 4;
    const baseStreak = reset ? 0 : streak;
    const nextStreak = baseStreak + 1;
    const dayIndex = (nextStreak - 1) % 7;

    const reward = rewardForStreak(nextStreak);

    try {
      await applyReward(user_id, reward);
    } catch (e) {
      const err = e as any;

      return res
        .status(500)
        .json({ error: err?.message ?? "Failed to apply reward" });
    }

    // Bonus: completing any full 7-day block (14, 21, 28...) also attempts
    // the ribbon award, in case it wasn't picked up during Week 1.
    // Idempotent, so this only ever does something the first time it hits.
    let ribbonBonusAwarded = false;
    const completedFullWeek = nextStreak % 7 === 0;

    if (completedFullWeek && reward.kind !== "ribbon") {
      try {
        await awardAlphaTesterRibbon(user_id, now.toISOString());
        ribbonBonusAwarded = true;
      } catch (e) {
        console.warn("[rewards] bonus ribbon award attempt failed:", e);
      }
    }

    const { error: e2 } = await supabaseAdmin
      .from("daily_login_rewards")
      .upsert(
        { id: user_id, streak: nextStreak, last_claimed_at: now.toISOString() },
        { onConflict: "id" },
      );

    if (e2) return res.status(500).json({ error: e2.message });

    return res.json({
      ok: true,
      reward,
      streak: nextStreak,
      dayIndex,
      reset,
      ribbon_bonus_awarded: ribbonBonusAwarded,
    });
  },
);
