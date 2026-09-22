import { useEffect, useMemo, useRef, useState } from "react";
import { ELEMENT_RESONANCE } from "./resonanceElements";
import type {
  ResonanceEvolutionPhase,
  ResonanceEvolutionRequest,
} from "./resonanceEvolution.types";
import "./resonanceEvolution.css";

type Props = {
  request: ResonanceEvolutionRequest | null;
  phase: ResonanceEvolutionPhase;
  displayedHp: number;
  reducedMotion: boolean;
};

const ACTIVE_SCENE_PHASES = new Set<ResonanceEvolutionPhase>([
  "environment",
  "summon",
  "elementalBuild",
  "strain",
  "hpDrain",
  "transformation",
  "reveal",
  "celebration",
  "complete",
]);

const TITLE_PHASES = new Set<ResonanceEvolutionPhase>([
  "warningTransparent",
  "warningRed",
  "elementReveal",
  "fadeGameplay",
]);

function EffectParticles({
  effect,
}: {
  effect: ResonanceEvolutionRequest["element"];
}) {
  return (
    <div
      className={`resonanceEvolution__elementFx resonanceEvolution__elementFx--${effect}`}
      aria-hidden="true"
    >
      {Array.from({ length: 18 }, (_, index) => (
        <span
          key={index}
          className="resonanceEvolution__particle"
          style={
            {
              "--particle-index": index,
              "--particle-delay": `${(index % 7) * 0.11}s`,
              "--particle-x": `${((index * 37) % 100) - 50}%`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function ResonanceEvolutionOverlay({
  request,
  phase,
  displayedHp,
  reducedMotion,
}: Props) {
  const firstRenderRef = useRef(true);
  const [mirrorStorm, setMirrorStorm] = useState(false);

  useEffect(() => {
    if (!request || request.element !== "storm") return;
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      setMirrorStorm(request.petId.length % 2 === 0);
    }
  }, [request]);

  const config = useMemo(
    () => (request ? ELEMENT_RESONANCE[request.element] : null),
    [request],
  );

  if (!request || !config || phase === "idle") return null;

  const sceneActive = ACTIVE_SCENE_PHASES.has(phase);
  const titleActive = TITLE_PHASES.has(phase);
  const isStraining = phase === "strain" || phase === "hpDrain";
  const isTransforming = phase === "transformation";
  const isRevealed = phase === "reveal" || phase === "celebration" || phase === "complete";
  const showFrom = sceneActive && !isTransforming && !isRevealed;
  const showTo = sceneActive && isRevealed;
  const hpMax = Math.max(1, request.maxHp ?? request.currentHp ?? 1);
  const hpPercent = Math.max(1, Math.min(100, (displayedHp / hpMax) * 100));

  return (
    <div
      className={`resonanceEvolution resonanceEvolution--${phase}${
        reducedMotion ? " resonanceEvolution--reduced" : ""
      }`}
      style={
        {
          "--resonance-color": config.color,
          "--resonance-accent": config.accent,
        } as React.CSSProperties
      }
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="resonanceEvolution__takeover" aria-hidden="true" />

      {titleActive ? (
        <div className="resonanceEvolution__warningLayer" aria-hidden="true">
          <div className="resonanceEvolution__title">
            <span>RESONANCE</span>
            <span>EVOLUTION</span>
          </div>
        </div>
      ) : null}

      {sceneActive ? (
        <div className="resonanceEvolution__scene">
          <div className="resonanceEvolution__wallGrid" aria-hidden="true" />
          <div className="resonanceEvolution__floorGrid" aria-hidden="true" />

          <div className="resonanceEvolution__composition">
            <div className="resonanceEvolution__rune" aria-hidden="true">
              {config.rune}
            </div>

            <EffectParticles effect={request.element} />

            {request.element === "storm" &&
            (phase === "elementalBuild" ||
              phase === "strain" ||
              phase === "hpDrain" ||
              phase === "transformation") ? (
              <div
                className={`resonanceEvolution__stormStrike${
                  mirrorStorm ? " resonanceEvolution__stormStrike--mirror" : ""
                }`}
                aria-hidden="true"
              >
                <span />
                <span />
                <span />
              </div>
            ) : null}

            <div className="resonanceEvolution__petStage">
              <div className="resonanceEvolution__platform" aria-hidden="true" />

              {showFrom ? (
                <img
                  className={`resonanceEvolution__pet resonanceEvolution__pet--from${
                    isStraining ? " resonanceEvolution__pet--strain" : ""
                  }`}
                  src={isStraining && request.strainImage ? request.strainImage : request.fromImage}
                  alt=""
                  aria-hidden="true"
                />
              ) : null}

              {isTransforming ? (
                <div className="resonanceEvolution__transformBody" aria-hidden="true">
                  <img
                    className="resonanceEvolution__pet resonanceEvolution__pet--silhouette resonanceEvolution__pet--silhouetteFrom"
                    src={request.fromImage}
                    alt=""
                  />
                  <img
                    className="resonanceEvolution__pet resonanceEvolution__pet--silhouette resonanceEvolution__pet--silhouetteTo"
                    src={request.toImage}
                    alt=""
                  />
                </div>
              ) : null}

              {showTo ? (
                <img
                  className="resonanceEvolution__pet resonanceEvolution__pet--to"
                  src={request.toImage}
                  alt=""
                  aria-hidden="true"
                />
              ) : null}
            </div>

            {(phase === "strain" || phase === "hpDrain" || phase === "transformation") ? (
              <div className="resonanceEvolution__hp" aria-label={`HP ${displayedHp} of ${hpMax}`}>
                <div className="resonanceEvolution__hpLabel">
                  <span>HP</span>
                  <strong>{displayedHp}</strong>
                </div>
                <div className="resonanceEvolution__hpTrack">
                  <div
                    className="resonanceEvolution__hpFill"
                    style={{ width: `${hpPercent}%` }}
                  />
                </div>
              </div>
            ) : null}

            {phase === "celebration" || phase === "complete" ? (
              <>
                <div className="resonanceEvolution__sparklers" aria-hidden="true">
                  {Array.from({ length: 28 }, (_, index) => (
                    <span
                      key={index}
                      style={
                        {
                          "--spark-index": index,
                          "--spark-angle": `${index * (360 / 28)}deg`,
                        } as React.CSSProperties
                      }
                    />
                  ))}
                </div>
                <div className="resonanceEvolution__celebrationText">
                  Your <strong>{request.kithName}</strong> has Evolved
                </div>
              </>
            ) : null}
          </div>

          <div
            className="resonanceEvolution__flash"
            aria-hidden="true"
          />
        </div>
      ) : null}
    </div>
  );
}
