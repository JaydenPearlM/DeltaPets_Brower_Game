// backend/server/src/routes/routePets/routePets.ts

import { Router } from "express";
import type { Response } from "express";

import { applyHungerDecay } from "../../pets/hunger";
import { requireUser, type AuthedRequest } from "../../middleware/auth";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { cooldownsFromPetRow } from "../../pets/cooldowns";
import { markRunawayIfNeeded } from "../../pets/runaway";
// import { syncPetDerivedStats } from "../../pets/syncPetDerivedStats"; // <- do NOT use on hatch now

// IV helpers
import { rollIV, sumStats } from "../../lib/stats/individualValues";

import type { EnsureEggBody, ElementalLine } from "./petsType";
import { BASIC_EGG_HATCH_MINUTES, HATCH_ALLOCATION_POINTS } from "./petsType";
import { rollStarter, findStarterByName, STARTER_SPROUTS } from "./starters";
import {
  elementMapForLine,
  hatchPayload,
  msUntil,
  rollGender,
  sumBase5,
} from "./petsUtils";
import {
  fetchBaseStatsMapped,
  fetchTotalPoints,
  insertBaseStats,
} from "./petsStats";
import {
  fetchActivePet,
  fetchHatcheryEgg,
  fetchStarterPetAnyStage,
} from "./petsRepo";

export const petsRouter = Router();

/**
 * Random personality assignment (DB-driven)
 * Uses personalities.key and stores it into pets.personality_key
 */
async function rollRandomPersonalityKey(): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("personalities")
    .select("key");

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("No personalities found in database.");
  }

  const idx = Math.floor(Math.random() * data.length);
  return (data[idx] as any).key;
}

// -----------------------------
// Routes
// -----------------------------
petsRouter.get(
  "/active",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const serverNowMs = Date.now();

      const { pet } = await fetchActivePet(userId);

      if (!pet) {
        return res.json({
          server_now: new Date(serverNowMs).toISOString(),
          pet: null,
          stats: null,
          points: null,
          elements: null,
          cooldowns: null,
        });
      }

      // Apply hunger decay first
      const decayedHunger = await applyHungerDecay(pet.id);
      const petWithDecay = { ...(pet as any), hunger: decayedHunger };

      const petAfterRunaway = markRunawayIfNeeded
        ? await markRunawayIfNeeded({
            supabaseAdmin,
            pet: petWithDecay,
            serverNowMs,
          })
        : petWithDecay;

      const baseStats = await fetchBaseStatsMapped(petAfterRunaway.id);
      const points = await fetchTotalPoints(petAfterRunaway.id);

      const elements = elementMapForLine(
        (petAfterRunaway.line ?? "null_element") as ElementalLine,
      );

      return res.json({
        server_now: new Date(serverNowMs).toISOString(),
        pet: petAfterRunaway,
        stats: baseStats,
        points,
        elements,
        cooldowns: cooldownsFromPetRow(petAfterRunaway, serverNowMs),
      });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  },
);

petsRouter.get(
  "/list",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      const { data, error } = await supabaseAdmin
        .from("pets")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) return res.status(500).json({ error: error.message });
      return res.json({ pets: data ?? [] });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  },
);

petsRouter.get(
  "/hatchery",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const serverNowMs = Date.now();

      const { pet: egg } = await fetchHatcheryEgg(userId);

      if (!egg) {
        return res.json({
          server_now: new Date(serverNowMs).toISOString(),
          pet: null,
          hatch: null,
          stats: null,
          points: null,
          elements: null,
        });
      }

      const decayedHunger = await applyHungerDecay(egg.id);
      const eggWithDecay = { ...(egg as any), hunger: decayedHunger };

      const baseStats = await fetchBaseStatsMapped(eggWithDecay.id);
      const points = await fetchTotalPoints(eggWithDecay.id);

      const elements = elementMapForLine(
        (eggWithDecay.line ?? "null_element") as ElementalLine,
      );

      return res.json({
        server_now: new Date(serverNowMs).toISOString(),
        pet: eggWithDecay,
        hatch: hatchPayload(eggWithDecay, serverNowMs),
        stats: baseStats,
        points,
        elements,
      });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  },
);

