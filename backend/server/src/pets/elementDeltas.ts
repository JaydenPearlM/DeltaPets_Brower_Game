import { z } from "zod";
import { supabaseAdmin } from "../lib/supabaseAdmin";

export const deltaElementSchema = z.enum([
  "null_element",
  "water",
  "fire",
  "earth",
  "air",
  "ice",
  "storm",
  "light",
  "shadow",
]);

export type DeltaElement = z.infer<typeof deltaElementSchema>;

const awardElementDeltaResultSchema = z.object({
  success: z.boolean(),
  absorbed: z.boolean().optional(),
  element: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  total: z.number().int().nonnegative().optional(),
  reason: z.string().optional(),
  error: z.string().optional(),
});

export type AwardElementDeltaResult = z.infer<
  typeof awardElementDeltaResultSchema
>;

export async function awardElementDeltaToPet(
  userId: string,
  petId: string,
  element: DeltaElement,
  quantity = 1,
): Promise<AwardElementDeltaResult> {
  const parsedElement = deltaElementSchema.parse(element);

  if (!userId.trim()) {
    throw new Error("User ID is required.");
  }

  if (!petId.trim()) {
    throw new Error("Kith ID is required.");
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Delta quantity must be a positive whole number.");
  }

  const { data, error } = await supabaseAdmin.rpc("award_pet_element_delta", {
    p_user_id: userId,
    p_pet_id: petId,
    p_element: parsedElement,
    p_quantity: quantity,
  });

  if (error) {
    throw error;
  }

  const parsedResult = awardElementDeltaResultSchema.safeParse(data);

  if (!parsedResult.success) {
    throw new Error("Invalid Delta award response.");
  }

  const result = parsedResult.data;

  if (!result.success) {
    throw new Error(result.error || "Failed to award elemental Delta.");
  }

  return result;
}
