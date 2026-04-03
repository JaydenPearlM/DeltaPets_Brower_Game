// frontend/web/src/utils/petStage.ts

export type PetStage =
  | "egg"
  | "hatchling"
  | "lowform"
  | "highform"
  | "legion"
  | "mythic_legendary";

export const safeStage = (stage: string): PetStage => {
  const valid: PetStage[] = [
    "egg",
    "hatchling",
    "lowform",
    "highform",
    "legion",
    "mythic_legendary",
  ];

  return valid.includes(stage as PetStage) ? (stage as PetStage) : "egg";
};
