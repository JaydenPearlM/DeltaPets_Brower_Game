// backend/server/src/routes/care/care.ts

import { Router } from "express";
import type { NextFunction, Response } from "express";
import { safeNum } from "../../lib/utils";
import { requireUser, type AuthedRequest } from "../../middleware/auth";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { fetchTotalPoints } from "../routePets/petsStats";
import { fetchActivePet } from "../routePets/petsRepo";
import { applyCareDecay } from "../../shared/pets/care/CareDecay";
import {
  normalizePetForClient,
  updatePetCareStats,
  applyCarePatch,
} from "../../lib/petCareHelpers";

export const careRouter = Router();

// Blocks dev-only routes from running outside local development.
function devOnly(_req: AuthedRequest, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV !== "development") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

const STARTER_MERCHANT_HREF = "/cities/kithna?merchant=starter-rescue";

type StarterMerchantState = {
  show: boolean;
  href: string;
  title: string;
  body: string;
  ctaLabel: string;
};

async function getStarterMerchantState(
  userId: string,
): Promise<StarterMerchantState | null> {
  const { data, error } = await supabaseAdmin
    .from("pets")
    .select("id,ran_away")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  const pets = Array.isArray(data) ? data : [];
  const totalOwned = pets.length;
  const healthyCount = pets.filter((row: any) => !row?.ran_away).length;

  if (totalOwned > 0 && healthyCount === 0) {
    return {
      show: true,
      href: STARTER_MERCHANT_HREF,
      title: "Pet Ran Away",
      body: "All of your Kith are gone. A quiet merchant has opened inside Kithna's tutorial market with lower-tier starter rescues so you can rebuild.",
      ctaLabel: "Visit the Kithna Merchant",
    };
  }

  return null;
}

async function buildNoPetCareResponse(userId: string, team: any[]) {
  const starterMerchant = await getStarterMerchantState(userId);

  return {
    pet: null,
    stats: null,
    total_points: null,
    hp_display: null,
    elements: null,
    team,
    starter_merchant: starterMerchant,
  };
}

function wholeCare(value: unknown, fallback = 0, min = 0, max = 50) {
  const n = safeNum(value, fallback);
  return Math.max(min, Math.min(max, Math.round(n)));
}

function wholeStat(value: unknown, fallback = 0, min = 0) {
  const n = safeNum(value, fallback);
  return Math.max(min, Math.round(n));
}

