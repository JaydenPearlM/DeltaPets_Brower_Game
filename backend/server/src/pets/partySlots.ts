import { supabaseAdmin } from "../lib/supabaseAdmin";

export async function assignPetToMainParty(
  userId: string,
  petId: string,
): Promise<number | null> {
  const { data: existingRows, error: slotsError } = await supabaseAdmin
    .from("party_slots")
    .select("id, slot_index, pet_id")
    .eq("user_id", userId)
    .order("slot_index", { ascending: true });

  if (slotsError) throw slotsError;

  const rows = existingRows ?? [];
  const alreadyAssigned = rows.find((row: any) => row.pet_id === petId);
  if (alreadyAssigned) return Number(alreadyAssigned.slot_index);

  const usedSlots = new Set<number>(
    rows.map((row: any) => Number(row.slot_index)).filter(Number.isFinite),
  );

  const targetSlot =
    Array.from({ length: 4 }, (_, idx) => idx + 1).find(
      (slot) => !usedSlots.has(slot),
    ) ?? null;

  if (!targetSlot) return null;

  const { error: insertError } = await supabaseAdmin
    .from("party_slots")
    .insert({ user_id: userId, pet_id: petId, slot_index: targetSlot });

  if (insertError) throw insertError;

  return targetSlot;
}
