import { apiFetch } from "@/lib/api/baseClient";
import type {
  ResonanceEvolutionCommitResponse,
  ResonanceEvolutionRequest,
} from "./resonanceEvolution.types";

export async function commitResonanceEvolution(
  request: ResonanceEvolutionRequest,
): Promise<ResonanceEvolutionCommitResponse> {
  return apiFetch<ResonanceEvolutionCommitResponse>(
    `/api/pets/${encodeURIComponent(request.petId)}/resonance-evolution`,
    {
      method: "POST",
      json: {
        fromStage: request.fromStage,
        toStage: request.toStage,
      },
    },
  );
}
