export type AvatarCustomization = {
  bodyFrame: string;
  hairStyle: string;
  hairColor: string;
  skinTone: string;
  eyeStyle: string;
  eyeColor: string;
  mouthStyle: string;
};

export const DEFAULT_AVATAR: AvatarCustomization = {
  bodyFrame: "body-frame-a",
  hairStyle: "hair-short-01",
  hairColor: "black",
  skinTone: "skin-01",
  eyeStyle: "eyes-round-01",
  eyeColor: "brown",
  mouthStyle: "mouth-smile-01",
};

export type SavedAppearance = {
  appearance: AvatarCustomization | null;
  defaultAppearance: AvatarCustomization | null;
};

export type AvatarOption = {
  id: string;
  label: string;
};

export type AvatarColorOption = AvatarOption & {
  color: string;
};
