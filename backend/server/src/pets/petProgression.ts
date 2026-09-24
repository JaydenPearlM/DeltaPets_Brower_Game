import { supabaseAdmin } from "../lib/supabaseAdmin";

export type PetXpAward = {
  petId: string;
  previousXp: number;
  xp: number;
  amount: number;
} | null;

export async function awardXpToActivePet(
  userId: string,
  amount: number,
): Promise<PetXpAward> {
  const safeAmount = Math.max(0, Math.floor(amount));

  if (safeAmount === 0) {
    return null;
  }

  const { data: pet, error } = await supabaseAdmin
    .from("pets")
    .select("id, xp")
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("ran_away", false)
    .maybeSingle();

  if (error) throw error;
  if (!pet) return null;

  const previousXp = Number(pet.xp ?? 0);
  const xp = previousXp + safeAmount;

  const { error: updateError } = await supabaseAdmin
    .from("pets")
    .update({ xp })
    .eq("id", pet.id)
    .eq("user_id", userId);

  if (updateError) throw updateError;

  return {
    petId: pet.id,
    previousXp,
    xp,
    amount: safeAmount,
  };
}
