import { z } from "zod";

export const avatarCustomizationSchema = z.object({
  bodyFrame: z.enum(["body-frame-a", "body-frame-b"]),
  hairStyle: z.enum(["hair-short-01", "hair-ponytail-01", "hair-bald"]),
  hairColor: z.enum(["black", "dark-brown", "brown", "blonde", "purple"]),
  skinTone: z.enum(["skin-01", "skin-05"]),
  eyeStyle: z.enum(["eyes-round-01", "eyes-soft-01"]),
  eyeColor: z.enum(["brown", "blue", "green", "hazel", "purple"]),
  mouthStyle: z.enum(["mouth-smile-01", "mouth-neutral-01"]),
  upperBodyClothing: z.enum(["battered-shirt-cream", "battered-shirt-muted-blue", "battered-shirt-dusty-green", "battered-shirt-faded-plum"]).nullable().optional(),
  lowerBodyClothing: z.enum(["battered-trousers-dark-brown", "battered-trousers-slate-gray", "battered-trousers-faded-olive", "battered-skirt-muted-purple", "battered-skirt-dusty-blue", "battered-skirt-moss-green"]).nullable().optional(),
  hat: z.enum(["battered-side-cap-brown", "battered-travel-cap-blue", "battered-menders-cap-olive"]).nullable().optional(),
  eyewear: z.enum(["round-glasses-dark-metal", "round-glasses-bronze", "square-glasses-dark-metal", "square-glasses-blue-gray", "brass-monocle"]).nullable().optional(),
}).strict();

export const saveAppearanceSchema = z.object({
  appearance: avatarCustomizationSchema,
  target: z.enum(["current", "default"]),
}).strict();

export function readAppearance(value: unknown) {
  const parsed = avatarCustomizationSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
