// backend/server/src/lib/validation.ts

import { z } from "zod";

export const petActionSchema = z.object({
  action: z.enum(["feed", "clean", "play", "bond"]),
});

export const careActionSchema = z.object({
  petId: z.string().uuid(),
  action: z.enum(["feed", "clean", "play", "comfort", "rest"]),
  amount: z.number().int().min(1).max(50).optional(),
});

// NEW: Validation schema for ensure-egg endpoint
export const ensureEggSchema = z.object({
  line: z
    .enum(["water", "fire", "earth", "air", "null_element"])
    .optional()
    .nullable(),
  worldTime: z.enum(["dawn", "day", "dusk", "night"]).optional().nullable(),
  personalityKey: z.string().min(1).max(50).optional().nullable(),
});
