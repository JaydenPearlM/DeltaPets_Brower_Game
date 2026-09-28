import { useEffect, useState } from "react";
import { ResonanceEvolutionCinematic } from "./ResonanceEvolutionCinematic";
import { PHASES, CINEMATIC_DURATIONS, recoveredPreviewHp } from "./resonanceEvolution.timeline";
import { EVOLUTION_PREVIEW_PETS, canSimulateEvolution, createPreviewEvolution } from "./resonanceEvolution.previewPets";
import type { ResonanceEvolutionPhase, ResonanceEvolutionRequest } from "./resonanceEvolution.types";

/** Local simulation: deliberately never imports the provider or commit API. */
export default function ResonanceEvolutionPreview() {
  const [speciesId, setSpeciesId] = useState("fire_starter");
  const [nickname, setNickname] = useState("");
  const [level, setLevel] = useState(15);
  const [stage, setStage] = useState<"hatchling" | "lowform">("hatchling");
  const [phase, setPhase] = useState<ResonanceEvolutionPhase>("idle");
  const [request, setRequest] = useState<ResonanceEvolutionRequest | null>(null);
  const [displayedHp, setDisplayedHp] = useState(100);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const pet = EVOLUTION_PREVIEW_PETS.find(entry => entry.speciesId === speciesId);
  const playing = phase !== "idle";

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setMessage("");
    if (!pet) return;
    const image = new Image();
    image.src = pet.image;
    image.decode().then(() => { if (!cancelled) setReady(true); })
      .catch(() => { if (!cancelled) setMessage("This pet's artwork could not be loaded."); });
    return () => { cancelled = true; };
  }, [pet]);

  useEffect(() => {
    if (phase === "idle") return;
    const timer = window.setTimeout(() => {
      if (phase === "complete") {
        setStage("lowform");
        setMessage("Simulated evolution complete. No player data was changed.");
      }
      setPhase(PHASES[PHASES.indexOf(phase) + 1] ?? "idle");
    }, CINEMATIC_DURATIONS[phase]);
    let frame = 0;
    if (phase === "hpDrain" || phase === "celebration") {
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / (phase === "hpDrain" ? 220 : 1100));
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayedHp(Math.round(phase === "hpDrain" ? 100 * (1 - eased) : recoveredPreviewHp(100) * eased));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }
    return () => { clearTimeout(timer); cancelAnimationFrame(frame); };
  }, [phase]);

  function simulate() {
    if (!pet || !ready || playing) return;
    if (!canSimulateEvolution(level, stage)) {
      setMessage(stage === "lowform" ? "Reset the simulated pet before replaying." : "Not ready: a hatchling must reach level 15.");
      return;
    }
    setRequest(createPreviewEvolution(pet, nickname));
    setDisplayedHp(100);
    setMessage("");
    setPhase("warningTransparent");
  }

  return <>
    {!playing && <main className="resonancePreview">
      <section className="resonancePreview__controls">
        <h1>Test a pet evolution</h1>
        <p>Local simulation only. Closed Alpha remains capped at level 10.</p>
        <p>Each pet uses its own hatchling PNG before and after evolution until Lowform art is ready. Its element determines the bubble color.</p>
        <label>Pet
          <select value={speciesId} onChange={event => { setSpeciesId(event.target.value); setStage("hatchling"); }}>
            {EVOLUTION_PREVIEW_PETS.map(entry => <option key={entry.speciesId} value={entry.speciesId}>{entry.name} ({entry.element}){entry.speciesId.startsWith("shadow_") ? ` — ${entry.speciesId}` : ""}</option>)}
          </select>
        </label>
        {pet && <img src={pet.image} alt={pet.name} width={180} height={180} style={{ objectFit: "contain" }} />}
        <label>Nickname <input value={nickname} onChange={event => setNickname(event.target.value)} placeholder={pet?.name} /></label>
        <label>Simulated level <input type="number" min={1} step={1} value={level} onChange={event => setLevel(Number(event.target.value))} /></label>
        <label><input type="checkbox" checked={reducedMotion} onChange={event => setReducedMotion(event.target.checked)} /> Reduced motion</label>
        <p>Simulated stage: {stage}</p>
        {message && <p role="status">{message}</p>}
        <button type="button" disabled={!ready || !pet} onClick={simulate}>Test evolution readiness</button>
        {stage === "lowform" && <button type="button" onClick={() => { setStage("hatchling"); setMessage(""); }}>Reset simulated pet</button>}
      </section>
    </main>}
    <ResonanceEvolutionCinematic request={request} phase={phase} displayedHp={displayedHp} reducedMotion={reducedMotion} />
  </>;
}
