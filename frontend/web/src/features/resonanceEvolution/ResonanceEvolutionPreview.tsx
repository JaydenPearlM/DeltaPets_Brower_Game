import { useEffect, useRef, useState, type CSSProperties } from "react";
import clodionHatchling from "@/kith/assets/Kithna_pets/hatchling_clodion.png";
import previewLowform from "./preview-lowform.png";
import { findNonStarterSpeciesById } from "@shared/pets/species/all-species";
import { ResonanceEvolutionOverlay } from "./ResonanceEvolutionOverlay";
import { ELEMENT_RESONANCE, normalizeResonanceElement } from "./resonanceElements";
import { PHASES, NORMAL_DURATIONS, recoveredPreviewHp } from "./resonanceEvolution.timeline";
import type { ResonanceElement, ResonanceEvolutionPhase, ResonanceEvolutionRequest } from "./resonanceEvolution.types";

// Reference timings belong to this preview, not the gameplay provider.
const PREVIEW_DURATIONS = {
  ...NORMAL_DURATIONS,
  summon: 550, // Scene fade + environment + summon = 1400 ms.
  elementalBuild: 900,
  strain: 520,
  hpDrain: 690, // Remaining strike (950 - 520), then the 260 ms hold.
  transformation: 1650,
  reveal: 620, // Energy disperses around the visible Lowform.
  celebration: 2200,
};