function titleCaseValue(value: unknown, fallback = "Mysterious") {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;

  return raw
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function petNeedsRunawayLock(pet: Record<string, any>) {
  const hunger = wholeCare(pet.hunger, 50);
  const clean = wholeCare(pet.clean ?? pet.cleanliness, 50);
  const happy = wholeCare(pet.happy ?? pet.happiness, 50);
  const neglectHours = wholeStat(pet.neglect_hours, 0, 0);

  return (hunger <= 0 || clean <= 0 || happy <= 0) && neglectHours >= 24;
}

async function markPetAsRunaway(pet: Record<string, any>) {
  const timestamp = new Date().toISOString();

  await updatePetCareStats(String(pet.id), {
    hunger: 0,
    clean: 0,
    happy: 0,
    comfort: 0,
    rest: 0,
    energy: safeNum(pet.energy, 100),
    neglect_hours: Math.max(12, wholeStat(pet.neglect_hours, 12, 0)),
    ran_away: true,
    runaway_at: pet.runaway_at ?? timestamp,
    last_care_update: timestamp,
    last_care_decay_at: timestamp,
  });
}

careRouter.get("/current", requireUser, async (req: AuthedRequest, res) => {
  const userId = req.user!.id;

  try {
    const [activePetResult, { data: slotRows, error: slotError }] =
      await Promise.all([
        fetchActivePet(userId),
        supabaseAdmin
          .from("party_slots")
          .select("pet_id,slot_index")
          .eq("user_id", userId)
          .order("slot_index", { ascending: true }),
      ]);

    if (slotError) {
      console.error("[care/current] failed to load party slots", slotError);
      return res.status(500).json({ error: slotError.message });
    }

    const normalizedSlots = (slotRows ?? [])
      .filter((row: any) => row?.pet_id && Number(row?.slot_index ?? 0) >= 1)
      .sort(
        (a: any, b: any) =>
          Number(a?.slot_index ?? 0) - Number(b?.slot_index ?? 0),
      )
      .slice(0, 4);

    const teamPetIds = normalizedSlots
      .map((row: any) => row?.pet_id)
      .filter(
        (value: unknown): value is string =>
          typeof value === "string" && value.trim().length > 0,
      );

    let team: any[] = [];

    if (teamPetIds.length) {
      const { data: teamPets, error: teamError } = await supabaseAdmin
        .from("pets")
        .select("*")
        .in("id", teamPetIds);

      if (teamError) {
        console.error("[care/current] failed to load team pets", teamError);
        return res.status(500).json({ error: teamError.message });
      }

      const personalityIds = Array.from(
        new Set(
          (teamPets ?? [])
            .map((row: any) => row?.personality_id)
            .filter(
              (value: unknown): value is string =>
                typeof value === "string" && value.trim().length > 0,
            ),
        ),
      );

      let personalityMap = new Map<string, string>();

      if (personalityIds.length) {
        const { data: personalityRows, error: personalityError } =
          await supabaseAdmin
            .from("personalities")
            .select("id,name,key")
            .in("id", personalityIds);

        if (personalityError) {
          console.error(
            "[care/current] failed to load team personalities",
            personalityError,
          );
          return res.status(500).json({ error: personalityError.message });
        }

        personalityMap = new Map(
          (personalityRows ?? []).map((row: any) => [
            String(row.id),
            String(row.name ?? row.key ?? "").trim(),
          ]),
        );
      }

      const petMap = new Map<string, any>(
        (teamPets ?? []).map((row: any) => {
          const derivedPersonality =
            row?.personality_name ??
            row?.personality ??
            row?.personality_key ??
            personalityMap.get(String(row?.personality_id ?? "")) ??
            null;

          return [
            String(row.id),
            normalizePetForClient({
              ...row,
              personality_name: derivedPersonality,
            }),
          ];
        }),
      );

      team = normalizedSlots
        .map((slot: any) => {
          const source = petMap.get(String(slot.pet_id));
          if (!source?.id) return null;

          const rawElement = String(source.element ?? source.line ?? "null")
            .trim()
            .toLowerCase();

          const rawStage = String(source.stage ?? "unknown")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "_");

          return {
            id: String(source.id),
            slotIndex: Number(slot.slot_index ?? 0),
            species:
              source.species?.trim() || source.name?.trim() || "Unknown Delta",
            nickname:
              source.nickname?.trim() || source.name?.trim() || "Unnamed Delta",
            stage: titleCaseValue(source.stage, "Unknown"),
            stageKey: rawStage,
            personality: titleCaseValue(
              source.personality_name ??
                source.personality ??
                source.personality_key,
              "Mysterious",
            ),
            element: titleCaseValue(
              source.element ?? source.line ?? "Voidborne",
              "Voidborne",
            ),
            elementKey: rawElement === "neutral" ? "null" : rawElement,
            level: Number(source.level ?? 1),
            isActive: Boolean(source.is_active),
            previewUrl:
              source.portrait_url ||
              source.sprite_url ||
              source.image_url ||
              null,
          };
        })
        .filter(Boolean);
    }

    let activePetResolved: any = activePetResult?.pet ?? null;

    if (
      activePetResolved?.personality_id &&
      !activePetResolved?.personality_name &&
      !activePetResolved?.personality &&
      !activePetResolved?.personality_key
    ) {
      const { data: personalityRow, error: personalityLookupError } =
        await supabaseAdmin
          .from("personalities")
          .select("name,key")
          .eq("id", activePetResolved.personality_id)
          .maybeSingle();

      if (personalityLookupError) {
        console.error(
          "[care/current] failed to hydrate active pet personality",
          personalityLookupError,
        );
      }

      if (personalityRow) {
        activePetResolved = {
          ...activePetResolved,
          personality_name: personalityRow.name ?? personalityRow.key ?? null,
        };
      }
    }

    if (!activePetResolved?.id) {
      return res.json(await buildNoPetCareResponse(userId, team));
    }

    activePetResolved = normalizePetForClient(activePetResolved);

    let hydratedPet = activePetResolved;

    try {
      hydratedPet = normalizePetForClient(applyCareDecay(activePetResolved));
    } catch (decayError) {
      console.error("[care/current] applyCareDecay failed", decayError);
      hydratedPet = activePetResolved;
    }

    const careChanged =
      safeNum(hydratedPet.hunger) !== safeNum(activePetResolved.hunger) ||
      safeNum(hydratedPet.clean) !== safeNum(activePetResolved.clean) ||
      safeNum(hydratedPet.happy) !== safeNum(activePetResolved.happy) ||
      safeNum(hydratedPet.comfort) !== safeNum(activePetResolved.comfort) ||
      safeNum(hydratedPet.rest) !== safeNum(activePetResolved.rest) ||
      safeNum(hydratedPet.energy) !== safeNum(activePetResolved.energy) ||
      safeNum(hydratedPet.neglect_hours) !==
        safeNum(activePetResolved.neglect_hours) ||
      Boolean(hydratedPet.ran_away) !== Boolean(activePetResolved.ran_away) ||
      (hydratedPet.runaway_at ?? null) !==
        (activePetResolved.runaway_at ?? null) ||
      String(hydratedPet.last_care_decay_at ?? "") !==
        String(activePetResolved.last_care_decay_at ?? "");

    if (careChanged && hydratedPet?.id) {
      await updatePetCareStats(hydratedPet.id, {
        hunger: safeNum(hydratedPet.hunger),
        clean: safeNum(hydratedPet.clean),
        happy: safeNum(hydratedPet.happy),
        comfort: safeNum(hydratedPet.comfort),
        rest: safeNum(hydratedPet.rest),
        energy: safeNum(hydratedPet.energy, 100),
        neglect_hours: safeNum(hydratedPet.neglect_hours),
        ran_away: Boolean(hydratedPet.ran_away),
        runaway_at: hydratedPet.runaway_at ?? null,
        last_care_update:
          hydratedPet.last_care_update ?? new Date().toISOString(),
        last_care_decay_at:
          hydratedPet.last_care_decay_at ?? new Date().toISOString(),
      });

      activePetResolved = {
        ...hydratedPet,
        hunger: wholeCare(hydratedPet.hunger, 50),
        clean: wholeCare(hydratedPet.clean, 50),
        cleanliness: wholeCare(hydratedPet.clean, 50),
        happy: wholeCare(hydratedPet.happy, 50),
        happiness: wholeCare(hydratedPet.happy, 50),
        comfort: wholeCare(hydratedPet.comfort, 50),
        rest: wholeCare(hydratedPet.rest, 50),
        energy: wholeCare(hydratedPet.energy, 100, 0, 100),
        neglect_hours: wholeStat(hydratedPet.neglect_hours, 0, 0),
      };
    } else {
      activePetResolved = hydratedPet;
    }

    if (!activePetResolved?.id) {
      return res.json(await buildNoPetCareResponse(userId, team));
    }

    if (
      Boolean(activePetResolved.ran_away) ||
      petNeedsRunawayLock(activePetResolved)
    ) {
      await markPetAsRunaway(activePetResolved);
      return res.json(await buildNoPetCareResponse(userId, team));
    }

    let stats: any = null;
    let total_points: number | null = null;
    let hp_display: number | null = null;

    const [pointsResult, elementsResult] = await Promise.all([
      fetchTotalPoints(activePetResolved.id).catch((pointsError) => {
        console.error("[care/current] fetchTotalPoints failed", pointsError);
        return null;
      }),
      supabaseAdmin
        .from("pet_elements")
        .select("*")
        .eq("pet_id", activePetResolved.id)
        .maybeSingle(),
    ]);

    if (pointsResult) {
      stats = pointsResult.total ?? null;
      total_points = pointsResult.total_points ?? null;
      hp_display = pointsResult.hp_display ?? null;
    }

    const starterMerchant = await getStarterMerchantState(userId);

    if (elementsResult.error) {
      console.error(
        "[care/current] failed to load pet elements",
        elementsResult.error,
      );

      return res.json({
        pet: {
          ...activePetResolved,
          personality_name:
            activePetResolved.personality_name ??
            activePetResolved.personality ??
            activePetResolved.personality_key ??
            null,
        },
        stats,
        total_points,
        hp_display,
        elements: null,
        team,
        starter_merchant: starterMerchant,
      });
    }

    const elementsRow = elementsResult.data;

    const elements =
      elementsRow && typeof elementsRow === "object"
        ? {
            null:
              (elementsRow as any).null ??
              (elementsRow as any).null_element ??
              0,
            water: (elementsRow as any).water ?? 0,
            fire: (elementsRow as any).fire ?? 0,
            earth: (elementsRow as any).earth ?? 0,
            air: (elementsRow as any).air ?? 0,
            ice: (elementsRow as any).ice ?? 0,
            storm: (elementsRow as any).storm ?? 0,
            light: (elementsRow as any).light ?? 0,
            shadow: (elementsRow as any).shadow ?? 0,
          }
        : null;

    return res.json({
      pet: {
        ...activePetResolved,
        personality_name:
          activePetResolved.personality_name ??
          activePetResolved.personality ??
          activePetResolved.personality_key ??
          null,
      },
      stats,
      total_points,
      hp_display,
      elements,
      team,
      starter_merchant: starterMerchant,
    });
  } catch (error) {
    console.error("[care/current] failed", error);

    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to load pet page.",
    });
  }
});

