import {
  BODY_FRAMES,
  EYE_COLORS,
  EYE_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  MOUTH_STYLES,
  SKIN_TONES,
} from "./avatarCatalog";
import type { AvatarCustomization, AvatarOption } from "./avatarTypes";

function pickOptionId(options: readonly AvatarOption[]): string {
  const option = options[Math.floor(Math.random() * options.length)];

  if (!option) {
    throw new Error("Avatar option catalogs must not be empty.");
  }

  return option.id;
}

export function createRandomAvatar(): AvatarCustomization {
  return {
    bodyFrame: pickOptionId(BODY_FRAMES),
    hairStyle: pickOptionId(HAIR_STYLES),
    hairColor: pickOptionId(HAIR_COLORS),
    skinTone: pickOptionId(SKIN_TONES),
    eyeStyle: pickOptionId(EYE_STYLES),
    eyeColor: pickOptionId(EYE_COLORS),
    mouthStyle: pickOptionId(MOUTH_STYLES),
  };
}
