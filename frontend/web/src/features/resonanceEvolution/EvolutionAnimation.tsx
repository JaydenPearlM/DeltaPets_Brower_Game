import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

/** One scene per element, shared by EVERY pet of that element. */
export type EvolutionElement = "fire" | "water" | "ice" | "earth" | "storm" | "shadow" | "light" | "air" | "voidborne";

export interface EvolutionForm {
  /** The species/form name from the pet registry. */
  name: string;
  nickname?: string | null;
  /** Pass the real imported PNG or resolved registry URL; no starter fallback. */
  image: string;
}

export interface EvolutionAnimationProps {
  element: EvolutionElement;
  hatchling: EvolutionForm;
  lowform: EvolutionForm;
  /** Optional approved element artwork. */
  elementSymbol?: string;
  /** Optional visual HP values supplied by the caller; never writes pet data. */
  hp?: { current: number; max: number; after: number };
  onComplete?: () => void;
}

type ResonanceEvolutionPhase = "idle" | "warningTransparent" | "warningRed" | "elementReveal" | "fadeGameplay" | "environment" | "summon" | "elementalBuild" | "strain" | "hpDrain" | "transformation" | "reveal" | "celebration" | "complete";
type ResonanceEvolutionRequest = {
  element: EvolutionElement;
  kithName: string;
  evolvedName: string;
  fromImage: string;
  toImage: string;
  elementSymbol?: string;
  currentHp?: number;
  maxHp?: number;
};

// ELEMENT SECTIONS: edit a palette here to affect all pets of that element.
export const EVOLUTION_ELEMENTS: Readonly<Record<EvolutionElement, { color: string; accent: string }>> = {
  // FIRE — Kindlekin, Magmado, and every other fire pet share this scene.
  fire: { color: "#ff6b2c", accent: "#ffd06a" },
  // WATER
  water: { color: "#39a9ff", accent: "#b9efff" },
  // ICE
  ice: { color: "#8cdcff", accent: "#eefcff" },
  // EARTH
  earth: { color: "#6ed56c", accent: "#c7e68f" },
  // STORM
  storm: { color: "#ffd83d", accent: "#56dfff" },
  // SHADOW
  shadow: { color: "#a66cff", accent: "#d7b9ff" },
  // LIGHT
  light: { color: "#ffe7a0", accent: "#ffffff" },
  // AIR
  air: { color: "#a9efff", accent: "#f0fdff" },
  // VOIDBORNE — visual palette only; no gameplay rules are changed.
  voidborne: { color: "#ff4fd8", accent: "#8d61ff" },
};

/** A blank nickname falls back to the form's species name. */
export function evolutionDisplayName(form: EvolutionForm): string {
  return form.nickname?.trim() || form.name;
}

/**
 * Mount after gameplay has approved the evolution; unmount on completion.
 * Supply both real pet PNGs and both form names. Use key={pet.id} when
 * switching pets. This component plays visuals only and makes no API calls.
 *
 * <EvolutionAnimation element="fire"
 *   hatchling={{ name: hatchlingName, nickname: pet.name, image: hatchlingPng }}
 *   lowform={{ name: lowformName, nickname: pet.name, image: lowformPng }}
 *   onComplete={closeAnimation} />
 */
