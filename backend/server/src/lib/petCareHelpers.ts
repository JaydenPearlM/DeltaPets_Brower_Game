import { supabaseAdmin } from "./supabaseAdmin";
import { fetchActivePet } from "../routes/routePets/petsRepo";
import { applyCareDecay } from "../shared/pets/care/CareDecay";

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
  last_care_update?: string;
  last_care_decay_at: string;
};

const CARE_DEFAULT = 50;
const ENERGY_DEFAULT = 100;

function safeWhole(value: unknown, fallback: number, min = 0, max = 50) {
  const n = Number(value ?? fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function safeEnergy(value: unknown, fallback = ENERGY_DEFAULT) {
  return safeWhole(value, fallback, 0, 100);
}

export function normalizePetForClient<T extends Record<string, any>>(
  pet: T,
): T {
  const clean = safeWhole(pet.clean ?? pet.cleanliness, CARE_DEFAULT);
  const happy = safeWhole(pet.happy ?? pet.happiness, CARE_DEFAULT);
  const ranAway = Boolean(pet.ran_away ?? pet.is_runaway);
  const lastCareDecayAt =
    pet.last_care_decay_at ?? pet.last_care_update ?? new Date().toISOString();

  return {
    ...pet,
    hunger: safeWhole(pet.hunger, CARE_DEFAULT),
    clean,
    cleanliness: clean,
    happy,
    happiness: happy,
    comfort: safeWhole(pet.comfort, CARE_DEFAULT),
    rest: safeWhole(pet.rest, CARE_DEFAULT),
    energy: safeEnergy(pet.energy, ENERGY_DEFAULT),
    neglect_hours: Number(pet.neglect_hours ?? 0) || 0,
    ran_away: ranAway,
    is_runaway: ranAway,
    last_care_update: lastCareDecayAt,
    last_care_decay_at: lastCareDecayAt,
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
      happy: safeWhole(updates.happy, CARE_DEFAULT),
      comfort: safeWhole(updates.comfort, CARE_DEFAULT),
      rest: safeWhole(updates.rest, CARE_DEFAULT),
      energy: safeEnergy(updates.energy, ENERGY_DEFAULT),
      neglect_hours: Math.max(
        0,
        Math.round(Number(updates.neglect_hours ?? 0)),
      ),
      ran_away: updates.ran_away,
      runaway_at: updates.runaway_at,
      last_care_decay_at: updates.last_care_decay_at,
    })
    .eq("id", petId);

  if (error) throw error;

  // A runaway pet needs to actually vacate the party, not just get flagged.
  // party_slots has no ran_away awareness of its own, so without this the
  // pet keeps occupying its slot forever: it still shows up in the team
  // list, and the slot can never be reassigned to a recovered or new pet.
  if (updates.ran_away) {
    const { error: runawayPetError } = await supabaseAdmin
      .from("pets")
      .update({ is_active: false, location: "storage" })
      .eq("id", petId);

    if (runawayPetError) throw runawayPetError;

    const { error: slotError } = await supabaseAdmin
      .from("party_slots")
      .delete()
      .eq("pet_id", petId);

    if (slotError) throw slotError;
  }
}

/**
 * Fetches the active pet, applies decay, updates one or more care stats,
 * and writes the result back to the database.
 *
 * @param userId  - authenticated user id
 * @param patch   - the stats to change, e.g. { hunger: 10 } adds 10 to hunger
 * @returns the updated stat values clamped to [0, 50]
 */
export async function applyCarePatch(
  userId: string,
  patch: Partial<
    Record<"hunger" | "clean" | "happy" | "comfort" | "rest", number>
  >,
): Promise<Record<string, number>> {
  const { pet } = await fetchActivePet(userId);

  if (!pet?.id) {
    throw Object.assign(new Error("No active pet found"), { status: 404 });
  }

  const current = normalizePetForClient(
    applyCareDecay(normalizePetForClient(pet)),
  );

  const CARE_MAX = 50;

  const now = new Date().toISOString();

  const next = {
    hunger: Math.min(
      CARE_MAX,
      safeWhole(current.hunger, CARE_DEFAULT) + (patch.hunger ?? 0),
    ),
    clean: Math.min(
      CARE_MAX,
      safeWhole(current.clean, CARE_DEFAULT) + (patch.clean ?? 0),
    ),
    happy: Math.min(
      CARE_MAX,
      safeWhole(current.happy, CARE_DEFAULT) + (patch.happy ?? 0),
    ),
    comfort: Math.min(
      CARE_MAX,
      safeWhole(current.comfort, CARE_DEFAULT) + (patch.comfort ?? 0),
    ),
    rest: Math.min(
      CARE_MAX,
      safeWhole(current.rest, CARE_DEFAULT) + (patch.rest ?? 0),
    ),
  };

  await updatePetCareStats(current.id, {
    ...next,
    energy: safeEnergy(current.energy),
    neglect_hours: Math.max(0, Number(current.neglect_hours ?? 0)),
    ran_away: Boolean(current.ran_away),
    runaway_at: current.runaway_at ?? null,
    last_care_update: now,
    last_care_decay_at: now,
  });

  return Object.fromEntries(
    Object.keys(patch).map((key) => [key, next[key as keyof typeof next]]),
  );
}
