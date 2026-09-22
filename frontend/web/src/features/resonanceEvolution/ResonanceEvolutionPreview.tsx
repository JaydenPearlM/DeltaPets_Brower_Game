import { useEffect, useRef, useState } from "react";
import clodionHatchling from "@/kith/assets/Kithna_pets/hatchling_clodion.png";
import { ResonanceEvolutionOverlay } from "./ResonanceEvolutionOverlay";
import type {
  ResonanceEvolutionPhase,
  ResonanceEvolutionRequest,
} from "./resonanceEvolution.types";

const PREVIEW_PHASES: readonly ResonanceEvolutionPhase[] = [
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

const PREVIEW_DURATIONS: Record<
  Exclude<ResonanceEvolutionPhase, "idle">,
  number
> = {
  warningTransparent: 2400,
  warningRed: 1900,
  elementReveal: 1400,
  fadeGameplay: 1700,
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

const PREVIEW_REQUEST: ResonanceEvolutionRequest = {
  petId: "resonance-preview-clodion",
  kithName: "Clodion",
  fromStage: "hatchling",
  toStage: "lowform",
  element: "storm",
  elements: ["storm"],
  fromImage: clodionHatchling,
  // No Lowform art is committed yet. Reusing the Hatchling keeps this
  // preview focused on timing/lock-in without inventing production art.
  toImage: clodionHatchling,
  currentHp: 42,
  maxHp: 42,
  persist: false,
};

export default function ResonanceEvolutionPreview() {
  const [phase, setPhase] = useState<ResonanceEvolutionPhase>("idle");
  const [displayedHp, setDisplayedHp] = useState(42);
  const [playing, setPlaying] = useState(false);
  const runIdRef = useRef(0);

  useEffect(() => {
    return () => {
      runIdRef.current += 1;
    };
  }, []);

  async function play() {
    if (playing) return;

    const runId = ++runIdRef.current;
    setPlaying(true);
    setDisplayedHp(42);

    for (const nextPhase of PREVIEW_PHASES) {
      if (runId !== runIdRef.current) return;

      setPhase(nextPhase);

      if (nextPhase === "hpDrain") {
        const start = performance.now();
        const duration = Math.max(500, PREVIEW_DURATIONS.hpDrain - 120);

        await new Promise<void>((resolve) => {
          function tick(now: number) {
            if (runId !== runIdRef.current) {
              resolve();
              return;
            }

            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayedHp(Math.max(1, Math.round(42 - 41 * eased)));

            if (progress < 1) {
              window.requestAnimationFrame(tick);
            } else {
              resolve();
            }
          }

          window.requestAnimationFrame(tick);
        });

        const remainder = PREVIEW_DURATIONS.hpDrain - duration;
        if (remainder > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, remainder));
        }
      } else {
        await new Promise((resolve) =>
          window.setTimeout(resolve, PREVIEW_DURATIONS[nextPhase]),
        );
      }
    }

    if (runId === runIdRef.current) {
      setPhase("idle");
      setPlaying(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#03080d",
        color: "#eaffff",
        padding: 24,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 620 }}>
        <h1 style={{ marginBottom: 10 }}>Resonance Evolution Preview</h1>
        <p style={{ opacity: 0.78, marginBottom: 20 }}>
          Visual-only development preview. It does not save an evolution or
          modify a real Kith. Lowform art is currently represented by the
          Hatchling image so this pass can focus on the cinematic timing.
        </p>

        <button
          type="button"
          onClick={() => void play()}
          disabled={playing}
          style={{
            padding: "13px 30px",
            border: "1px solid #56dfff",
            background: "#06141d",
            color: "#eaffff",
            fontWeight: 800,
            letterSpacing: ".14em",
            cursor: playing ? "default" : "pointer",
            opacity: playing ? 0.55 : 1,
          }}
        >
          {playing ? "PLAYING" : phase === "idle" ? "PLAY" : "REPLAY"}
        </button>
      </div>

      <ResonanceEvolutionOverlay
        request={phase === "idle" ? null : PREVIEW_REQUEST}
        phase={phase}
        displayedHp={displayedHp}
        reducedMotion={false}
      />
    </div>
  );
}
