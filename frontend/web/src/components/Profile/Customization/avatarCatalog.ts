import type { AvatarColorOption, AvatarOption } from "./avatarTypes";

export const HAIR_STYLES: readonly AvatarOption[] = [
  { id: "hair-short-01", label: "Short" },
  { id: "hair-tousled-01", label: "Tousled" },
  { id: "hair-curly-01", label: "Curly" },
  { id: "hair-bob-01", label: "Bob" },
  { id: "hair-ponytail-01", label: "Ponytail" },
];

export const HAIR_COLORS: readonly AvatarColorOption[] = [
  { id: "black", label: "Black", color: "#202027" },
  { id: "dark-brown", label: "Dark Brown", color: "#3D2922" },
  { id: "brown", label: "Brown", color: "#785039" },
  { id: "blonde", label: "Blonde", color: "#E8C879" },
  { id: "purple", label: "Purple", color: "#8554B5" },
];

export const SKIN_TONES: readonly AvatarColorOption[] = [
  { id: "skin-01", label: "Skin Tone 1", color: "#F5D9C4" },
  { id: "skin-02", label: "Skin Tone 2", color: "#E8B18A" },
  { id: "skin-03", label: "Skin Tone 3", color: "#CB916C" },
  { id: "skin-04", label: "Skin Tone 4", color: "#A96F4E" },
  { id: "skin-05", label: "Skin Tone 5", color: "#784B35" },
];

export const EYE_STYLES: readonly AvatarOption[] = [
  { id: "eyes-round-01", label: "Round" },
  { id: "eyes-soft-01", label: "Soft" },
  { id: "eyes-sharp-01", label: "Sharp" },
  { id: "eyes-sleepy-01", label: "Sleepy" },
  { id: "eyes-wide-01", label: "Wide" },
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
  { id: "mouth-soft-01", label: "Soft" },
  { id: "mouth-neutral-01", label: "Neutral" },
  { id: "mouth-open-01", label: "Open" },
  { id: "mouth-grin-01", label: "Grin" },
];
