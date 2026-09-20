export type AvatarCustomization = {
  bodyFrame: string;
  hairStyle: string;
  hairColor: string;
  skinTone: string;
  eyeStyle: string;
  eyeColor: string;
  mouthStyle: string;
};

export type AvatarOption = {
  id: string;
  label: string;
};

export type AvatarColorOption = AvatarOption & {
  color: string;
};
