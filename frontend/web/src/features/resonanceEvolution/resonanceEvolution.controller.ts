import type { ResonanceEvolutionRequest } from "./resonanceEvolution.types";

const QUEUE_EVENT = "deltapets:resonance-evolution:queue";
const SAFETY_EVENT = "deltapets:resonance-evolution:safety";
const CHECK_EVENT = "deltapets:resonance-evolution:check";

export type ResonanceSafetyEvent = {
  key: string;
  unsafe: boolean;
};

export function queueResonanceEvolution(request: ResonanceEvolutionRequest) {
  window.dispatchEvent(
    new CustomEvent<ResonanceEvolutionRequest>(QUEUE_EVENT, {
      detail: request,
    }),
  );
}

export function requestResonanceEvolutionCheck() {
  window.dispatchEvent(new Event(CHECK_EVENT));
}

export function setResonanceEvolutionUnsafe(key: string, unsafe: boolean) {
  window.dispatchEvent(
    new CustomEvent<ResonanceSafetyEvent>(SAFETY_EVENT, {
      detail: { key, unsafe },
    }),
  );
}

export const RESONANCE_CONTROLLER_EVENTS = {
  queue: QUEUE_EVENT,
  safety: SAFETY_EVENT,
  check: CHECK_EVENT,
} as const;
