// backend/server/src/routes/care/care.ts
// backend/server/src/routes/care/care.ts
import { Router } from "express";
import type { NextFunction, Response } from "express";
import { safeNum } from "../../lib/utils";
import { logger } from "../../lib/logger";
import { requireUser, type AuthedRequest } from "../../middleware/auth";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { fetchTotalPoints } from "../routePets/petsStats";
import { fetchActivePet } from "../routePets/petsRepo";
import { applyCareDecay } from "../../shared/pets/care/CareDecay";
import { findCharacterProfileBySpeciesId } from "../../shared/pets/characterProfiles/characterRegistry";
import {
  assertCooldownReady,
  calcNewCooldownEndsAtIso,
  colNameForKey,
  type CooldownKey,
} from "../../pets/cooldowns";
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

const STARTER_MERCHANT_HREF = "/pet";

type StarterMerchantState = {
  show: boolean;
  href: string;
  title: string;
  body: string;
  ctaLabel: string;
};
type PetLanguageProgress = {
  rune_count: number;
  highest_rune: number;
  hatchling_fluent: boolean;
  owned_rune_keys: string[];
};

async function getPetLanguageProgress(
  userId: string,
): Promise<PetLanguageProgress> {
  const { data: ownedRows, error: ownedError } = await supabaseAdmin
    .from("user_runes")
    .select("rune_id")
    .eq("user_id", userId);

  if (ownedError) {
    throw ownedError;
  }

  const runeIds = (ownedRows ?? [])
    .map((row: any) => row?.rune_id)
    .filter(
      (value: unknown): value is string =>
        typeof value === "string" && value.trim().length > 0,
    );

  if (!runeIds.length) {
    return {
      rune_count: 0,
      highest_rune: 0,
      hatchling_fluent: false,
      owned_rune_keys: [],
    };
  }

  const { data: runeRows, error: runeError } = await supabaseAdmin
    .from("rune_defs")
    .select("key,rune_number")
    .in("id", runeIds)
    .order("rune_number", { ascending: true });

  if (runeError) {
    throw runeError;
  }

  const runes = (runeRows ?? []).filter(
    (row: any) =>
      typeof row?.key === "string" && Number.isFinite(Number(row?.rune_number)),
  );

  const ownedRuneKeys = runes.map((row: any) => String(row.key));

  return {
    rune_count: runes.length,
    highest_rune: runes.reduce(
      (highest: number, row: any) =>
        Math.max(highest, Number(row.rune_number ?? 0)),
      0,
    ),
    hatchling_fluent: ownedRuneKeys.includes("rune_of_first_speech"),
    owned_rune_keys: ownedRuneKeys,
  };
}

