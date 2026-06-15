// backend/server/src/lib/validation.ts

import { z } from "zod";

const elementLineSchema = z.enum([
  "null_element",
  "water",
  "fire",
  "earth",
  "air",
  "ice",
  "storm",
  "light",
  "shadow",
  "random",
]);

const worldTimeSchema = z.enum(["day", "night"]);

export const ensureEggSchema = z.object({
  line: elementLineSchema.optional().nullable(),
  worldTime: worldTimeSchema.optional().nullable(),
  personalityKey: z.string().trim().min(1).optional().nullable(),
});

export const petActionSchema = z.object({
  action: z.enum(["feed", "clean", "play", "bond"]),
});
