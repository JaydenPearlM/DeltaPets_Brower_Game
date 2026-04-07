// backend/server/src/lib/hunger.ts

import { supabaseAdmin } from "../lib/supabaseAdmin";

const HUNGER_DECAY_INTERVAL_MINUTES = 30; // -1 hunger per 30 minutes
const MAX_HUNGER = 100;

export async function applyHungerDecay(petId: string) {
  const { data: pet, error } = await supabaseAdmin
    .from("pets")
    .select("hunger, last_hunger_decay_at")
    .eq("id", petId)
    .maybeSingle();

  if (error) throw error;
  if (!pet) throw new Error("Pet not found for hunger decay.");

  const nowMs = Date.now();

  // If null, initialize to now (no decay this call)
  const lastTickMs = pet.last_hunger_decay_at
    ? new Date(pet.last_hunger_decay_at).getTime()
    : nowMs;

  const minutesPassed = Math.floor((nowMs - lastTickMs) / (1000 * 60));
  const decayAmount = Math.floor(minutesPassed / HUNGER_DECAY_INTERVAL_MINUTES);

  // Clamp existing hunger into 0..MAX_HUNGER (handles weird legacy values)
  const currentHunger = Math.max(
    0,
    Math.min(MAX_HUNGER, pet.hunger ?? MAX_HUNGER),
  );

  if (decayAmount <= 0) {
    // Ensure timestamp exists in DB for new pets (optional but nice)
    if (!pet.last_hunger_decay_at) {
      await supabaseAdmin
        .from("pets")
        .update({ last_hunger_decay_at: new Date(nowMs).toISOString() } as any)
        .eq("id", petId);
    }
    return currentHunger;
  }

  const newHunger = Math.max(0, currentHunger - decayAmount);

  const { error: updErr } = await supabaseAdmin
    .from("pets")
    .update({
      hunger: newHunger,
      last_hunger_decay_at: new Date(nowMs).toISOString(),
    } as any)
    .eq("id", petId);

  if (updErr) throw updErr;

  return newHunger;
}
