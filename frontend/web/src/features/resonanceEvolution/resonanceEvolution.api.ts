import { apiFetch } from "@/lib/api/baseClient";
import type {
  ResonanceEvolutionCommitResponse,
  ResonanceEvolutionRequest,
  ResonanceEvolutionPending,
} from "./resonanceEvolution.types";

export async function getPendingResonanceEvolutions(): Promise<ResonanceEvolutionPending[]> {
  const result = await apiFetch<{ pending: ResonanceEvolutionPending[] }>(
    "/api/pets/resonance-evolution/pending",
  );
  return result.pending;
}

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