petsRouter.post(
  "/ensure-egg",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const serverNowMs = Date.now();
      const _body = (req.body ?? {}) as EnsureEggBody;

      // If starter already exists (egg or hatched), return it.
      const existingStarter = await fetchStarterPetAnyStage(userId);
      if (existingStarter) {
        return res.json({
          server_now: new Date(serverNowMs).toISOString(),
          created: false,
          pet: existingStarter,
          hatch:
            existingStarter.stage === "egg"
              ? hatchPayload(existingStarter, serverNowMs)
              : null,
        });
      }

      // Existing "egg in progress" check
      const { pet: existingEgg } = await fetchHatcheryEgg(userId);
      if (existingEgg) {
        return res.json({
          server_now: new Date(serverNowMs).toISOString(),
          created: false,
          pet: existingEgg,
          hatch: hatchPayload(existingEgg, serverNowMs),
        });
      }

      const starter = rollStarter();
      const hatchMs = BASIC_EGG_HATCH_MINUTES * 60 * 1000;
      const hatch_ends_at = new Date(serverNowMs + hatchMs).toISOString();

      const { data: created, error } = await supabaseAdmin
        .from("pets")
        .insert({
          user_id: userId,
          name: starter.name,
          line: starter.line,
          stage: "egg",
          hatch_ends_at,
          unspent_points: 0,
          is_active: false,
          gender: "null_gender",
          // personality_key intentionally not set until hatch
        } as any)
        .select("*")
        .single();

      if (error) return res.status(500).json({ error: error.message });

      await insertBaseStats(created.id, starter.baseStats);

      return res.json({
        server_now: new Date(serverNowMs).toISOString(),
        created: true,
        pet: created,
        hatch: hatchPayload(created, serverNowMs),
      });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  },
);

