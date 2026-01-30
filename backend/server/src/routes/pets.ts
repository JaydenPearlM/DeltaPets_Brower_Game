import { Router } from "express";
import type { Response } from "express";
import { requireUser, type AuthedRequest } from "../middleware/auth";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { cooldownsFromPetRow } from "../lib/cooldowns";

export const petsRouter = Router();

type EnsureEggBody = {
  line?: string; // "water" | "fire" | ...
};

const ALLOWED_LINES = new Set([
  "water",
  "fire",
  "earth",
  "air",
  "ice",
  "storm",
  "light",
  "shadow",
]);

function normalizeLine(input?: string) {
  const raw = (input ?? "water").toLowerCase().trim();
  return ALLOWED_LINES.has(raw) ? raw : "water";
}

function msUntil(iso: string | null | undefined, nowMs: number) {
  if (!iso) return 0;
  const end = Date.parse(iso);
  if (!Number.isFinite(end)) return 0;
  return Math.max(0, end - nowMs);
}

/**
 * Hatch payload used by /active + /ensure-egg + /hatch failure response
 * standardized naming:
 * - hatch_ends_at
 * - hatch_remaining_ms
 */
function hatchPayload(pet: any, serverNowMs: number) {
  const hatch_remaining_ms = msUntil(pet?.hatch_ends_at, serverNowMs);

  const ready =
    hatch_remaining_ms === 0 && pet?.stage === "egg" && !!pet?.hatch_ends_at;

  return {
    ready,
    hatch_ends_at: pet?.hatch_ends_at ?? null,
    hatch_remaining_ms,
  };
}

// keep config constants outside handlers
const BASIC_EGG_HATCH_MINUTES = 2;
// config constants
const HATCH_ALLOCATION_POINTS = 7;

function baseStatsForLine(line: string) {
  // Egg base stats:
  // - total = 6
  // - pet stats only (NOT elements)
  // - small elemental flavor, not power spikes

  switch (line) {
    case "fire":
      // aggressive lean
      return {
        hp: 1,
        atk: 2,
        magic: 1,
        def: 0,
        spd: 1,
        mana: 1,
        base_total: 6,
      };

    case "water":
      // magic + sustain
      return {
        hp: 2,
        atk: 0,
        magic: 2,
        def: 1,
        spd: 0,
        mana: 1,
        base_total: 6,
      };

    case "earth":
      // tanky baby
      return {
        hp: 2,
        atk: 1,
        magic: 0,
        def: 2,
        spd: 0,
        mana: 1,
        base_total: 6,
      };

    case "air":
      // speed-focused
      return {
        hp: 0,
        atk: 1,
        magic: 1,
        def: 0,
        spd: 3,
        mana: 1,
        base_total: 6,
      };

    case "ice":
      // balanced + defensive
      return {
        hp: 1,
        atk: 1,
        magic: 1,
        def: 2,
        spd: 0,
        mana: 1,
        base_total: 6,
      };

    case "storm":
      // caster-speed hybrid
      return {
        hp: 0,
        atk: 1,
        magic: 2,
        def: 0,
        spd: 2,
        mana: 1,
        base_total: 6,
      };

    case "light":
      // support/bulky
      return {
        hp: 2,
        atk: 0,
        magic: 2,
        def: 1,
        spd: 0,
        mana: 1,
        base_total: 6,
      };

    case "shadow":
      // glass cannon speed
      return {
        hp: 0,
        atk: 2,
        magic: 0,
        def: 0,
        spd: 3,
        mana: 1,
        base_total: 6,
      };

    default:
      // neutral fallback
      return {
        hp: 1,
        atk: 1,
        magic: 1,
        def: 1,
        spd: 1,
        mana: 1,
        base_total: 6,
      };
  }
}

/**
 * GET /api/pets/active
 * Returns active pet + server_now + hatch info + stats/elements/cooldowns.
 * NOTE: your schema doesn't show pets.is_active, so we do NOT filter by it.
 * Alpha assumption: 1 pet row per user.
 */
