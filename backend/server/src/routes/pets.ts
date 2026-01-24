import { Router } from "express";
import type { Response } from "express";
import { requireUser, type AuthedRequest } from "../middleware/auth";
import { supabaseAdmin } from "../lib/supabaseAdmin";

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

function hatchPayload(pet: any, serverNowMs: number) {
  const remaining_ms = msUntil(pet?.hatch_ready_at, serverNowMs);
  const ready =
    remaining_ms === 0 && pet?.stage === "egg" && !!pet?.hatch_ready_at;

  return {
    ready,
    hatch_ready_at: pet?.hatch_ready_at ?? null,
    remaining_ms,
  };
}

// ✅ keep config constants outside handlers
const BASIC_EGG_HATCH_MINUTES = 2;

/**
 * GET /pets/active
 * Returns active pet + server_now + hatch info (remaining_ms).
 */
petsRouter.get(
  "/pets/active",
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
      });
    }

    return res.json({
      server_now: new Date(serverNowMs).toISOString(),
      pet,
      hatch: hatchPayload(pet, serverNowMs),
    });
  },
);

/**
 * POST /pets/ensure-egg
 * Creates the user's first egg if they don't already have a pet row.
 * IMPORTANT: If a pet already exists, it returns it and does NOT overwrite timers.
 */
petsRouter.post(
  "/pets/ensure-egg",
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
    const hatchReadyAt = new Date(serverNowMs + hatchMs).toISOString();

    const { data: created, error: createErr } = await supabaseAdmin
      .from("pets")
      .insert({
        user_id: userId,
        line,
        stage: "egg",
        hatch_ready_at: hatchReadyAt,
      })
      .select("*")
      .single();

    if (createErr) return res.status(500).json({ error: createErr.message });

    return res.json({
      server_now: new Date(serverNowMs).toISOString(),
      created: true,
      pet: created,
      hatch: hatchPayload(created, serverNowMs),
    });
  },
); // ✅ THIS was missing in your file

/**
 * POST /pets/hatch
 * Server-authoritative hatching:
 * - Must exist
 * - Must be stage "egg"
 * - Must be ready (remaining_ms === 0)
 */
petsRouter.post(
  "/pets/hatch",
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

    const remaining_ms = msUntil(pet.hatch_ready_at, serverNowMs);
    if (remaining_ms > 0) {
      return res.status(400).json({ error: "Egg is not ready yet" });
    }

    const nowIso = new Date(serverNowMs).toISOString();

    const { data: updated, error: upErr } = await supabaseAdmin
      .from("pets")
      .update({
        stage: "sprout",
        hatched_at: nowIso,
        hatch_ready_at: null,
      })
      .eq("id", pet.id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (upErr) return res.status(500).json({ error: upErr.message });

    return res.json({
      server_now: nowIso,
      pet: updated,
    });
  },
);
