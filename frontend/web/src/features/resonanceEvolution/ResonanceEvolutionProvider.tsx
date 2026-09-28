import { PHASES, CINEMATIC_DURATIONS } from "./resonanceEvolution.timeline";
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
import { useAuth } from "@/app/providers/useAuth";
import { getStarterPortrait } from "@/kith/registry/starterPortraits";
import { getKithnaPortrait } from "@/kith/registry/kithnaPortraits";
import { commitResonanceEvolution, getPendingResonanceEvolutions } from "./resonanceEvolution.api";
import {
  RESONANCE_CONTROLLER_EVENTS,
  type ResonanceSafetyEvent,
} from "./resonanceEvolution.controller";
import { ResonanceEvolutionCinematic } from "./ResonanceEvolutionCinematic";
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

export function ResonanceEvolutionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { bumpRefreshKey, refreshKey } = useGame();
  const { user, loading } = useAuth();
  const [queue, setQueue] = useState<ResonanceEvolutionRequest[]>([]);
  const [queueOwnerId, setQueueOwnerId] = useState(user?.id);
  const [active, setActive] = useState<ResonanceEvolutionRequest | null>(null);
  const [phase, setPhase] = useState<ResonanceEvolutionPhase>("idle");
  const [displayedHp, setDisplayedHp] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [unsafeKeys, setUnsafeKeys] = useState<Set<string>>(() => new Set());
  const timerRef = useRef<number | null>(null);
  const drainFrameRef = useRef<number | null>(null);
  const commitInFlightRef = useRef(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const failedPetIdsRef = useRef(new Set<string>());
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  const isSafe = unsafeKeys.size === 0;

  const queueEvolution = useCallback((request: ResonanceEvolutionRequest) => {
    // Gameplay never accepts preview requests or bypasses the server commit.
    if (request.persist === false || failedPetIdsRef.current.has(request.petId)) return;
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

  useEffect(() => {
    setQueue([]);
    setQueueOwnerId(user?.id);
    setActive(null);
    setPhase("idle");
    failedPetIdsRef.current.clear();
  }, [user?.id]);

  useEffect(() => {
    failedPetIdsRef.current.clear();
  }, [refreshKey]);

  useEffect(() => {
    if (loading || !user || active || isCommitting || !isSafe) return;
    let cancelled = false;
    let checking = false;
    const check = async () => {
      if (checking || document.visibilityState === "hidden") return;
      checking = true;
      try {
        const pending = await getPendingResonanceEvolutions();
        if (cancelled) return;
        for (const pet of pending) {
          const image = getStarterPortrait(pet.speciesId) ?? getKithnaPortrait(pet.speciesId);
          if (!image) continue;
          queueEvolution({
            petId: pet.petId, kithName: pet.kithName, evolvedName: pet.evolvedName,
            fromStage: pet.fromStage, toStage: pet.toStage, element: pet.element,
            fromImage: image, toImage: image,
            currentHp: pet.currentHp, maxHp: pet.maxHp,
          });
        }
      } catch (error: unknown) {
        if (!cancelled) console.error("[ResonanceEvolution] eligibility check failed", error);
      } finally {
        checking = false;
      }
    };
    const requestCheck = (event?: Event) => {
      if (event?.type === RESONANCE_CONTROLLER_EVENTS.check) failedPetIdsRef.current.clear();
      void check();
    };
    void check();
    const timer = window.setInterval(requestCheck, 30_000);
    window.addEventListener(RESONANCE_CONTROLLER_EVENTS.check, requestCheck);
    document.addEventListener("visibilitychange", requestCheck);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener(RESONANCE_CONTROLLER_EVENTS.check, requestCheck);
      document.removeEventListener("visibilitychange", requestCheck);
    };
  }, [loading, user?.id, refreshKey, active, isCommitting, isSafe, queueEvolution]);

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
    if (!user || queueOwnerId !== user.id || loading || active || !isSafe || queue.length === 0 || commitInFlightRef.current) return;
    const [next, ...rest] = queue;
    const committingUserId = user.id;
    commitInFlightRef.current = true;
    setIsCommitting(true);
    setQueue(rest);
    // Only play a successful evolution. Insufficient Deltas or server failures
    // must never reach the reveal/celebration phases.
    void commitResonanceEvolution(next)
      .then((result) => {
        if (userIdRef.current !== committingUserId) return;
        setActive({ ...next, currentHp: result.previous_hp, maxHp: result.previous_hp_max });
        setDisplayedHp(Math.max(1, result.previous_hp));
        setPhase("warningTransparent");
      })
      .catch((error: unknown) => {
        if (userIdRef.current !== committingUserId) return;
        failedPetIdsRef.current.add(next.petId);
        setQueue([]);
        console.error("[ResonanceEvolution] evolution commit failed", error);
        window.alert(error instanceof Error ? error.message : "Resonance Evolution could not be saved.");
      })
      .finally(() => {
        commitInFlightRef.current = false;
        setIsCommitting(false);
      });
  }, [active, isSafe, queue, queueOwnerId, user?.id, loading, isCommitting]);

  useEffect(() => {
    if (!active || phase === "idle") return;

    const durations = CINEMATIC_DURATIONS;
    const currentIndex = PHASES.indexOf(phase);
    if (currentIndex < 0) return;

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
      isEvolutionPlaying: active !== null || isCommitting,
    }),
    [active, isCommitting, queueEvolution, setEvolutionUnsafe],
  );

  return (
    <ResonanceEvolutionContext.Provider value={value}>
      {children}
      <ResonanceEvolutionCinematic
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
