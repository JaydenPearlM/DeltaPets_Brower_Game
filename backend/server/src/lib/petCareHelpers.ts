import { supabaseAdmin } from "./supabaseAdmin";

export type PetCareStatsUpdate = {
  hunger: number;
  clean: number;
  happy: number;
  comfort: number;
  rest: number;
  energy: number;
  neglect_hours: number;
  ran_away: boolean;
  runaway_at: string | null;
  last_care_update: string;
  last_care_decay_at: string;
};

const CARE_DEFAULT = 50;

function safeWhole(value: unknown, fallback: number, min = 0, max = 50) {
  const n = Number(value ?? fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function normalizePetForClient<T extends Record<string, any>>(
  pet: T,
): T {
  return {
    ...pet,
    hunger: safeWhole(pet.hunger, CARE_DEFAULT),
    clean: safeWhole(pet.clean ?? pet.cleanliness, CARE_DEFAULT),
    cleanliness: safeWhole(pet.cleanliness ?? pet.clean, CARE_DEFAULT),
    happy: safeWhole(pet.happy ?? pet.happiness, CARE_DEFAULT),
    happiness: safeWhole(pet.happiness ?? pet.happy, CARE_DEFAULT),
    comfort: safeWhole(pet.comfort, CARE_DEFAULT),
    rest: safeWhole(pet.rest, CARE_DEFAULT),
    energy: safeWhole(pet.energy, CARE_DEFAULT),
    neglect_hours: Number(pet.neglect_hours ?? 0) || 0,
    ran_away: Boolean(pet.ran_away ?? pet.is_runaway),
    is_runaway: Boolean(pet.is_runaway ?? pet.ran_away),
    last_care_update:
      pet.last_care_update ??
      pet.last_care_decay_at ??
      new Date().toISOString(),
    last_care_decay_at:
      pet.last_care_decay_at ??
      pet.last_care_update ??
      new Date().toISOString(),
  };
}

export async function updatePetCareStats(
  petId: string,
  updates: PetCareStatsUpdate,
): Promise<void> {
  if (!petId?.trim()) {
    throw new Error("Cannot update pet care stats without a valid pet id.");
  }

  const { error } = await supabaseAdmin
    .from("pets")
    .update({
      hunger: safeWhole(updates.hunger, CARE_DEFAULT),
      clean: safeWhole(updates.clean, CARE_DEFAULT),
      cleanliness: safeWhole(updates.clean, CARE_DEFAULT),
      happy: safeWhole(updates.happy, CARE_DEFAULT),
      happiness: safeWhole(updates.happy, CARE_DEFAULT),
      comfort: safeWhole(updates.comfort, CARE_DEFAULT),
      rest: safeWhole(updates.rest, CARE_DEFAULT),
      energy: safeWhole(updates.energy, CARE_DEFAULT),
      neglect_hours: Math.max(
        0,
        Math.round(Number(updates.neglect_hours ?? 0)),
      ),
      ran_away: updates.ran_away,
      is_runaway: updates.ran_away,
      runaway_at: updates.runaway_at,
      last_care_update: updates.last_care_update,
      last_care_decay_at: updates.last_care_decay_at,
    })
    .eq("id", petId);

  if (error) throw error;
}
