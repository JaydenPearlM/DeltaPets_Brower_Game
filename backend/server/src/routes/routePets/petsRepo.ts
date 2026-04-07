// backend/server/src/routes/routePets/petsRepo.ts

import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { STARTER_SPROUTS } from "./starters";

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
 * Finds it at ANY stage (egg/hatchling/etc.) so ensure-egg becomes idempotent.
 */
export async function fetchStarterPetAnyStage(userId: string) {
  const starterNames = STARTER_SPROUTS.map((s) => s.name);

  const { data, error } = await supabaseAdmin
    .from("pets")
    .select("*")
    .eq("user_id", userId)
    .in("name", starterNames)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export type HatcherySlotWithPet = {
  id: string;
  user_id: string;
  slot_index: number;
  unlocked: boolean;
  pet_id: string | null;
  pet: any | null;
};

export type HatcheryShelfSlot = {
  id: string;
  user_id: string;
  slot_index: number;
  unlocked: boolean;
  item_key: string | null;
};

export async function ensureHatcherySlots(userId: string) {
  const { data: existingRows, error: existingError } = await supabaseAdmin
    .from("hatchery_slots")
    .select("id, slot_index, unlocked, pet_id")
    .eq("user_id", userId)
    .order("slot_index", { ascending: true });

  if (existingError) throw existingError;

  const existing = existingRows ?? [];
  const existingIndexes = new Set(
    existing.map((row: any) => Number(row.slot_index)).filter(Number.isFinite),
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

  const { pet: firstEgg } = await fetchHatcheryEgg(userId);

  if (firstEgg) {
    const slot1 = existing.find((row: any) => Number(row.slot_index) === 1);

    if (!slot1?.pet_id) {
      const { error: updateError } = await supabaseAdmin
        .from("hatchery_slots")
        .update({
          pet_id: firstEgg.id,
          unlocked: true,
        })
        .eq("user_id", userId)
        .eq("slot_index", 1);

      if (updateError) throw updateError;
    }
  }
}

export async function fetchHatcherySlots(
  userId: string,
): Promise<{ slots: HatcherySlotWithPet[] }> {
  await ensureHatcherySlots(userId);

  const { data: slotRows, error: slotError } = await supabaseAdmin
    .from("hatchery_slots")
    .select("id, user_id, slot_index, unlocked, pet_id")
    .eq("user_id", userId)
    .order("slot_index", { ascending: true });

  if (slotError) throw slotError;

  const slots = (slotRows ?? []) as Array<{
    id: string;
    user_id: string;
    slot_index: number;
    unlocked: boolean;
    pet_id: string | null;
  }>;

  const petIds = slots
    .map((slot) => slot.pet_id)
    .filter((value): value is string => Boolean(value));

  const petsById = new Map<string, any>();

  if (petIds.length > 0) {
    const { data: petRows, error: petError } = await supabaseAdmin
      .from("pets")
      .select("*")
      .in("id", petIds);

    if (petError) throw petError;

    for (const pet of petRows ?? []) {
      petsById.set((pet as any).id, pet);
    }
  }

  return {
    slots: slots.map((slot) => ({
      ...slot,
      pet: slot.pet_id ? (petsById.get(slot.pet_id) ?? null) : null,
    })),
  };
}

export async function ensureHatcheryShelfSlots(userId: string) {
  const { data: existingRows, error: existingError } = await supabaseAdmin
    .from("hatchery_shelf_slots")
    .select("id, slot_index, unlocked, item_key")
    .eq("user_id", userId)
    .order("slot_index", { ascending: true });

  if (existingError) throw existingError;

  const existing = existingRows ?? [];
  const existingIndexes = new Set(
    existing.map((row: any) => Number(row.slot_index)).filter(Number.isFinite),
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

export async function fetchHatcheryShelfSlots(
  userId: string,
): Promise<{ shelfSlots: HatcheryShelfSlot[] }> {
  await ensureHatcheryShelfSlots(userId);

  const { data, error } = await supabaseAdmin
    .from("hatchery_shelf_slots")
    .select("id, user_id, slot_index, unlocked, item_key")
    .eq("user_id", userId)
    .order("slot_index", { ascending: true });

  if (error) throw error;

  return {
    shelfSlots: (data ?? []) as HatcheryShelfSlot[],
  };
}
