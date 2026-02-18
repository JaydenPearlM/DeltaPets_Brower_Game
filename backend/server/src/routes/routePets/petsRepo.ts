// backend/server/src/routes/routePets/pets.repo.ts

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
 * Finds it at ANY stage (egg/baby/etc.) so ensure-egg becomes idempotent.
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
