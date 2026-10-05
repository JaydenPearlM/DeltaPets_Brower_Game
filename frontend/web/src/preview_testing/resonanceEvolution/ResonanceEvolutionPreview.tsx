import { useEffect, useState } from "react";
import { ResonanceEvolutionCinematic } from "@/features/resonanceEvolution/ResonanceEvolutionCinematic";
import { EVOLUTION_PREVIEW_PETS, createPreviewEvolution, SIMULATED_EVOLUTION_LEVEL } from "@/features/resonanceEvolution/resonanceEvolution.previewPets";
import { PHASES, CINEMATIC_DURATIONS } from "@/features/resonanceEvolution/resonanceEvolution.timeline";
import type { ResonanceEvolutionPhase, ResonanceEvolutionRequest } from "@/features/resonanceEvolution/resonanceEvolution.types";
import "./resonanceEvolutionPreview.css";
import cladionPreview from "./cladion-preview.png";

// Keep the existing registry ID; corrected display names are local to this test.
const pet = EVOLUTION_PREVIEW_PETS.find(entry => entry.speciesId === "kithna_clodian");
const previewRequest: ResonanceEvolutionRequest | null = pet ? {
  ...createPreviewEvolution(pet, ""),
  kithName: "Clodion",
  evolvedName: "Cladion",
  toImage: cladionPreview,
} : null;

/** Local playback only: no gameplay provider, controller events, or API imports. */
export default function ResonanceEvolutionPreview() {
  const [phase, setPhase] = useState<ResonanceEvolutionPhase>("idle");
  const [displayedHp, setDisplayedHp] = useState(100);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [reducedMotion, setReducedMotion] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (!previewRequest) return;
    let cancelled = false;
    void Promise.all([previewRequest.fromImage, previewRequest.toImage].map(src => {
      const image = new Image();
      image.src = src;
      return image.decode();
    })).then(() => {
      if (!cancelled) setReady(true);
    }).catch(() => {
      if (!cancelled) setMessage("The preview artwork could not load. Refresh to try again.");
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (phase === "idle") return;
    let frame: number | null = null;
    // Match the current gameplay provider's visual HP drain and timing.
    if (phase === "hpDrain") {
      const startedAt = performance.now();
      const drainMs = Math.max(500, CINEMATIC_DURATIONS.hpDrain - 120);
      const tick = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / drainMs);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayedHp(Math.max(1, Math.round(100 - 99 * eased)));
        if (progress < 1) frame = window.requestAnimationFrame(tick);
      };
      frame = window.requestAnimationFrame(tick);
    }
    const timer = window.setTimeout(() => {
      if (phase === "complete") {
        setMessage("Preview complete. No player data was changed.");
      }
      setPhase(PHASES[PHASES.indexOf(phase) + 1] ?? "idle");
    }, CINEMATIC_DURATIONS[phase]);
    return () => {
      window.clearTimeout(timer);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [phase]);

  function startPreview() {
    if (!ready || !previewRequest || phase !== "idle") return;
    setDisplayedHp(100);
    setMessage("");
    setPhase("warningTransparent");
  }

  return <main className="resonanceTestPreview">
    <span className="resonanceTestPreview__badge">TEST ONLY</span>
    {phase === "idle" && <section className="resonanceTestPreview__controls">
      <h1>Resonance Evolution Preview</h1>
      <p>Clodion → Cladion</p>
      <p>Simulated Level {SIMULATED_EVOLUTION_LEVEL}</p>
      {previewRequest && <img src={previewRequest.fromImage} alt="Clodion" />}
      <p>Local cinematic test. No real Kith, Deltas, or inventory are changed.</p>
      <label><input type="checkbox" checked={reducedMotion} onChange={event => setReducedMotion(event.target.checked)} /> Reduced motion</label>
      <button type="button" disabled={!ready || !previewRequest} onClick={startPreview}>Start evolution</button>
      {!previewRequest && <p role="alert">Clodion could not be found in the existing artwork registry.</p>}
      {message && <p role="status">{message}</p>}
    </section>}
    <ResonanceEvolutionCinematic request={previewRequest} phase={phase} displayedHp={displayedHp} reducedMotion={reducedMotion} />
  </main>;
}
