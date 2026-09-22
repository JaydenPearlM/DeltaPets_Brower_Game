import { useEffect, useMemo, useState } from "react";
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

function ElementEmblem({
  iconPath,
  rune,
  className = "",
}: {
  iconPath: string;
  rune: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [iconPath]);

  return (
    <div
      className={`resonanceEvolution__elementEmblem ${className}`}
      aria-hidden="true"
    >
      {!failed ? (
        <img
          className="resonanceEvolution__elementEmblemImage"
          src={iconPath}
          alt=""
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="resonanceEvolution__elementEmblemFallback">{rune}</span>
      )}
    </div>
  );
}

export function ResonanceEvolutionOverlay({
  request,
  phase,
  displayedHp,
  reducedMotion,
}: Props) {
  const [mirrorStorm, setMirrorStorm] = useState(false);

  useEffect(() => {
    if (!request || request.element !== "storm") return;
    setMirrorStorm(request.petId.length % 2 === 0);
  }, [request]);

  const config = useMemo(
    () => (request ? ELEMENT_RESONANCE[request.element] : null),
    [request],
  );

  if (!request || !config || phase === "idle") return null;

  const elements = (request.elements?.length ? request.elements : [request.element]).slice(0, 4);
  const primaryElement = elements[0] ?? request.element;

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
        <div
          className="resonanceEvolution__warningLayer"
          data-primary-element={primaryElement}
          data-element-count={elements.length}
          aria-hidden="true"
        >
          <div className="resonanceEvolution__lockComposition">
            <ElementEmblem
              iconPath={config.iconPath}
              rune={config.rune}
              className="resonanceEvolution__elementEmblem--lock"
            />

            <img
              className="resonanceEvolution__lockPet"
              src={request.fromImage}
              alt=""
            />

            <div className="resonanceEvolution__title">
              <span className="resonanceEvolution__titleWord resonanceEvolution__titleWord--resonance">
                RESONANCE
              </span>
              <span className="resonanceEvolution__titleWord resonanceEvolution__titleWord--evolution">
                EVOLUTION
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {sceneActive ? (
        <div className="resonanceEvolution__scene">
          <div className="resonanceEvolution__wallGrid" aria-hidden="true" />
          <div className="resonanceEvolution__floorGrid" aria-hidden="true" />

          <div className="resonanceEvolution__composition">
            <ElementEmblem
              iconPath={config.iconPath}
              rune={config.rune}
              className="resonanceEvolution__elementEmblem--scene"
            />

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