export default function ResonanceEvolutionPreview() {
  const [phase, setPhase] = useState<ResonanceEvolutionPhase>("idle");
  const [displayedHp, setDisplayedHp] = useState(100);
  const [element, setElement] = useState<ResonanceElement>("storm");
  const [hasPlayed, setHasPlayed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [ready, setReady] = useState(false);
  const [assetError, setAssetError] = useState(false);
  const [fromImage, setFromImage] = useState(clodionHatchling);
  const [toImage, setToImage] = useState(previewLowform);
  const [evolvedName, setEvolvedName] = useState(() => findNonStarterSpeciesById("kithna_clodian")?.evolution.lowform ?? "");
  const [hatchlingName, setHatchlingName] = useState(() => findNonStarterSpeciesById("kithna_clodian")?.evolution.hatchling ?? "");
  const uploadedUrls = useRef<string[]>([]);
  const playing = phase !== "idle";

  useEffect(() => () => uploadedUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setAssetError(false);
    Promise.all([fromImage, toImage].map((src) => {
      const image = new Image();
      image.src = src;
      return image.decode();
    })).then(() => { if (!cancelled) setReady(true); })
      .catch(() => { if (!cancelled) setAssetError(true); });
    return () => { cancelled = true; };
  }, [fromImage, toImage]);

  useEffect(() => {
    if (phase === "idle") return;
    const timer = window.setTimeout(() => {
      setPhase(PHASES[PHASES.indexOf(phase) + 1] ?? "idle");
    }, PREVIEW_DURATIONS[phase]);
    let frame = 0;
    if (phase === "hpDrain") {
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / 220);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayedHp(Math.round(100 * (1 - eased)));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }
    if (phase === "celebration") {
      const start = performance.now();
      const targetHp = recoveredPreviewHp(100);
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / 1100);
        setDisplayedHp(Math.round(targetHp * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }
    return () => { clearTimeout(timer); cancelAnimationFrame(frame); };
  }, [phase]);

  function selectImage(file: File | undefined, setImage: (value: string) => void) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    uploadedUrls.current.push(url);
    setImage(url);
  }

  const request: ResonanceEvolutionRequest = {
    petId: "visual-preview", kithName: hatchlingName.trim() || "Hatchling", fromStage: "hatchling", toStage: "lowform",
    element, elements: [element], fromImage, toImage, evolvedName: evolvedName.trim() || undefined, currentHp: 100, maxHp: 100, persist: false,
  };

  const energyStyle: CSSProperties & Record<"--resonance-color" | "--resonance-accent", string> = {
    "--resonance-color": ELEMENT_RESONANCE[element].color,
    "--resonance-accent": ELEMENT_RESONANCE[element].accent,
  };

  return (
    <main className="resonancePreview" style={energyStyle}>
      <style>{`
        .resonancePreview .resonanceEvolution {
          --phase-duration: ${playing ? PREVIEW_DURATIONS[phase] : 0}ms !important;
        }
        .resonancePreview > .resonanceEvolution .resonanceEvolution__energy { display: none; }
        .resonancePreview .resonanceEvolution__scene { animation: none; }
        .resonancePreview .resonanceEvolution .resonanceEvolution__celebrationText { display: none; }
        .resonancePreview__evolutionMessage {
          position: fixed;
          z-index: 2147483000;
          pointer-events: none;
        }
        .resonancePreview .resonanceEvolution__shot { --resonance-accent: #fff; }
        .resonancePreview__arrival .resonanceEvolution__scene {
          animation: resonanceSceneIn 350ms ease-out 350ms both;
        }
        .resonancePreview__bubbleLayer {
          position: fixed;
          inset: 0;
          z-index: 2147483000;
          pointer-events: none;
        }
        .resonancePreview__bubbleLayer .resonanceEvolution__energy {
          overflow: visible;
          transform-origin: 50% 50%; /* Same center as the beam contact. */
        }
        .resonancePreview__bubbleLayer--hpDrain .resonanceEvolution__energy {
          animation: resonancePreviewImpactBubble 690ms ease-out both;
        }
        @keyframes resonancePreviewImpactBubble {
          0% { opacity: .12; transform: scale(.015); }
          100% { opacity: .48; transform: scale(1); }
        }
        .resonancePreview .resonanceEvolution__energy {
          background: radial-gradient(circle at 38% 28%, color-mix(in srgb, var(--resonance-color) 30%, white) 0%, var(--resonance-color) 28%, color-mix(in srgb, var(--resonance-color) 48%, #18203a) 62%, color-mix(in srgb, var(--resonance-color) 22%, #171327) 83%, #102333 100%);
          border: 2px solid color-mix(in srgb, var(--resonance-accent) 45%, transparent);
          box-sizing: border-box;
          box-shadow: inset 0 0 26px color-mix(in srgb, var(--resonance-accent) 33%, transparent), inset 0 0 65px color-mix(in srgb, var(--resonance-color) 20%, transparent), 0 0 24px color-mix(in srgb, var(--resonance-color) 40%, transparent), 0 0 58px color-mix(in srgb, var(--resonance-color) 22%, transparent);
        }
        .resonancePreview .resonanceEvolution__energy::before,
        .resonancePreview .resonanceEvolution__shellArcs {
          display: none;
        }
        .resonancePreview .resonanceEvolution__energy::after {
          inset: 13%;
          background: radial-gradient(circle at 34% 24%, color-mix(in srgb, var(--resonance-accent) 45%, transparent), color-mix(in srgb, var(--resonance-color) 20%, transparent) 32%, color-mix(in srgb, var(--resonance-color) 27%, transparent) 75%);
          box-shadow: 0 0 32px color-mix(in srgb, var(--resonance-accent) 33%, transparent);
          opacity: 1;
          animation: none;
        }
        .resonancePreview__bubbleLayer--transformation .resonanceEvolution__energy {
          animation: resonancePreviewBubble 1650ms linear both;
        }
        @keyframes resonancePreviewBubble {
          0% { opacity: .48; transform: translate(0, 0); filter: brightness(1); }
          45% { opacity: 1; transform: translate(0, 0); filter: brightness(1); }
          55% { transform: translate(-2px, 1px); }
          63% { transform: translate(3px, -2px); }
          71% { transform: translate(-4px, 2px); }
          78% { transform: translate(4px, -3px); }
          85% { transform: translate(-5px, -2px); }
          91% { transform: translate(5px, 3px); }
          96% { transform: translate(-3px, 1px); }
          100% { opacity: 1; transform: translate(0, 0); filter: brightness(1.8) drop-shadow(0 0 28px var(--resonance-accent)); }
        }
        .resonancePreview .resonancePreview__bubbleLayer--reveal .resonanceEvolution__energy {
          background: none;
          border-color: transparent;
          box-shadow: none;
        }
        .resonancePreview .resonancePreview__bubbleLayer--reveal .resonanceEvolution__energy::after {
          inset: 0;
          background: radial-gradient(circle, var(--resonance-accent), var(--resonance-color) 55%, transparent 72%);
          animation: resonanceLightningClear 230ms ease-out both;
        }
        .resonancePreview__fragment {
          position: absolute;
          inset: -2px;
          border-radius: 50%;
          background: conic-gradient(from var(--turn), transparent 0deg 8deg, var(--resonance-accent) 13deg, color-mix(in srgb, var(--resonance-color) 60%, transparent) 24deg, transparent 42deg 360deg);
          mask-image: radial-gradient(ellipse, transparent 32%, #000 51%, #0008 61%, transparent 72%);
          mix-blend-mode: screen;
          animation: resonancePreviewShatter 620ms cubic-bezier(.18,.65,.35,1) both;
        }
        @keyframes resonancePreviewShatter {
          0% { opacity: 1; transform: translate(0, 0) rotate(0) scale(1); filter: blur(3px) brightness(1.8); }
          30% { opacity: .85; }
          100% { opacity: 0; transform: translate(var(--dx), var(--dy)) rotate(28deg) scale(1.3); filter: blur(12px) brightness(1); }
        }
        .resonancePreview__bubbleLayer--reduced .resonanceEvolution__energy { animation: resonanceSceneIn 350ms both; }
        .resonancePreview__bubbleLayer--reduced .resonancePreview__fragment { animation: resonanceLightningClear 620ms both; }
        .resonancePreview .resonanceEvolution--reduced.resonanceEvolution--reveal .resonanceEvolution__energy {
          animation-name: resonanceLightningClear;
        }
        .resonancePreview .resonanceEvolution--reduced.resonanceEvolution--transformation .resonanceEvolution__energy {
          animation-name: resonanceSceneIn;
        }
        @media (prefers-reduced-motion: reduce) {
          .resonancePreview__bubbleLayer .resonanceEvolution__energy { animation: resonanceSceneIn 350ms both; }
          .resonancePreview__fragment { animation: resonanceLightningClear 620ms both; }
          .resonancePreview .resonanceEvolution--transformation .resonanceEvolution__energy {
            animation-name: resonanceSceneIn;
          }
          .resonancePreview .resonanceEvolution--reveal .resonanceEvolution__energy {
            animation-name: resonanceLightningClear;
          }
        }
      `}</style>
      <section className="resonancePreview__controls">
        <p>DELTAPETS / CINEMATIC PREVIEW</p>
        <h1>Resonance Evolution</h1>
        <p>White entrance. Recoil. Red collision. Lightning. Sealed energy. Evolution.</p>
        <p>Visual only: HP drops to zero, then refills halfway after the reveal. No player data is saved.</p>
        <label>Element energy
          <select disabled={playing} value={element} onChange={(event) => setElement(normalizeResonanceElement(event.target.value))}>
            {Object.keys(ELEMENT_RESONANCE).map((key) => <option key={key} value={key}>{key[0].toUpperCase() + key.slice(1)}</option>)}
          </select>
        </label>
        <label><input type="checkbox" checked={reducedMotion} disabled={playing} onChange={(event) => setReducedMotion(event.target.checked)} /> Reduced motion</label>
        <details>
          <summary>Preview another Kith</summary>
          <p>Choose existing images locally. They stay in this browser preview.</p>
          <label>Hatchling image<input type="file" accept="image/png,image/webp,image/jpeg" disabled={playing} onChange={(event) => selectImage(event.target.files?.[0], setFromImage)} /></label>
          <label>Evolved image<input type="file" accept="image/png,image/webp,image/jpeg" disabled={playing} onChange={(event) => selectImage(event.target.files?.[0], setToImage)} /></label>
          <label>Hatchling form name<input type="text" value={hatchlingName} disabled={playing} onChange={(event) => setHatchlingName(event.target.value)} /></label>
          <label>Lowform name<input type="text" value={evolvedName} disabled={playing} onChange={(event) => setEvolvedName(event.target.value)} /></label>
        </details>
        <small>The initial pair uses Clodion and the evolved artwork from your earlier preview. Actual element symbols can be supplied later.</small>
        {assetError && <p role="alert">An image could not be loaded. Choose another image or reload.</p>}
      </section>
      {phase === "elementReveal" && (
        <div className="resonancePreview__arrival">
          <ResonanceEvolutionOverlay request={request} phase="elementalBuild" displayedHp={displayedHp} reducedMotion={reducedMotion} />
        </div>
      )}
      <ResonanceEvolutionOverlay
        request={playing ? request : null}
        phase={phase === "fadeGameplay" || phase === "environment" || phase === "summon" ? "elementalBuild" : phase}
        displayedHp={displayedHp}
        reducedMotion={reducedMotion}
      />
      {(phase === "hpDrain" || phase === "transformation" || phase === "reveal") && (
        <div className={`resonancePreview__bubbleLayer resonancePreview__bubbleLayer--${phase}${reducedMotion ? " resonancePreview__bubbleLayer--reduced" : ""}`} aria-hidden="true">
          <div className="resonanceEvolution__petStage">
            <div className="resonanceEvolution__character">
              <div className="resonanceEvolution__energy">
                {phase === "reveal" && Array.from({ length: 8 }, (_, index) => {
                  const angle = index * Math.PI / 4;
                  const middle = angle + Math.PI / 8;
                  const fragmentStyle: CSSProperties & Record<"--dx" | "--dy" | "--turn", string> = {
                    "--dx": `${Math.cos(middle) * 38}%`,
                    "--dy": `${Math.sin(middle) * 38}%`,
                    "--turn": `${index * 45}deg`,
                  };
                  return <span key={index} className="resonancePreview__fragment" style={fragmentStyle} />;
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      {(phase === "celebration" || phase === "complete") && (
        <div className="resonanceEvolution__celebrationText resonancePreview__evolutionMessage" role="status">
          {hatchlingName.trim() || "Hatchling"} evolved into {evolvedName.trim() || "Lowform"}
        </div>
      )}
      <div className="resonancePreview__playback">
        <button disabled={playing || !ready} onClick={() => { setDisplayedHp(100); setHasPlayed(true); setPhase("warningTransparent"); }}>
          {playing ? "Playing…" : !ready ? "Loading artwork…" : hasPlayed ? "Replay" : "Play"}
        </button>
        {playing && <button onClick={() => setPhase("idle")}>Stop preview</button>}
      </div>
    </main>
  );
}