async function getStarterMerchantState(
  userId: string,
): Promise<StarterMerchantState | null> {
  const { data, error } = await supabaseAdmin
    .from("pets")
    .select("id,ran_away,stage")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  const pets = Array.isArray(data) ? data : [];
  const livingPets = pets.filter((row: any) => row?.stage !== "egg");
  const totalOwned = livingPets.length;
  const healthyCount = livingPets.filter((row: any) => !row?.ran_away).length;
  if (totalOwned > 0 && healthyCount === 0) {
    return {
      show: true,
      href: STARTER_MERCHANT_HREF,
      title: "You Lost Your Last Delta",
      body: 'Every Delta you had has run off. A hunched spellcaster with a fuzzy, half-hidden face steps out from a hidden lair. "Take care of them more often, or buy items to help." He holds out a new egg.',
      ctaLabel: "Accept the Egg",
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
    character_profile: null,
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
  const clean = wholeCare(pet.clean, 50);
  const happy = wholeCare(pet.happy, 50);
  const neglectHours = wholeStat(pet.neglect_hours, 0, 0);

  return (hunger <= 0 || clean <= 0 || happy <= 0) && neglectHours >= 72;
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

  const { error: activeError } = await supabaseAdmin
    .from("pets")
    .update({ is_active: false })
    .eq("id", pet.id);

  if (activeError) throw activeError;

  const { error: partyError } = await supabaseAdmin
    .from("party_slots")
    .delete()
    .eq("pet_id", pet.id);

  if (partyError) throw partyError;

  const userId = String(pet.user_id ?? "");

  if (!userId) return;

  const { data: remainingSlots, error: remainingSlotsError } =
    await supabaseAdmin
      .from("party_slots")
      .select("pet_id,slot_index")
      .eq("user_id", userId)
      .order("slot_index", { ascending: true });

  if (remainingSlotsError) throw remainingSlotsError;

  for (let index = 0; index < (remainingSlots ?? []).length; index += 1) {
    const slot = (remainingSlots ?? [])[index];
    const targetSlotIndex = index + 1;

    if (Number(slot.slot_index) === targetSlotIndex) continue;

    const { error: compactSlotError } = await supabaseAdmin
      .from("party_slots")
      .update({ slot_index: targetSlotIndex })
      .eq("user_id", userId)
      .eq("pet_id", slot.pet_id);

    if (compactSlotError) throw compactSlotError;

    slot.slot_index = targetSlotIndex;
  }

  const remainingPetIds = (remainingSlots ?? [])
    .map((row: any) => row?.pet_id)
    .filter(
      (petId: unknown): petId is string =>
        typeof petId === "string" && petId.trim().length > 0,
    );

  if (!remainingPetIds.length) return;

  const { data: healthyPets, error: healthyPetsError } = await supabaseAdmin
    .from("pets")
    .select("id")
    .eq("user_id", userId)
    .eq("ran_away", false)
    .neq("stage", "egg")
    .in("id", remainingPetIds);

  if (healthyPetsError) throw healthyPetsError;

  const healthyPetIds = new Set(
    (healthyPets ?? []).map((row: any) => String(row.id)),
  );

  const nextPetId = remainingPetIds.find((petId: string) =>
    healthyPetIds.has(petId),
  );

  if (!nextPetId) return;

  const { error: activateError } = await supabaseAdmin
    .from("pets")
    .update({ is_active: true, location: "active" })
    .eq("id", nextPetId)
    .eq("user_id", userId);

  if (activateError) throw activateError;
}

async function hydrateMutationTraits(pet: Record<string, any>) {
  if (!pet?.id) return pet;

  const { data, error } = await supabaseAdmin
    .from("pet_mutations")
    .select(
      "slot_index,has_mutation,mutations:mutation_id(name,key,rarity,description,effect_summary,drawback_summary,effects)",
    )
    .eq("pet_id", pet.id)
    .eq("has_mutation", true)
    .order("slot_index", { ascending: true });

  if (error || !Array.isArray(data)) return pet;

  const mutations = data
    .map((row: any) => row?.mutations)
    .filter(Boolean)
    .map((mutation: any) => ({
      name: mutation.name ?? mutation.key ?? null,
      key: mutation.key ?? null,
      rarity: mutation.rarity ?? null,
      description: mutation.description ?? null,
      effect_summary: mutation.effect_summary ?? null,
      drawback_summary: mutation.drawback_summary ?? null,
      effects: mutation.effects ?? null,
    }))
    .filter((mutation: any) => mutation.name || mutation.key);

  return {
    ...pet,
    mutations,
    mutation_trait_names: mutations
      .map((mutation: any) => mutation.name ?? mutation.key)
      .filter(Boolean),
  };
}

async function hydratePassiveTrait(pet: Record<string, any>) {
  if (!pet?.passive_trait_id && !pet?.passive_trait_key) return pet;

  let query = supabaseAdmin
    .from("passive_traits")
    .select("id,key,name,rarity,description,effect_summary,effects,stat_key")
    .eq("is_active", true);

  if (pet.passive_trait_id) {
    query = query.eq("id", pet.passive_trait_id);
  } else {
    query = query.eq("key", pet.passive_trait_key);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) return pet;

  return {
    ...pet,
    passive_trait_id: data.id,
    passive_trait_key: data.key,
    passive_trait_name: data.name,
    passive_trait_rarity: data.rarity,
    passive_trait_description: data.description,
    passive_trait_effect_summary: data.effect_summary,
    passive_trait_effects: data.effects,
    passive_trait_stat_key: data.stat_key,
  };
}
async function enforceCareCooldown(userId: string, action: CooldownKey) {
  const nowMs = Date.now();
  const { pet } = await fetchActivePet(userId);

  if (!pet?.id) {
    throw Object.assign(new Error("No active pet found"), { status: 404 });
  }

  assertCooldownReady(pet, action, nowMs);

  const col = colNameForKey(action);
  const { error } = await supabaseAdmin
    .from("pets")
    .update({
      [col]: calcNewCooldownEndsAtIso(nowMs, action),
    })
    .eq("id", pet.id);

  if (error) throw error;
}

careRouter.get("/spotlight", async (_req, res) => {
  try {
    const { data: slots, error: slotsError } = await supabaseAdmin
      .from("party_slots")
      .select("user_id,pet_id,slot_index")
      .eq("slot_index", 1)
      .order("user_id", { ascending: true });

    if (slotsError) {
      throw slotsError;
    }

    const candidates = Array.isArray(slots) ? slots : [];

    if (!candidates.length) {
      return res.json({ pet: null });
    }

    const rotationWindowMs = 2 * 60 * 60 * 1000;
    const rotationIndex =
      Math.floor(Date.now() / rotationWindowMs) % candidates.length;

    const selectedSlot = candidates[rotationIndex];

    const [
      { data: pet, error: petError },
      { data: profile, error: profileError },
    ] = await Promise.all([
      supabaseAdmin
        .from("pets")
        .select("*")
        .eq("id", selectedSlot.pet_id)
        .eq("ran_away", false)
        .neq("stage", "egg")
        .maybeSingle(),

      supabaseAdmin
        .from("profiles")
        .select("username,display_name")
        .eq("user_id", selectedSlot.user_id)
        .maybeSingle(),
    ]);

    if (petError) {
      throw petError;
    }

    if (profileError) {
      throw profileError;
    }

    if (!pet) {
      return res.json({ pet: null });
    }

    const hydratedPet = await hydrateMutationTraits(
      await hydratePassiveTrait(pet),
    );

    const rawElement = String(hydratedPet.line ?? "")
      .trim()
      .toLowerCase();

    const rawStage = String(hydratedPet.stage ?? "unknown")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

    return res.json({
      pet: {
        id: String(hydratedPet.id),

        username:
          profile?.username?.trim() ||
          profile?.display_name?.trim() ||
          "Trainer",

        species:
          hydratedPet.species?.trim() ||
          hydratedPet.name?.trim() ||
          "Unknown Delta",

        nickname: hydratedPet.nickname?.trim() || null,

        level: Number(hydratedPet.level ?? 1),

        element:
          rawElement === "neutral"
            ? "null"
            : rawElement.replace(/_element$/, "") || "null",

        stage: rawStage,

        personality: titleCaseValue(
          hydratedPet.personality_name ??
            hydratedPet.personality ??
            hydratedPet.personality_key,
          "Mysterious",
        ),

        passiveTrait:
          hydratedPet.passive_trait_name ??
          hydratedPet.passive_trait_key ??
          null,

        mutation: Array.isArray(hydratedPet.mutation_trait_names)
          ? (hydratedPet.mutation_trait_names[0] ?? null)
          : null,

        description: hydratedPet.description ?? null,

        growthStrongStats: Array.isArray(hydratedPet.growth_strong_stats)
          ? hydratedPet.growth_strong_stats
          : [],

        growthWeakStat:
          typeof hydratedPet.growth_weak_stat === "string"
            ? hydratedPet.growth_weak_stat
            : null,

        previewUrl:
          hydratedPet.portrait_url ||
          hydratedPet.sprite_url ||
          hydratedPet.image_url ||
          null,

        stats: {
          hpCur: Number(hydratedPet.hp_cur ?? 0),
          hpMax: Number(hydratedPet.hp_max ?? 0),
          atk: Number(hydratedPet.atk ?? 0),
          def: Number(hydratedPet.def ?? 0),
          spd: Number(hydratedPet.spd ?? 0),
          magi: Number(hydratedPet.magi ?? 0),
          mana: Number(hydratedPet.mana ?? 0),
        },
      },
    });
  } catch (error) {
    logger.error("[care/spotlight] failed", error);

    return res.status(500).json({
      error: "Failed to load spotlight pet.",
    });
  }
});

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
      logger.error("[care/current] failed to load party slots", slotError);
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
        logger.error("[care/current] failed to load team pets", teamError);
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
          logger.error(
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

      const hydratedTeamPets = await Promise.all(
        (teamPets ?? []).map(async (row: any) =>
          hydrateMutationTraits(await hydratePassiveTrait(row)),
        ),
      );

      const petMap = new Map<string, any>(
        hydratedTeamPets.map((row: any) => {
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

          const rawElement = String(source.line ?? "")
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
            element: titleCaseValue(source.line, "Unknown"),
            elementKey:
              rawElement === "neutral" ? "null_element" : rawElement || null,
            level: Number(source.level ?? 1),
            rarity: source.rarity ?? null,
            isActive: Boolean(source.is_active),
            previewUrl:
              source.portrait_url ||
              source.sprite_url ||
              source.image_url ||
              null,
            description: source.description ?? null,
            passive_trait_id: source.passive_trait_id ?? null,
            passive_trait_key: source.passive_trait_key ?? null,
            passive_trait_name: source.passive_trait_name ?? null,
            passive_trait_rarity: source.passive_trait_rarity ?? null,
            passive_trait_description: source.passive_trait_description ?? null,
            passive_trait_effect_summary:
              source.passive_trait_effect_summary ?? null,
            passive_trait_effects: source.passive_trait_effects ?? null,
            passive_trait_stat_key: source.passive_trait_stat_key ?? null,
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
        logger.error(
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

    activePetResolved = normalizePetForClient(
      await hydrateMutationTraits(await hydratePassiveTrait(activePetResolved)),
    );

    let hydratedPet = activePetResolved;

    try {
      hydratedPet = normalizePetForClient(applyCareDecay(activePetResolved));
    } catch (decayError) {
      logger.error("[care/current] applyCareDecay failed", decayError);
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
        happy: wholeCare(hydratedPet.happy, 50),
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
        logger.error("[care/current] fetchTotalPoints failed", pointsError);
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

    // starter_merchant is null on the happy path: the active pet's existence
    // already proves not all pets have run away, so there is no need to query
    // the pets table again. getStarterMerchantState is only relevant when
    // there is no active pet (handled by buildNoPetCareResponse above).
    const starterMerchant = null;
    const characterProfile = findCharacterProfileBySpeciesId(
      activePetResolved.species ?? null,
    );

    if (elementsResult.error) {
      logger.error(
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
        character_profile: characterProfile,
        starter_merchant: starterMerchant,
      });
    }

    const elementsRow = elementsResult.data;

    const elements =
      elementsRow && typeof elementsRow === "object"
        ? {
            null_element: (elementsRow as any).null_element ?? 0,
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
      character_profile: characterProfile,
      starter_merchant: starterMerchant,
    });
  } catch (error) {
    logger.error("[care/current] failed", error);

    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to load pet page.",
    });
  }
});

careRouter.post("/feed", requireUser, async (req: AuthedRequest, res) => {
  try {
    await enforceCareCooldown(req.user!.id, "feed");
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
    await enforceCareCooldown(req.user!.id, "clean");
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
    await enforceCareCooldown(req.user!.id, "play");
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

      await markPetAsRunaway({
        ...pet,
        neglect_hours: 999,
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
      logger.error("[care/dev/runaway] failed", error);

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
      logger.error("[care/dev/reset] failed", error);

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
      .update({ is_active: false })
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
