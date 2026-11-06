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

  // Serialize with Wildwood progression so a stale read cannot overwrite XP.
  const { data, error } = await supabaseAdmin.rpc("increment_active_pet_xp", {
    p_user_id: userId,
    p_amount: safeAmount,
  });

  if (error) throw error;
  return data as PetXpAward;
}