careRouter.post("/feed", requireUser, async (req: AuthedRequest, res) => {
  try {
    const amount = Math.max(1, Math.min(50, safeNum(req.body?.amount, 20)));
    const result = await applyCarePatch(req.user!.id, { hunger: amount });
    return res.json({ success: true, ...result });
  } catch (error: any) {
    return res.status(error?.status ?? 500).json({
      error: error instanceof Error ? error.message : "Failed to feed pet.",
    });
  }
});

careRouter.post("/clean", requireUser, async (req: AuthedRequest, res) => {
  try {
    const amount = Math.max(1, Math.min(50, safeNum(req.body?.amount, 20)));
    const result = await applyCarePatch(req.user!.id, { clean: amount });
    return res.json({ success: true, ...result });
  } catch (error: any) {
    return res.status(error?.status ?? 500).json({
      error: error instanceof Error ? error.message : "Failed to clean pet.",
    });
  }
});

careRouter.post("/play", requireUser, async (req: AuthedRequest, res) => {
  try {
    const amount = Math.max(1, Math.min(50, safeNum(req.body?.amount, 20)));
    const result = await applyCarePatch(req.user!.id, { happy: amount });
    return res.json({ success: true, ...result });
  } catch (error: any) {
    return res.status(error?.status ?? 500).json({
      error:
        error instanceof Error ? error.message : "Failed to play with pet.",
    });
  }
});

