// backend/server/src/routes/routePets/petsRepo.ts

import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { STARTER_ANY_STAGE_NAMES } from "./starters";

// ---------------------------------------------------------------------------
// Pet queries
// ---------------------------------------------------------------------------

export async function fetchActivePet(userId: string) {
  {
    const { data, error } = await supabaseAdmin
      .from("pets")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) return { pet: data, used: "is_active" as const };
  }

  {
    const { data, error } = await supabaseAdmin
      .from("pets")
      .select("*")
      .eq("user_id", userId)
      .neq("stage", "egg")
      .order("hatched_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return { pet: data ?? null, used: "newest_non_egg" as const };
  }
}

export async function fetchHatcheryEgg(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("pets")
    .select("*")
    .eq("user_id", userId)
    .eq("stage", "egg")
    .not("hatch_ends_at", "is", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return { pet: data ?? null, used: "hatch_ends_at" as const };
}

/**
 * Starter/Mystery Egg is one-per-user.
 * Finds it at ANY stage so ensure-egg stays idempotent.
 */
export async function fetchStarterPetAnyStage(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("pets")
    .select("*")
    .eq("user_id", userId)
    .in("name", STARTER_ANY_STAGE_NAMES)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data ?? null;
}

// ---------------------------------------------------------------------------
// Hatchery initialization gate
// ---------------------------------------------------------------------------

/**
 * Returns true if this user's hatchery slots have already been set up.
 * Falls back to false if the column is missing or profile row doesn't exist —
 * both cases mean we should still run ensure.
 */
async function isHatcheryInitialized(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("hatchery_initialized")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return false;
  return (data as any).hatchery_initialized === true;
}

/**
 * Flips hatchery_initialized = true so future visits skip the ensure step.
 * Fire-and-forget — never throws. A missed flip just costs one extra ensure
 * on the next load, which is harmless.
 */
function markHatcheryInitialized(userId: string): void {
  supabaseAdmin
    .from("profiles")
    .update({ hatchery_initialized: true } as any)
    .eq("user_id", userId)
    .then(({ error }) => {
      if (error) {
        console.warn(
          "[petsRepo] Failed to mark hatchery initialized:",
          error.message,
        );
      }
    });
}

// ---------------------------------------------------------------------------
// Ensure functions — private, run ONCE per user on first hatchery visit
// ---------------------------------------------------------------------------

/**
 * Creates any missing hatchery slot rows (1–10) and wires the first egg
 * into slot 1 if it isn't already there.
 */
async function runEnsureHatcherySlots(userId: string): Promise<void> {
  const { data: existingRows, error: existingError } = await supabaseAdmin
    .from("hatchery_slots")
    .select("id, slot_index, unlocked, pet_id")
    .eq("user_id", userId)
    .order("slot_index", { ascending: true });

  if (existingError) throw existingError;

  const existing = existingRows ?? [];
  const existingIndexes = new Set<number>(
    existing
      .map((row: any) => Number(row.slot_index))
      .filter((value) => Number.isFinite(value)),
  );

  const missingRows = Array.from({ length: 10 }, (_, idx) => idx + 1)
    .filter((slotIndex) => !existingIndexes.has(slotIndex))
    .map((slotIndex) => ({
      user_id: userId,
      slot_index: slotIndex,
      unlocked: slotIndex === 1,
      pet_id: null,
    }));

  if (missingRows.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from("hatchery_slots")
      .insert(missingRows);

    if (insertError) throw insertError;
  }

  // Wire first egg into slot 1 if it isn't already
  const { pet: firstEgg } = await fetchHatcheryEgg(userId);

  if (firstEgg) {
    const slot1 = existing.find((row: any) => Number(row.slot_index) === 1);

    if (!slot1?.pet_id) {
      const { error: updateError } = await supabaseAdmin
        .from("hatchery_slots")
        .update({ pet_id: firstEgg.id, unlocked: true })
        .eq("user_id", userId)
        .eq("slot_index", 1);

      if (updateError) throw updateError;
    }
  }
}

/**
 * Creates any missing hatchery shelf slot rows (1–10).
 */
async function runEnsureHatcheryShelfSlots(userId: string): Promise<void> {
  const { data: existingRows, error: existingError } = await supabaseAdmin
    .from("hatchery_shelf_slots")
    .select("id, slot_index, unlocked, item_key")
    .eq("user_id", userId)
    .order("slot_index", { ascending: true });

  if (existingError) throw existingError;

  const existing = existingRows ?? [];
  const existingIndexes = new Set<number>(
    existing
      .map((row: any) => Number(row.slot_index))
      .filter((value) => Number.isFinite(value)),
  );

  const missingRows = Array.from({ length: 10 }, (_, idx) => idx + 1)
    .filter((slotIndex) => !existingIndexes.has(slotIndex))
    .map((slotIndex) => ({
      user_id: userId,
      slot_index: slotIndex,
      unlocked: slotIndex === 1,
      item_key: null,
    }));

  if (missingRows.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from("hatchery_shelf_slots")
      .insert(missingRows);

    if (insertError) throw insertError;
  }
}

/**
 * Runs both ensure functions in parallel, then flips the initialized flag.
 * Only called on a user's very first hatchery visit.
 */
async function initializeHatcheryForUser(userId: string): Promise<void> {
  await Promise.all([
    runEnsureHatcherySlots(userId),
    runEnsureHatcheryShelfSlots(userId),
  ]);

  // Fire-and-forget — don't block the response on this profile write
  markHatcheryInitialized(userId);
}

// ---------------------------------------------------------------------------
// Public fetch functions — what routes call
// ---------------------------------------------------------------------------

/**
 * Fetches all hatchery slots with their associated pet data.
 *
 * First visit:   flag=false → runs both ensure functions → flips flag → fetches data
 * Repeat visits: flag=true  → skips ensure entirely → fetches data
 *
 * Old cost every load:    2 ensure SELECTs + up to 20 INSERTs
 * New cost after setup:   1 flag SELECT + 1 slots SELECT + 1 optional pets SELECT
 */
export async function fetchHatcherySlots(userId: string) {
  const initialized = await isHatcheryInitialized(userId);

  if (!initialized) {
    await initializeHatcheryForUser(userId);
  }

  const { data: slotRows, error: slotError } = await supabaseAdmin
    .from("hatchery_slots")
    .select("id, user_id, slot_index, unlocked, pet_id")
    .eq("user_id", userId)
    .order("slot_index", { ascending: true });

  if (slotError) throw slotError;

  const slots = slotRows ?? [];
  const petIds = slots
    .map((slot: any) => slot.pet_id)
    .filter((value: any) => Boolean(value));

  const petsById = new Map<string, any>();

  if (petIds.length > 0) {
    const { data: petRows, error: petError } = await supabaseAdmin
      .from("pets")
      .select("*")
      .in("id", petIds);

    if (petError) throw petError;

    for (const pet of petRows ?? []) {
      petsById.set(pet.id, pet);
    }
  }

  return {
    slots: slots.map((slot: any) => ({
      ...slot,
      pet: slot.pet_id ? (petsById.get(slot.pet_id) ?? null) : null,
    })),
  };
}

/**
 * Fetches all hatchery shelf slots.
 *
 * The ensure step for shelf slots is handled inside fetchHatcherySlots via
 * initializeHatcheryForUser — both tables are set up in one pass. This
 * function is now a clean read-only fetch with no ensure overhead at all.
 *
 * routePets.ts calls fetchHatcherySlots and fetchHatcheryShelfSlots in
 * Promise.all, so fetchHatcherySlots always runs first and guarantees
 * initialization has happened by the time this returns.
 */
export async function fetchHatcheryShelfSlots(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("hatchery_shelf_slots")
    .select("id, user_id, slot_index, unlocked, item_key")
    .eq("user_id", userId)
    .order("slot_index", { ascending: true });

  if (error) throw error;

  return {
    shelfSlots: data ?? [],
  };
}