petsRouter.post(
  "/hatch",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const serverNowMs = Date.now();

      const { pet: egg } = await fetchHatcheryEgg(userId);
      if (!egg) return res.status(404).json({ error: "No hatchery egg found" });

      const remaining = msUntil(egg.hatch_ends_at, serverNowMs);
      if (remaining > 0) {
        return res.status(409).json({
          error: "Egg is not ready yet",
          server_now: new Date(serverNowMs).toISOString(),
          hatch: hatchPayload(egg, serverNowMs),
        });
      }

      // deactivate any active pets
      await supabaseAdmin
        .from("pets")
        .update({ is_active: false } as any)
        .eq("user_id", userId)
        .eq("is_active", true);

      const baseRowMapped = await fetchBaseStatsMapped(egg.id);
      if (!baseRowMapped) {
        const starter = findStarterByName(egg.name) ?? STARTER_SPROUTS[0];
        await insertBaseStats(egg.id, starter.baseStats);
      }

      const { data: baseRaw, error: baseRawErr } = await supabaseAdmin
        .from("pet_stats")
        .select(
          "pet_id, base_hp, base_atk, base_magi, base_def, base_spd, base_mana, base_total",
        )
        .eq("pet_id", egg.id)
        .maybeSingle();

      if (baseRawErr)
        return res.status(500).json({ error: baseRawErr.message });
      if (!baseRaw)
        return res
          .status(500)
          .json({ error: "Missing pet_stats row after ensure." });

      const baseSum = sumBase5({
        base_hp: (baseRaw as any).base_hp,
        base_atk: (baseRaw as any).base_atk,
        base_def: (baseRaw as any).base_def,
        base_spd: (baseRaw as any).base_spd,
        base_magi: (baseRaw as any).base_magi,
      });

      if (baseSum !== 10) {
        const starter = findStarterByName(egg.name);
        if (starter) {
          const { error: fixErr } = await supabaseAdmin
            .from("pet_stats")
            .update({
              base_hp: starter.baseStats.hp,
              base_atk: starter.baseStats.atk,
              base_def: starter.baseStats.def,
              base_spd: starter.baseStats.spd,
              base_magi: starter.baseStats.magi,
              base_mana: starter.baseStats.mana ?? 0,
              base_total: 10,
            } as any)
            .eq("pet_id", egg.id);

          if (fixErr) return res.status(500).json({ error: fixErr.message });

          (baseRaw as any).base_hp = starter.baseStats.hp;
          (baseRaw as any).base_atk = starter.baseStats.atk;
          (baseRaw as any).base_def = starter.baseStats.def;
          (baseRaw as any).base_spd = starter.baseStats.spd;
          (baseRaw as any).base_magi = starter.baseStats.magi;
          (baseRaw as any).base_mana = starter.baseStats.mana ?? 0;
          (baseRaw as any).base_total = 10;
        } else {
          console.warn("[hatch] invalid baseSum for starter egg", {
            petId: egg.id,
            name: egg.name,
            baseSum,
            expected: 10,
          });
        }
      }

      // ---------------------------------------------
      // HATCH BONUS (7 random points):
      // - Base stats stay in pet_stats (sum=10)
      // - Hatch bonus is NOT a "level allocation" (DB constraint = 1 per level)
      // - We apply hatch bonus directly to the pet snapshot stats
      // ---------------------------------------------

      const iv = rollIV(HATCH_ALLOCATION_POINTS);
      if (sumStats(iv) !== HATCH_ALLOCATION_POINTS) {
        throw new Error("IV generation failed integrity check");
      }

      //  Persist hatch IV as the Level 1 allocation so totals = base(10) + iv(7) = 17.
      // fetchTotalPoints() reads pet_stat_allocations(level >= 1). Without this, UI shows 10 forever.
      const { error: ivUpsertErr } = await supabaseAdmin
        .from("pet_stat_allocations")
        .upsert(
          {
            pet_id: egg.id,
            level: 1,
            hp: iv.hp,
            atk: iv.atk,
            def: iv.def,
            spd: iv.spd,
            magi: iv.magi,
            mana: iv.mana,
          } as any,
          { onConflict: "pet_id,level" },
        );

      if (ivUpsertErr) {
        return res.status(500).json({ error: ivUpsertErr.message });
      }

      const baseHp = Number((baseRaw as any).base_hp ?? 0);
      const baseAtk = Number((baseRaw as any).base_atk ?? 0);
      const baseDef = Number((baseRaw as any).base_def ?? 0);
      const baseSpd = Number((baseRaw as any).base_spd ?? 0);
      const baseMagi = Number((baseRaw as any).base_magi ?? 0);
      const baseMana = Number((baseRaw as any).base_mana ?? 0);

      const totalHp = baseHp + iv.hp;
      const totalAtk = baseAtk + iv.atk;
      const totalDef = baseDef + iv.def;
      const totalSpd = baseSpd + iv.spd;
      const totalMagi = baseMagi + iv.magi;
      const totalMana = baseMana + iv.mana;

      const hpMax = Math.max(1, totalHp * 2);

      const nowIso = new Date(serverNowMs).toISOString();
      const genderToSet = rollGender();
      const personalityKey = await rollRandomPersonalityKey();

      const { data: hatched, error } = await supabaseAdmin
        .from("pets")
        .update({
          stage: "baby",
          hatched_at: nowIso,
          hatch_ends_at: null,
          unspent_points: 0,
          is_active: true,
          gender: genderToSet,
          personality_key: personalityKey,

          // snapshot stats (base + hatch bonus)
          atk: totalAtk,
          def: totalDef,
          spd: totalSpd,
          magi: totalMagi,
          mana: totalMana,

          // derived hp
          hp_max: hpMax,
          hp_cur: hpMax,
        } as any)
        .eq("id", egg.id)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (error) return res.status(500).json({ error: error.message });

      // DO NOT call syncPetDerivedStats here (it would overwrite snapshot with base+alloc only)
      // await syncPetDerivedStats(egg.id, { refillHp: true });

      const points = await fetchTotalPoints(egg.id);

      return res.json({
        server_now: nowIso,
        pet: hatched,
        awarded_points: HATCH_ALLOCATION_POINTS,
        iv,
        points,
        gender: genderToSet,
        personality_key: personalityKey,
      });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  },
);
