import type { AvatarColorOption, AvatarOption } from "./avatarTypes";

export const BODY_FRAMES: readonly AvatarOption[] = [
  { id: "body-frame-a", label: "Frame A" },
  { id: "body-frame-b", label: "Frame B" },
];

export const HAIR_STYLES: readonly AvatarOption[] = [
  { id: "hair-short-01", label: "Masculine" },
  { id: "hair-ponytail-01", label: "Feminine" },
  { id: "hair-bald", label: "Bald" },
];

export const HAIR_COLORS: readonly AvatarColorOption[] = [
  { id: "black", label: "Black", color: "#202027" },
  { id: "dark-brown", label: "Dark Brown", color: "#3D2922" },
  { id: "brown", label: "Brown", color: "#785039" },
  { id: "blonde", label: "Blonde", color: "#E8C879" },
  { id: "purple", label: "Purple", color: "#8554B5" },
];

export const SKIN_TONES: readonly AvatarColorOption[] = [
  { id: "skin-01", label: "Light", color: "#F5CCA6" },
  { id: "skin-05", label: "Deep", color: "#935B3B" },
];

export const EYE_STYLES: readonly AvatarOption[] = [
  { id: "eyes-round-01", label: "Round" },
  { id: "eyes-soft-01", label: "Soft" },
];

export const EYE_COLORS: readonly AvatarColorOption[] = [
  { id: "brown", label: "Brown", color: "#785039" },
  { id: "blue", label: "Blue", color: "#4B86C6" },
  { id: "green", label: "Green", color: "#5C8B55" },
  { id: "hazel", label: "Hazel", color: "#9A884B" },
  { id: "purple", label: "Purple", color: "#8554B5" },
];

export const MOUTH_STYLES: readonly AvatarOption[] = [
  { id: "mouth-smile-01", label: "Smile" },
  { id: "mouth-neutral-01", label: "Neutral" },
];