export function EvolutionAnimation({ element, hatchling, lowform, elementSymbol, hp, onComplete }: EvolutionAnimationProps) {
  const [phase, setPhase] = useState<ResonanceEvolutionPhase>("idle");
  const [displayedHp, setDisplayedHp] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const completeRef = useRef(onComplete);
  useEffect(() => { completeRef.current = onComplete; }, [onComplete]);

  const fromName = evolutionDisplayName(hatchling);
  const toName = evolutionDisplayName(lowform);
  const currentHp = hp?.current;
  const maxHp = hp?.max;
  const afterHp = hp?.after;

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    const images: HTMLImageElement[] = [];
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(motion.matches);
    updateMotion();
    motion.addEventListener("change", updateMotion);
    setPhase("idle");
    setError(null);
    const load = (src: string) => new Promise<void>((resolve, reject) => {
      if (!src.trim()) { reject(new Error("A pet PNG is missing.")); return; }
      const image = new Image();
      images.push(image);
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("A pet PNG could not be loaded."));
      image.src = src;
    });
    const start = async () => {
      try {
        await Promise.all([load(hatchling.image), load(lowform.image)]);
        if (cancelled) return;
        const startTime = performance.now();
        const tick = (now: number) => {
          if (cancelled) return;
          let elapsed = now - startTime;
          let active: Exclude<ResonanceEvolutionPhase, "idle"> | undefined;
          for (const step of PHASES) {
            if (elapsed < NORMAL_DURATIONS[step]) { active = step; break; }
            elapsed -= NORMAL_DURATIONS[step];
          }
          if (!active) {
            setPhase("idle");
            completeRef.current?.();
            return;
          }
          setPhase(active);
          const maximum = Math.max(1, maxHp ?? 1);
          const before = Math.max(0, Math.min(maximum, currentHp ?? 0));
          const after = Math.max(0, Math.min(maximum, afterHp ?? before));
          const amount = active === "hpDrain" ? before * (1 - Math.min(1, elapsed / 950))
            : active === "transformation" || active === "reveal" ? 0
            : active === "celebration" ? after * Math.min(1, elapsed / NORMAL_DURATIONS.celebration)
            : active === "complete" ? after : before;
          setDisplayedHp(Math.round(amount));
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to load pet artwork.");
      }
    };
    void start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      motion.removeEventListener("change", updateMotion);
      images.forEach(image => { image.onload = null; image.onerror = null; });
    };
  }, [hatchling.image, lowform.image, fromName, toName, element, currentHp, maxHp, afterHp]);

  const request: ResonanceEvolutionRequest = {
    element, kithName: fromName, evolvedName: toName,
    fromImage: hatchling.image, toImage: lowform.image,
    elementSymbol, currentHp, maxHp,
  };
  return <>
    <style>{EVOLUTION_CSS}</style>
    {error ? <div role="alert">{error}</div> :
      <EvolutionScene request={request} phase={phase} displayedHp={displayedHp} reducedMotion={reducedMotion} />}
  </>;
}


// Existing phase names keep the global provider's queue/commit contract intact.
export const PHASES: readonly Exclude<ResonanceEvolutionPhase, "idle">[] = [
  "warningTransparent", "warningRed", "elementReveal", "fadeGameplay",
  "environment", "summon", "elementalBuild", "strain", "hpDrain",
  "transformation", "reveal", "celebration", "complete",
];

export const NORMAL_DURATIONS: Record<Exclude<ResonanceEvolutionPhase, "idle">, number> = {
  warningTransparent: 1600, // White entrance, easing into its stop.
  warningRed: 950,         // Recoil, red collision, short impact hold.
  elementReveal: 850,      // Announcement flies toward the viewer.
  fadeGameplay: 600,       // Existing stage fades in.
  environment: 250,
  summon: 1000,
  elementalBuild: 750,     // Let the Hatchling settle before the strike.
  strain: 600,             // Lightning travels; no HP bar yet.
  hpDrain: 1200,           // Contact, visible drain to zero, 250ms hold.
  transformation: 2400,   // Form, seal, pressure; no orbiting geometry.
  reveal: 650,             // Bubble pops before HP recovery.
  celebration: 1600,
  complete: 1100,
};



type Props = {
  request: ResonanceEvolutionRequest | null;
  phase: ResonanceEvolutionPhase;
  displayedHp: number;
  reducedMotion: boolean;
};

const TITLE_PHASES = new Set<ResonanceEvolutionPhase>([
  "warningTransparent", "warningRed", "elementReveal",
]);
const HIDDEN_PET_PHASES = new Set<ResonanceEvolutionPhase>([
  "fadeGameplay", "environment",
]);
const HP_PHASES = new Set<ResonanceEvolutionPhase>([
  "hpDrain", "transformation", "reveal", "celebration", "complete",
]);

type CinematicStyle = CSSProperties & {
  "--dp-single-color": string;
  "--dp-single-accent": string;
  "--phase-duration": string;
};

