// backend/server/src/lib/runaway.ts
import { nowIsoFromMs, toIso, toMsFromIso } from "../lib/time";

// Keep this in one place so gameplay tuning is easy.
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export type PetRowLike = {
  id: string;

  // runaway
  is_runaway?: boolean | null;
  runaway_at?: string | null;

  // feeding
  last_fed_at?: string | null;

  // optional fallback fields if you want later
  created_at?: string | null;
  hatched_at?: string | null;
};

// Minimal shape for the supabase admin client we need
type SupabaseAdminLike = {
  from: (table: string) => {
    update: (values: Record<string, any>) => any;
  };
};

/**
 * Marks a pet as runaway if it hasn't been fed in 3 days.
 *
 * SAFE BEHAVIOR:
 * - If last_fed_at is missing/invalid => does NOT mark runaway.
 *   (This prevents "null means exile" bugs.)
 * - If update fails => returns original pet (doesn't crash your route).
 * - If update succeeds => returns updated pet row so API response matches DB.
 */
export async function markRunawayIfNeeded(opts: {
  supabaseAdmin: SupabaseAdminLike;
  pet: PetRowLike | null;
  serverNowMs: number;
}) {
  const { supabaseAdmin, pet, serverNowMs } = opts;

  if (!pet) return pet;

  // Already runaway? Don't touch.
  if (pet.is_runaway) return pet;

  // Parse last_fed_at safely (ISO normalize -> ms)
  const lastFedIso = toIso(pet.last_fed_at);
  const lastFedMs = toMsFromIso(lastFedIso);

  // If last_fed_at isn't valid, don't mark runaway.
  // (Better to set last_fed_at at pet creation / hatch.)
  if (!Number.isFinite(lastFedMs)) return pet;

  const overdue = serverNowMs - lastFedMs >= THREE_DAYS_MS;
  if (!overdue) return pet;

  const runawayIso = nowIsoFromMs(serverNowMs);

  const { data: updatedPet, error } = await supabaseAdmin
    .from("pets")
    .update({
      is_runaway: true,
      runaway_at: runawayIso,
    })
    .eq("id", pet.id)
    .select("*")
    .single();

  if (error || !updatedPet) {
    // Fail soft; don't break the whole request.
    return pet;
  }

  return updatedPet as any;
}