careRouter.post("/pet", requireUser, async (req: AuthedRequest, res) => {
  try {
    const comfortBoost = Math.max(
      1,
      Math.min(50, safeNum(req.body?.comfortAmount, 10)),
    );
    const moodBoost = Math.max(
      1,
      Math.min(50, safeNum(req.body?.moodAmount, 5)),
    );
    const result = await applyCarePatch(req.user!.id, {
      comfort: comfortBoost,
      happy: moodBoost,
    });
    return res.json({ success: true, ...result });
  } catch (error: any) {
    return res.status(error?.status ?? 500).json({
      error: error instanceof Error ? error.message : "Failed to pet Delta.",
    });
  }
});

careRouter.post(
  "/dev/runaway",
  devOnly,
  requireUser,
  async (req: AuthedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { pet } = await fetchActivePet(userId);

      if (!pet?.id) {
        return res.status(404).json({ error: "No active pet found" });
      }

      const timestamp = new Date().toISOString();

      await updatePetCareStats(pet.id, {
        hunger: 50,
        clean: 50,
        happy: 50,
        comfort: 50,
        rest: 50,
        energy: 100,
        neglect_hours: 0,
        ran_away: false,
        runaway_at: null,
        last_care_update: timestamp,
        last_care_decay_at: timestamp,
      });

      const { data: updatedPet, error } = await supabaseAdmin
        .from("pets")
        .select("*")
        .eq("id", pet.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return res.json({
        success: true,
        message: "Active pet was forced to run away.",
        pet: normalizePetForClient(updatedPet ?? pet),
      });
    } catch (error) {
      console.error("[care/dev/runaway] failed", error);

      return res.status(500).json({
        error:
          error instanceof Error ? error.message : "Failed to force runaway.",
      });
    }
  },
);

