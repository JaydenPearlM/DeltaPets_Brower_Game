export type PetStage =
  | "egg"
  | "hatchling"
  | "lowform"
  | "highform"
  | "legion"
  | "mythical_legendary";

export const PET_STAGE_ORDER: PetStage[] = [
  "egg",
  "hatchling",
  "lowform",
  "highform",
  "legion",
  "mythical_legendary",
];

export function safeStage(stage: string | null | undefined): PetStage {
  const normalized = String(stage ?? "")
    .trim()
    .toLowerCase();

  if (normalized === "mythical_legendary") {
    return "mythical_legendary";
  }

  if (PET_STAGE_ORDER.includes(normalized as PetStage)) {
    return normalized as PetStage;
  }

  return "egg";
}

export function getNextStage(stage: PetStage): PetStage | null {
  const index = PET_STAGE_ORDER.indexOf(stage);

  if (index === -1 || index === PET_STAGE_ORDER.length - 1) {
    return null;
  }

  return PET_STAGE_ORDER[index + 1];
}
