import { supabaseAdmin } from "../lib/supabaseAdmin";

export async function applyHungerDecay(petId: string): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc("apply_hunger_decay", {
    p_pet_id: petId,
  });

  if (error) throw error;

  return data as number;
}
