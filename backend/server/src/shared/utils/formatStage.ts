import type { PetStage } from "../types/petStages";

export function formatStage(stage: PetStage): string {
  switch (stage) {
    case "egg":
      return "Egg";
    case "hatchling":
      return "Hatchling";
    case "lowform":
      return "Lowform";
    case "highform":
      return "Highform";
    case "legion":
      return "Legion";
    case "mythical_legendary":
      return "Mythical Legendary";
    default:
      return stage;
  }
}
