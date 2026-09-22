import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useGame } from "@/app/providers/GameProvider";
import { commitResonanceEvolution } from "./resonanceEvolution.api";
import {
  RESONANCE_CONTROLLER_EVENTS,
  type ResonanceSafetyEvent,
} from "./resonanceEvolution.controller";
import { ResonanceEvolutionOverlay } from "./ResonanceEvolutionOverlay";
import type {
  ResonanceEvolutionPhase,
  ResonanceEvolutionRequest,
} from "./resonanceEvolution.types";

type ContextValue = {
  queueResonanceEvolution: (request: ResonanceEvolutionRequest) => void;
  setEvolutionUnsafe: (key: string, unsafe: boolean) => void;
  isEvolutionPlaying: boolean;
};

const ResonanceEvolutionContext = createContext<ContextValue | null>(null);

const PHASES: readonly ResonanceEvolutionPhase[] = [
  "warningTransparent",
  "warningRed",
  "elementReveal",
  "fadeGameplay",
  "environment",
  "summon",
  "elementalBuild",
  "strain",
  "hpDrain",
  "transformation",
  "reveal",
  "celebration",
  "complete",
];

const NORMAL_DURATIONS: Record<Exclude<ResonanceEvolutionPhase, "idle">, number> = {
  warningTransparent: 1700,
  warningRed: 1500,
  elementReveal: 900,
  fadeGameplay: 1500,
  environment: 700,
  summon: 1100,
  elementalBuild: 1600,
  strain: 900,
  hpDrain: 1550,
  transformation: 1450,
  reveal: 1250,
  celebration: 2600,
  complete: 450,
};

const REDUCED_DURATIONS: Record<Exclude<ResonanceEvolutionPhase, "idle">, number> = {
  warningTransparent: 1300,
  warningRed: 950,
  elementReveal: 800,
  fadeGameplay: 1200,
  environment: 550,
  summon: 850,
  elementalBuild: 1000,
  strain: 700,
  hpDrain: 1050,
  transformation: 950,
  reveal: 1000,
  celebration: 2200,
  complete: 350,
};

export function ResonanceEvolutionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { bumpRefreshKey } = useGame();
  const [queue, setQueue] = useState<ResonanceEvolutionRequest[]>([]);
  const [active, setActive] = useState<ResonanceEvolutionRequest | null>(null);
  const [phase, setPhase] = useState<ResonanceEvolutionPhase>("idle");
  const [displayedHp, setDisplayedHp] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [unsafeKeys, setUnsafeKeys] = useState<Set<string>>(() => new Set());
  const timerRef = useRef<number | null>(null);
  const drainFrameRef = useRef<number | null>(null);
  const committedPetRef = useRef<string | null>(null);

  const isSafe = unsafeKeys.size === 0;

  const queueEvolution = useCallback((request: ResonanceEvolutionRequest) => {
    setQueue((current) => {
      if (
        current.some((entry) => entry.petId === request.petId) ||
        active?.petId === request.petId
      ) {
        return current;
      }
      return [...current, request];
    });
  }, [active?.petId]);

  const setEvolutionUnsafe = useCallback((key: string, unsafe: boolean) => {
    setUnsafeKeys((current) => {
      const next = new Set(current);
      if (unsafe) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const onQueue = (event: Event) => {
      const custom = event as CustomEvent<ResonanceEvolutionRequest>;
      if (custom.detail) queueEvolution(custom.detail);
    };
    const onSafety = (event: Event) => {
      const custom = event as CustomEvent<ResonanceSafetyEvent>;
      if (custom.detail) {
        setEvolutionUnsafe(custom.detail.key, custom.detail.unsafe);
      }
    };

    window.addEventListener(RESONANCE_CONTROLLER_EVENTS.queue, onQueue);
    window.addEventListener(RESONANCE_CONTROLLER_EVENTS.safety, onSafety);
    return () => {
      window.removeEventListener(RESONANCE_CONTROLLER_EVENTS.queue, onQueue);
      window.removeEventListener(RESONANCE_CONTROLLER_EVENTS.safety, onSafety);
    };
  }, [queueEvolution, setEvolutionUnsafe]);

  useEffect(() => {
    if (active || !isSafe || queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    setActive(next);
    setDisplayedHp(Math.max(1, next.currentHp ?? next.maxHp ?? 1));
    committedPetRef.current = null;
    setPhase("warningTransparent");
  }, [active, isSafe, queue]);

  useEffect(() => {
    if (!active || phase === "idle") return;

    const durations = reducedMotion ? REDUCED_DURATIONS : NORMAL_DURATIONS;
    const currentIndex = PHASES.indexOf(phase);
    if (currentIndex < 0) return;

    if (phase === "hpDrain" && committedPetRef.current !== active.petId) {
      committedPetRef.current = active.petId;
      if (active.persist !== false) {
        void commitResonanceEvolution(active)
          .then((result) => {
            setDisplayedHp(1);
            if (result.pet.hp_cur !== 1) {
              console.error("[ResonanceEvolution] server did not persist HP=1", result.pet);
            }
          })
          .catch((error) => {
            committedPetRef.current = null;
            console.error("[ResonanceEvolution] evolution commit failed", error);
          });
      }
    }

    if (phase === "hpDrain") {
      const startedAt = performance.now();
      const startingHp = Math.max(1, active.currentHp ?? active.maxHp ?? 1);
      const drainMs = Math.max(500, durations.hpDrain - 120);
      const tick = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / drainMs);
        const eased = 1 - Math.pow(1 - progress, 3);
        const nextHp = Math.max(1, Math.round(startingHp - (startingHp - 1) * eased));
        setDisplayedHp(nextHp);
        if (progress < 1) {
          drainFrameRef.current = window.requestAnimationFrame(tick);
        }
      };
      drainFrameRef.current = window.requestAnimationFrame(tick);
    }

    timerRef.current = window.setTimeout(() => {
      if (phase === "complete") {
        setPhase("idle");
        setActive(null);
        bumpRefreshKey();
        return;
      }

      const next = PHASES[currentIndex + 1];
      if (next) setPhase(next);
    }, durations[phase]);

    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      if (drainFrameRef.current !== null) {
        window.cancelAnimationFrame(drainFrameRef.current);
      }
    };
  }, [active, bumpRefreshKey, phase, reducedMotion]);

  const value = useMemo<ContextValue>(
    () => ({
      queueResonanceEvolution: queueEvolution,
      setEvolutionUnsafe,
      isEvolutionPlaying: active !== null,
    }),
    [active, queueEvolution, setEvolutionUnsafe],
  );

  return (
    <ResonanceEvolutionContext.Provider value={value}>
      {children}
      <ResonanceEvolutionOverlay
        request={active}
        phase={phase}
        displayedHp={displayedHp}
        reducedMotion={reducedMotion}
      />
    </ResonanceEvolutionContext.Provider>
  );
}

export function useResonanceEvolution(): ContextValue {
  const context = useContext(ResonanceEvolutionContext);
  if (!context) {
    throw new Error(
      "useResonanceEvolution must be used within ResonanceEvolutionProvider",
    );
  }
  return context;
}
