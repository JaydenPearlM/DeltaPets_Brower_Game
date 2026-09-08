export type SolenElementPreference =
  | "fire"
  | "water"
  | "earth"
  | "air"
  | "ice"
  | "storm"
  | "shadow";

export interface SolenBehaviorProfile {
  preferredFoodCategory: "meat" | "vegetables" | "balanced" | null;

  desiredElement: SolenElementPreference | null;
}