function EvolutionScene({ request, phase, displayedHp, reducedMotion }: Props) {
  if (!request || phase === "idle") return null;
  const config = EVOLUTION_ELEMENTS[request.element];
  const titleActive = TITLE_PHASES.has(phase);
  const evolved = phase === "reveal" || phase === "celebration" || phase === "complete";
  const transforming = phase === "transformation";
  const hpMax = Math.max(1, request.maxHp ?? request.currentHp ?? 1);
  const hp = transforming || phase === "reveal"
    ? 0 : Math.max(0, Math.min(hpMax, displayedHp));
  const style: CinematicStyle = {
    "--dp-single-color": config.color,
    "--dp-single-accent": config.accent,
    "--phase-duration": `${NORMAL_DURATIONS[phase]}ms`,
  };

  return (
    <div className={`dpSingleEvolution dpSingleEvolution--${phase}${reducedMotion ? " dpSingleEvolution--reduced" : ""}`} style={style}>
      {titleActive ? (
        <div className="dpSingleEvolution__warningLayer" aria-label="Resonance Evolution">
          <div className="dpSingleEvolution__announcement">
            <span className="dpSingleEvolution__word dpSingleEvolution__word--left">RESONANCE</span>
            <span className="dpSingleEvolution__word dpSingleEvolution__word--right">EVOLUTION</span>
          </div>
          <div className="dpSingleEvolution__impactPulse" aria-hidden="true" />
        </div>
      ) : (
        <div className="dpSingleEvolution__scene">
          <div className="dpSingleEvolution__wallGrid" aria-hidden="true" />
          <div className="dpSingleEvolution__floorGrid" aria-hidden="true" />
          <div className="dpSingleEvolution__composition">
            <div className="dpSingleEvolution__petStage">
              <div className="dpSingleEvolution__platform" aria-hidden="true" />
              <div className="dpSingleEvolution__character">
                {request.elementSymbol && <img className="dpSingleEvolution__symbol" src={request.elementSymbol} alt="" aria-hidden="true" />}
                {!HIDDEN_PET_PHASES.has(phase) && (
                  <img
                    key={evolved ? "evolved" : "hatchling"}
                    className={`dpSingleEvolution__pet ${evolved ? "dpSingleEvolution__pet--to" : "dpSingleEvolution__pet--from"}`}
                    src={evolved ? request.toImage : request.fromImage}
                    alt={evolved ? request.evolvedName : request.kithName}
                  />
                )}
                {(phase === "strain" || phase === "hpDrain") && (
                  <div className="dpSingleEvolution__shot" aria-hidden="true"><span /></div>
                )}
                {phase === "hpDrain" && <div className="dpSingleEvolution__contact" aria-hidden="true" />}
                {(transforming || phase === "reveal") && (
                  <div className="dpSingleEvolution__energy" aria-hidden="true" />
                )}
              </div>
            </div>
            {request.maxHp !== undefined && HP_PHASES.has(phase) && (
              <div className="dpSingleEvolution__hp" aria-label={`HP ${hp} of ${hpMax}`}>
                <div className="dpSingleEvolution__hpLabel"><span>HP</span><strong>{hp} / {hpMax}</strong></div>
                <div className="dpSingleEvolution__hpTrack">
                  <div className="dpSingleEvolution__hpFill" style={{ transform: `scaleX(${hp / hpMax})` }} />
                </div>
              </div>
            )}
            {(phase === "celebration" || phase === "complete") && (
              <div className="dpSingleEvolution__celebrationText" role="status">{request.kithName} has evolved into {request.evolvedName}!</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const EVOLUTION_CSS = `.dpSingleEvolution__wallGrid {
  position: absolute;
  inset: 0;
  opacity: 0.1;
  background-image:
    linear-gradient(rgba(63, 255, 124, 0.74) 1px, transparent 1px),
    linear-gradient(90deg, rgba(63, 255, 124, 0.74) 1px, transparent 1px);
  background-size: 54px 54px;
  mask-image: linear-gradient(to bottom, #000 0%, #000 68%, transparent 96%);
}

.dpSingleEvolution__floorGrid {
  position: absolute;
  left: -25%;
  right: -25%;
  bottom: -30%;
  height: 68%;
  transform-origin: 50% 100%;
  transform: perspective(520px) rotateX(64deg);
  background-image:
    linear-gradient(rgba(72, 255, 126, 0.66) 1px, transparent 1px),
    linear-gradient(90deg, rgba(72, 255, 126, 0.66) 1px, transparent 1px);
  background-size: 72px 52px;
  opacity: 0.48;
  animation: dpSingleFloorMove 1.35s linear infinite;
}

.dpSingleEvolution__composition {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}

.dpSingleEvolution__petStage {
  position: absolute;
  left: 50%;
  top: 54%;
  width: min(72vw, 740px);
  height: min(58vh, 560px);
  transform: translate(-50%, -50%);
  z-index: 7;
}

.dpSingleEvolution__platform {
  position: absolute;
  left: 50%;
  bottom: 4%;
  width: min(58vw, 520px);
  height: min(12vw, 112px);
  transform: translateX(-50%);
  border-radius: 50%;
  background:
    radial-gradient(ellipse at center,
      rgba(198, 113, 255, 0.34) 0%,
      rgba(132, 48, 204, 0.68) 42%,
      rgba(78, 27, 124, 0.48) 68%,
      transparent 74%);
  box-shadow:
    0 0 26px rgba(186, 94, 255, 0.38),
    0 0 68px rgba(139, 57, 211, 0.24);
}

.dpSingleEvolution {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  overflow: hidden;
  isolation: isolate;
  color: #fff;
  font-family: var(--font-heading, system-ui, sans-serif);
  pointer-events: auto;
}
.dpSingleEvolution__warningLayer {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  perspective: 700px;
}
.dpSingleEvolution__announcement {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .18em;
  white-space: nowrap;
  font-size: clamp(16px, 5.8vw, 88px);
  font-weight: 900;
  line-height: 1;
  letter-spacing: -.025em;
  transform-style: preserve-3d;
  z-index: 2;
}
.dpSingleEvolution__word {
  display: block;
  color: #fff;
  text-shadow: 0 0 12px #ffffff70, 0 0 28px #bceaff38;
  will-change: transform, opacity;
}
.dpSingleEvolution__word--left { --entry: -100vw; --recoil: -12vw; }
.dpSingleEvolution__word--right { --entry: 100vw; --recoil: 12vw; }
.dpSingleEvolution--warningTransparent .dpSingleEvolution__word {
  animation: dpSingleEntrance var(--phase-duration) cubic-bezier(.16,.72,.2,1) both;
}
.dpSingleEvolution--warningRed .dpSingleEvolution__word {
  animation: dpSingleRecoilImpact var(--phase-duration) linear both;
}
.dpSingleEvolution--elementReveal .dpSingleEvolution__word {
  color: #ff263e;
  text-shadow: 0 0 12px #ff233eb3, 0 0 32px #ff162b80;
}
.dpSingleEvolution--elementReveal .dpSingleEvolution__announcement {
  animation: dpSingleFlyForward var(--phase-duration) cubic-bezier(.55,.05,.8,.4) both;
}
.dpSingleEvolution__impactPulse {
  position: absolute;
  width: min(66vw, 480px);
  aspect-ratio: 1;
  border: 2px solid #ff3850;
  border-radius: 50%;
  box-shadow: 0 0 30px #ff233e88, inset 0 0 20px #ff233e66;
  opacity: 0;
  pointer-events: none;
}
.dpSingleEvolution--warningRed .dpSingleEvolution__impactPulse {
  animation: dpSingleImpactPulse var(--phase-duration) linear both;
}
.dpSingleEvolution__scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: radial-gradient(circle at 50% 44%, #14462814, transparent 36%), #000;
  animation: dpSingleSceneIn 600ms ease-out both;
}
.dpSingleEvolution__character {
  position: absolute;
  left: 50%;
  bottom: 11%;
  width: min(66vw, 46vh, 460px);
  aspect-ratio: 1;
  transform: translateX(-50%);
  isolation: isolate;
}
.dpSingleEvolution__pet {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 16px 24px #000b);
  z-index: 2;
}
.dpSingleEvolution--summon .dpSingleEvolution__pet--from {
  animation: dpSingleSummon var(--phase-duration) cubic-bezier(.16,.8,.2,1) both;
}
.dpSingleEvolution--hpDrain .dpSingleEvolution__pet--from {
  animation: dpSingleHit var(--phase-duration) ease-out both;
}
.dpSingleEvolution--transformation .dpSingleEvolution__pet--from {
  animation: dpSingleSealPet var(--phase-duration) linear both;
}
.dpSingleEvolution__symbol {
  position: absolute;
  inset: -12%;
  width: 124%;
  height: 124%;
  object-fit: contain;
  opacity: .3;
  z-index: 0;
}
.dpSingleEvolution__shot {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
  z-index: 4;
  pointer-events: none;
}
.dpSingleEvolution__shot > span {
  position: absolute;
  left: 0;
  top: -5px;
  width: clamp(160px, 26vw, 300px);
  height: 10px;
  border-radius: 60% 100% 100% 60%;
  transform: rotate(-48deg);
  transform-origin: left center;
  background: linear-gradient(90deg, #fff 0 8%, var(--dp-single-accent) 24%, transparent 100%);
  filter: drop-shadow(0 0 8px var(--dp-single-accent));
}
.dpSingleEvolution__shot::after {
  content: "";
  position: absolute;
  width: 10px;
  height: 10px;
  left: -5px;
  top: -5px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 12px #fff, 0 0 28px var(--dp-single-accent);
}
.dpSingleEvolution--strain .dpSingleEvolution__shot {
  animation: dpSingleShotTravel var(--phase-duration) cubic-bezier(.42,0,.85,.55) both;
}
.dpSingleEvolution--hpDrain .dpSingleEvolution__shot {
  animation: dpSingleLightningClear 240ms ease-out both;
}
@keyframes dpSingleShotTravel {
  from { transform: translate(48vw, -58vh); }
  to { transform: translate(0, 0); }
}
.dpSingleEvolution__contact {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 42%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle, #fff, var(--dp-single-accent) 25%, transparent 70%);
  transform: translate(-50%, -50%);
  animation: dpSingleContact 420ms ease-out both;
  z-index: 5;
}
.dpSingleEvolution__energy {
  position: absolute;
  inset: -23%;
  z-index: 6;
  border-radius: 50%;
  background: radial-gradient(circle at 42% 38%, #fff 0 12%, color-mix(in srgb, var(--dp-single-color) 25%, white) 35%, var(--dp-single-color) 72%, color-mix(in srgb, var(--dp-single-color) 45%, #080a16) 100%);
  box-shadow: inset -12px -16px 32px #0004, inset 0 0 22px #ffffffa0, 0 0 24px var(--dp-single-color), 0 0 55px color-mix(in srgb, var(--dp-single-color) 55%, transparent);
  transform-origin: center;
  will-change: transform, opacity;
  overflow: hidden;
}
.dpSingleEvolution__energy::before,
.dpSingleEvolution__energy::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
}
.dpSingleEvolution__energy::before {
  background: conic-gradient(from 20deg, transparent 0deg 20deg, color-mix(in srgb, var(--dp-single-color) 55%, #17213d) 48deg, #ffffffb3 62deg, transparent 90deg 155deg, color-mix(in srgb, var(--dp-single-color) 65%, #17213d) 195deg, #ffffff80 208deg, transparent 235deg 285deg, var(--dp-single-color) 315deg, #ffffff80 328deg, transparent 360deg);
  mask-image: radial-gradient(circle, transparent 8%, #000 35% 78%, transparent 100%);
  filter: blur(3px);
  animation: dpSingleEnergyRotation 1400ms linear infinite;
}
.dpSingleEvolution__energy::after {
  background: radial-gradient(ellipse at center, #ffffffb3, transparent 62%);
  opacity: .45;
}
.dpSingleEvolution--transformation .dpSingleEvolution__energy {
  animation: dpSingleEnergySeal var(--phase-duration) ease-in-out both;
}
.dpSingleEvolution--reveal .dpSingleEvolution__energy {
  animation: dpSingleEnergyPop var(--phase-duration) ease-out both;
}
.dpSingleEvolution--reveal .dpSingleEvolution__energy::after {
  background: #fff;
  animation: dpSingleEnergyRelease var(--phase-duration) ease-out both;
}
.dpSingleEvolution__hp {
  position: absolute;
  left: 50%;
  bottom: max(9%, 68px);
  width: min(72vw, 430px);
  transform: translateX(-50%);
  z-index: 12;
}
.dpSingleEvolution__hpLabel {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: .85rem;
  letter-spacing: .08em;
}
.dpSingleEvolution__hpTrack { height: 12px; border-radius: 999px; overflow: hidden; background: #ffffff24; }
.dpSingleEvolution__hpFill {
  width: 100%; height: 100%; transform-origin: left;
  background: linear-gradient(90deg, #ffb83d, #69ed9e);
  border-radius: inherit;
}
.dpSingleEvolution__celebrationText {
  position: absolute;
  top: max(7%, 28px);
  width: 100%;
  text-align: center;
  font-size: clamp(20px, 4vw, 38px);
  text-shadow: 0 0 18px var(--dp-single-accent);
  animation: dpSingleSceneIn 450ms ease-out both;
}
.dpSingleEvolution--complete { animation: dpSingleFinish 1100ms ease-in both; }

@keyframes dpSingleEntrance {
  from { opacity: 0; transform: translateX(var(--entry)); }
  25% { opacity: .8; }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes dpSingleRecoilImpact {
  0% { transform: translateX(0); color: #fff; animation-timing-function: cubic-bezier(.4,0,.6,1); }
  32% { transform: translateX(var(--recoil)) scale(.94); color: #fff; animation-timing-function: cubic-bezier(.7,0,1,.5); }
  57% { transform: translateX(0) scale(1); color: #ff263e; text-shadow: 0 0 20px #ff233e; }
  66% { transform: translateY(1px); color: #ff263e; }
  78% { transform: translateY(-.6px); color: #ff263e; }
  100% { transform: translateY(0); color: #ff263e; text-shadow: 0 0 12px #ff233eb3, 0 0 32px #ff162b80; }
}
@keyframes dpSingleImpactPulse {
  0%, 56% { opacity: 0; transform: scale(.15); }
  57% { opacity: .8; transform: scale(.15); }
  100% { opacity: 0; transform: scale(2.1); }
}
@keyframes dpSingleFlyForward {
  0% { opacity: 1; transform: translateZ(0); }
  65% { opacity: 1; }
  100% { opacity: 0; transform: translateZ(640px); }
}
@keyframes dpSingleSceneIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes dpSingleSummon {
  from { opacity: 0; transform: translateY(-12px) scale(.94); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes dpSingleLightningTravel { from { clip-path: inset(0 0 100% 100%); } to { clip-path: inset(0); } }
@keyframes dpSingleLightningClear { from { opacity: 1; } to { opacity: 0; } }
@keyframes dpSingleContact {
  0% { opacity: 1; transform: translate(-50%, -50%) scale(.25); }
  18% { opacity: 1; transform: translate(-50%, -50%) scale(1.35); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(2.2); }
}
@keyframes dpSingleHit {
  0%, 100% { transform: translate(0, 0); }
  8% { transform: translate(-8px, 5px); }
  20% { transform: translate(3px, -2px); }
  32% { transform: translate(-2px, 1px); }
  45% { transform: translate(0, 0); }
}
@keyframes dpSingleSealPet {
  0%, 49% { opacity: 1; visibility: visible; }
  50%, 100% { opacity: 0; visibility: hidden; }
}
@keyframes dpSingleEnergySeal {
  0% { opacity: 0; transform: scale(.08); }
  12% { opacity: 1; transform: scale(.24); }
  45%, 100% { opacity: 1; transform: scale(1); }
}
@keyframes dpSingleEnergyPop {
  0% { opacity: 1; transform: scale(1); }
  16% { opacity: 1; transform: scale(.88); }
  44% { opacity: .8; transform: scale(1.12); }
  70%, 100% { opacity: 0; transform: scale(1.25); }
}
@keyframes dpSingleEnergyRotation {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes dpSingleEnergySweep {
  from { opacity: 0; transform: translateX(-85%); }
  35%, 60% { opacity: .65; }
  to { opacity: 0; transform: translateX(85%); }
}
@keyframes dpSingleEnergyRelease {
  0% { opacity: 0; }
  20% { opacity: .6; }
  70%, 100% { opacity: 0; }
}
@keyframes dpSingleBeamDischarge {
  0%, 15% { opacity: 1; }
  35% { opacity: .65; }
  50% { opacity: .85; }
  100% { opacity: 0; }
}
@keyframes dpSingleCorePressure {
  from { opacity: .25; transform: scale(.8); }
  to { opacity: .75; transform: scale(1.12); }
}
@keyframes dpSinglePlasmaFlow {
  from { stroke-dashoffset: 0; opacity: .4; }
  50% { opacity: .95; }
  to { stroke-dashoffset: -52; opacity: .4; }
}
@keyframes dpSingleFinish { 0%, 55% { opacity: 1; } 100% { opacity: 0; } }
@keyframes dpSingleFloorMove {
  from { background-position: 0 0, 0 0; }
  to { background-position: 0 52px, 72px 0; }
}
@media (max-width: 640px) {
  .dpSingleEvolution__petStage { top: 55%; width: 94vw; height: 52vh; }
  .dpSingleEvolution__platform { width: 78vw; height: 18vw; }
  .dpSingleEvolution__character { width: min(70vw, 40vh); }
  .dpSingleEvolution__hp { width: 80vw; }
}
.dpSingleEvolution--reduced .dpSingleEvolution__word,
.dpSingleEvolution--reduced .dpSingleEvolution__announcement,
.dpSingleEvolution--reduced .dpSingleEvolution__pet,
.dpSingleEvolution--reduced .dpSingleEvolution__floorGrid {
  animation: none !important;
}
.dpSingleEvolution--reduced .dpSingleEvolution__impactPulse,
.dpSingleEvolution--reduced .dpSingleEvolution__energy::before,
.dpSingleEvolution--reduced .dpSingleEvolution__energy::after,
.dpSingleEvolution--reduced .dpSingleEvolution__plasma,
.dpSingleEvolution--reduced .dpSingleEvolution__contact { display: none; }
.dpSingleEvolution--reduced.dpSingleEvolution--warningRed .dpSingleEvolution__word { color: #ff263e; }
.dpSingleEvolution--reduced.dpSingleEvolution--elementReveal .dpSingleEvolution__announcement { animation: dpSingleLightningClear var(--phase-duration) ease both !important; }
.dpSingleEvolution--reduced.dpSingleEvolution--transformation .dpSingleEvolution__energy { animation: dpSingleSceneIn 500ms both; }
.dpSingleEvolution--reduced.dpSingleEvolution--reveal .dpSingleEvolution__energy { animation: dpSingleLightningClear 500ms both; }
.dpSingleEvolution--reduced.dpSingleEvolution--transformation .dpSingleEvolution__pet { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .dpSingleEvolution__word, .dpSingleEvolution__announcement, .dpSingleEvolution__pet, .dpSingleEvolution__floorGrid { animation: none !important; }
  .dpSingleEvolution__impactPulse, .dpSingleEvolution__contact { display: none; }
  .dpSingleEvolution__energy::before, .dpSingleEvolution__energy::after { display: none; }
  .dpSingleEvolution__plasma { display: none; }
  .dpSingleEvolution--warningRed .dpSingleEvolution__word { color: #ff263e; }
  .dpSingleEvolution--elementReveal .dpSingleEvolution__announcement { animation: dpSingleLightningClear var(--phase-duration) ease both !important; }
  .dpSingleEvolution--transformation .dpSingleEvolution__energy { animation: dpSingleSceneIn 500ms both; }
  .dpSingleEvolution--reveal .dpSingleEvolution__energy { animation: dpSingleLightningClear 500ms both; }
  .dpSingleEvolution--transformation .dpSingleEvolution__pet { opacity: 0; }
}


`;
