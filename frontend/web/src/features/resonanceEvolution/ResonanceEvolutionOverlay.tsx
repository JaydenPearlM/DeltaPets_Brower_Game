import type { CSSProperties } from "react";
import { ELEMENT_RESONANCE } from "./resonanceElements";
import type { ResonanceEvolutionPhase, ResonanceEvolutionRequest } from "./resonanceEvolution.types";
import { NORMAL_DURATIONS } from "./resonanceEvolution.timeline";
import "./resonanceEvolution.css";

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
  "--resonance-color": string;
  "--resonance-accent": string;
  "--phase-duration": string;
};

export function ResonanceEvolutionOverlay({ request, phase, displayedHp, reducedMotion }: Props) {
  if (!request || phase === "idle") return null;
  const config = ELEMENT_RESONANCE[request.element];
  const titleActive = TITLE_PHASES.has(phase);
  const evolved = phase === "reveal" || phase === "celebration" || phase === "complete";
  const transforming = phase === "transformation";
  const hpMax = Math.max(1, request.maxHp ?? request.currentHp ?? 1);
  const hp = transforming || phase === "reveal"
    ? 0 : Math.max(0, Math.min(hpMax, displayedHp));
  const style: CinematicStyle = {
    "--resonance-color": config.color,
    "--resonance-accent": config.accent,
    "--phase-duration": `${NORMAL_DURATIONS[phase]}ms`,
  };

  return (
    <div className={`resonanceEvolution resonanceEvolution--${phase}${reducedMotion ? " resonanceEvolution--reduced" : ""}`} style={style}>
      {titleActive ? (
        <div className="resonanceEvolution__warningLayer" aria-label="Resonance Evolution">
          <div className="resonanceEvolution__announcement">
            <span className="resonanceEvolution__word resonanceEvolution__word--left">RESONANCE</span>
            <span className="resonanceEvolution__word resonanceEvolution__word--right">EVOLUTION</span>
          </div>
          <div className="resonanceEvolution__impactPulse" aria-hidden="true" />
        </div>
      ) : (
        <div className="resonanceEvolution__scene">
          <div className="resonanceEvolution__wallGrid" aria-hidden="true" />
          <div className="resonanceEvolution__floorGrid" aria-hidden="true" />
          <div className="resonanceEvolution__composition">
            <div className="resonanceEvolution__petStage">
              <div className="resonanceEvolution__platform" aria-hidden="true" />
              <div className="resonanceEvolution__character">
                {request.elementSymbol && <img className="resonanceEvolution__symbol" src={request.elementSymbol} alt="" aria-hidden="true" />}
                {!HIDDEN_PET_PHASES.has(phase) && (
                  <img
                    key={evolved ? "evolved" : "hatchling"}
                    className={`resonanceEvolution__pet ${evolved ? "resonanceEvolution__pet--to" : "resonanceEvolution__pet--from"}`}
                    src={evolved ? request.toImage : request.fromImage}
                    alt={evolved ? `${request.kithName}, evolved form` : request.kithName}
                  />
                )}
                {(phase === "strain" || phase === "hpDrain") && (
                  <div className="resonanceEvolution__shot" aria-hidden="true"><span /></div>
                )}
                {phase === "hpDrain" && <div className="resonanceEvolution__contact" aria-hidden="true" />}
                {(transforming || phase === "reveal") && (
                  <div className="resonanceEvolution__energy" aria-hidden="true">
                    <svg className="resonanceEvolution__shellArcs" viewBox="0 0 200 200" fill="none">
                      <circle cx="100" cy="100" r="94" />
                      <ellipse cx="100" cy="100" rx="91" ry="32" transform="rotate(-32 100 100)" />
                      <ellipse cx="100" cy="100" rx="35" ry="93" transform="rotate(-24 100 100)" />
                      <path d="M28 48 40 53 33 66 47 72 38 87 48 103 40 116 53 129 49 148 65 158 M126 12 118 29 130 38 120 54 137 64 128 81 141 96 130 112 143 123 134 141 144 158 133 178 M177 57 162 69 173 82 159 94 169 109 154 121 162 138 147 151 M68 22 77 37 65 48 80 60 72 77 86 91 76 109 89 123 81 141 95 154 89 179" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
            {HP_PHASES.has(phase) && (
              <div className="resonanceEvolution__hp" aria-label={`HP ${hp} of ${hpMax}`}>
                <div className="resonanceEvolution__hpLabel"><span>HP</span><strong>{hp} / {hpMax}</strong></div>
                <div className="resonanceEvolution__hpTrack">
                  <div className="resonanceEvolution__hpFill" style={{ transform: `scaleX(${hp / hpMax})` }} />
                </div>
              </div>
            )}
            {(phase === "celebration" || phase === "complete") && (
              <div className="resonanceEvolution__celebrationText" role="status">Kith Has evolved into {request.evolvedName ?? request.kithName}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
