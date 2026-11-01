import { supabaseAdmin } from "./supabaseAdmin";

export type EquipmentState = {
  ready: boolean;
  wardrobe: string[];
  relics: { petId: string; slug: string }[];
};
export const equipmentMigrationMissing = (error: { code?: string } | null) =>
  error?.code === "PGRST202" || error?.code === "42883";

export async function getEquipmentState(userId: string): Promise<EquipmentState> {
  const { data, error } = await supabaseAdmin.rpc("get_player_equipment", { p_user_id: userId });
  if (!error) {
    if (!Array.isArray(data?.wardrobe) || !Array.isArray(data?.relics)) throw new Error("Invalid equipment response");
    return { ...data, ready: true };
  }
  if (!equipmentMigrationMissing(error)) throw error;
  // Preserve existing wardrobe/inventory reads while the additive draft is unapplied.
  const result = await supabaseAdmin.from("profiles").select("avatar_customization").eq("user_id", userId).maybeSingle();
  if (result.error) throw result.error;
  const appearance = result.data?.avatar_customization ?? {};
  return { ready: false, relics: [], wardrobe: [appearance.upperBodyClothing,
    appearance.lowerBodyClothing, appearance.hat, appearance.eyewear].filter((slug): slug is string => typeof slug === "string" && slug.length > 0) };
}