petsRouter.get(
  "/active",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    const userId = req.user!.id;
    const serverNowMs = Date.now();

    const { data: pet, error } = await supabaseAdmin
      .from("pets")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });

    if (!pet) {
      return res.json({
        server_now: new Date(serverNowMs).toISOString(),
        pet: null,
        hatch: null,
        stats: null,
        elements: null,
        cooldowns: null,
      });
    }

    const [{ data: stats, error: statsErr }, { data: elements, error: elErr }] =
      await Promise.all([
        supabaseAdmin
          .from("pet_stats")
          .select("*")
          .eq("pet_id", pet.id)
          .maybeSingle(),
        supabaseAdmin
          .from("pet_elements")
          .select("*")
          .eq("pet_id", pet.id)
          .maybeSingle(),
      ]);

    if (statsErr) return res.status(500).json({ error: statsErr.message });
    if (elErr) return res.status(500).json({ error: elErr.message });

    return res.json({
      server_now: new Date(serverNowMs).toISOString(),
      pet,
      hatch: hatchPayload(pet, serverNowMs),
      stats: stats ?? null,
      elements: elements ?? null,
      cooldowns: cooldownsFromPetRow(pet, serverNowMs),
    });
  },
);

/**
 * POST /api/pets/ensure-egg
 * Creates the user's first egg if they don't already have a pet row.
 * Also creates pet_stats + pet_elements so Hatchery can show level 0 stats + elements.
 * If a pet already exists, returns it and does NOT overwrite timers.
 */
petsRouter.post(
  "/ensure-egg",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    const userId = req.user!.id;
    const body = (req.body ?? {}) as EnsureEggBody;

    const line = normalizeLine(body.line);
    const serverNowMs = Date.now();

    // 1) If pet already exists, return it (DO NOT overwrite timers)
    const { data: existing, error: existingErr } = await supabaseAdmin
      .from("pets")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingErr)
      return res.status(500).json({ error: existingErr.message });

    if (existing) {
      return res.json({
        server_now: new Date(serverNowMs).toISOString(),
        created: false,
        pet: existing,
        hatch: hatchPayload(existing, serverNowMs),
      });
    }

    // 2) Create egg with SERVER time
    const hatchMs = BASIC_EGG_HATCH_MINUTES * 60 * 1000;
    const hatch_ends_at = new Date(serverNowMs + hatchMs).toISOString();

    const { data: created, error: createErr } = await supabaseAdmin
      .from("pets")
      .insert({
        user_id: userId,
        line,
        stage: "egg",
        hatch_ends_at,
        unspent_points: 0, // requires migration
      })
      .select("*")
      .single();

    if (createErr) return res.status(500).json({ error: createErr.message });

    // 3) Create base stats + elements for the egg (so Hatchery can show them)
    const baseStats = baseStatsForLine(line);
    const elementRow = elementRowForLine(line);

    const [statsIns, elementsIns] = await Promise.all([
      supabaseAdmin
        .from("pet_stats")
        .insert({ pet_id: created.id, ...baseStats }),
      supabaseAdmin
        .from("pet_elements")
        .insert({ pet_id: created.id, ...elementRow }),
    ]);

    if (statsIns.error)
      return res.status(500).json({ error: statsIns.error.message });
    if (elementsIns.error)
      return res.status(500).json({ error: elementsIns.error.message });

    return res.json({
      server_now: new Date(serverNowMs).toISOString(),
      created: true,
      pet: created,
      hatch: hatchPayload(created, serverNowMs),
    });
  },
);

/**
 * POST /api/pets/hatch
 * Server-authoritative hatching:
 * - Must exist
 * - Must be stage "egg"
 * - Must be ready (now >= hatch_ends_at)
 * On hatch: stage -> sprout, unspent_points -> 7
 */
petsRouter.post(
  "/hatch",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    const userId = req.user!.id;
    const serverNowMs = Date.now();

    const { data: pet, error } = await supabaseAdmin
      .from("pets")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!pet) return res.status(404).json({ error: "No pet found" });

    if (pet.stage !== "egg") {
      return res.status(400).json({ error: "Pet is not an egg" });
    }

    // Enforce hatch timer
    const hatch_remaining_ms = msUntil(pet.hatch_ends_at, serverNowMs);
    if (hatch_remaining_ms > 0) {
      return res.status(409).json({
        error: "Egg is not ready yet",
        server_now: new Date(serverNowMs).toISOString(),
        hatch: hatchPayload(pet, serverNowMs),
      });
    }

    const nowIso = new Date(serverNowMs).toISOString();

    const { data: updated, error: upErr } = await supabaseAdmin
      .from("pets")
      .update({
        stage: "sprout",
        hatched_at: nowIso,
        hatch_ends_at: null,
        unspent_points: HATCH_ALLOCATION_POINTS, // requires migration
      })
      .eq("id", pet.id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (upErr) return res.status(500).json({ error: upErr.message });

    return res.json({
      server_now: nowIso,
      pet: updated,
      awarded_points: HATCH_ALLOCATION_POINTS,
    });
  },
);