careRouter.post(
  "/dev/reset",
  devOnly,
  requireUser,
  async (req: AuthedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { pet } = await fetchActivePet(userId);

      if (!pet?.id) {
        return res.status(404).json({ error: "No active pet found" });
      }

      const timestamp = new Date().toISOString();

      await updatePetCareStats(pet.id, {
        hunger: 50,
        clean: 50,
        happy: 50,
        comfort: 50,
        rest: 50,
        energy: 100,
        neglect_hours: 0,
        ran_away: false,
        runaway_at: null,
        last_care_update: timestamp,
        last_care_decay_at: timestamp,
      });

      const { data: updatedPet, error } = await supabaseAdmin
        .from("pets")
        .select("*")
        .eq("id", pet.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return res.json({
        success: true,
        message: "Active pet care was reset.",
        pet: normalizePetForClient(updatedPet ?? pet),
      });
    } catch (error) {
      console.error("[care/dev/reset] failed", error);

      return res.status(500).json({
        error:
          error instanceof Error ? error.message : "Failed to reset pet care.",
      });
    }
  },
);

careRouter.post("/place", requireUser, async (req: AuthedRequest, res) => {
  try {
    const userId = req.user!.id;
    const petId = String(req.body?.petId ?? "").trim();

    if (!petId) {
      return res.status(400).json({ error: "petId is required." });
    }

    const { data: ownedPet, error: ownedPetError } = await supabaseAdmin
      .from("pets")
      .select("id,user_id,ran_away")
      .eq("id", petId)
      .eq("user_id", userId)
      .maybeSingle();

    if (ownedPetError) {
      return res.status(500).json({ error: ownedPetError.message });
    }

    if (!ownedPet?.id) {
      return res.status(404).json({ error: "That Delta was not found." });
    }

    if (ownedPet.ran_away) {
      return res
        .status(400)
        .json({ error: "That Delta has already run away." });
    }

    const { error: clearError } = await supabaseAdmin
      .from("pets")
      .update({ is_active: false, location: "storage" })
      .eq("user_id", userId)
      .eq("is_active", true);

    if (clearError) {
      return res.status(500).json({ error: clearError.message });
    }

    const { error: activateError } = await supabaseAdmin
      .from("pets")
      .update({ is_active: true, location: "active" })
      .eq("id", petId)
      .eq("user_id", userId);

    if (activateError) {
      return res.status(500).json({ error: activateError.message });
    }

    return res.json({ success: true, petId });
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to place active pet.",
    });
  }
});
