// backend/server/src/lib/validation.ts

import { z } from "zod";

export const petActionSchema = z.object({
  action: z.enum(["feed", "clean", "play", "bond"]),
});

// NEW: Validation schema for ensure-egg endpoint
export const ensureEggSchema = z.object({
  line: z
    .enum([
      "neutral",
      "water",
      "fire",
      "earth",
      "air",
      "ice",
      "storm",
      "light",
      "shadow",
      "corruption",
    ])
    .optional()
    .nullable(),
  worldTime: z.enum(["day", "night"]).optional().nullable(),
  personalityKey: z.string().min(1).max(50).optional().nullable(),
});
