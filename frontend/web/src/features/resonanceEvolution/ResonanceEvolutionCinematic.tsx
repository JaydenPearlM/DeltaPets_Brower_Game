import type { CSSProperties } from "react";
import { ResonanceEvolutionOverlay } from "./ResonanceEvolutionOverlay";
import { ELEMENT_RESONANCE } from "./resonanceElements";
import { CINEMATIC_DURATIONS } from "./resonanceEvolution.timeline";
import type { ResonanceEvolutionRequest, ResonanceEvolutionPhase } from "./resonanceEvolution.types";

type Props = { request: ResonanceEvolutionRequest | null; phase: ResonanceEvolutionPhase; displayedHp: number; reducedMotion: boolean };
export function ResonanceEvolutionCinematic({ request, phase, displayedHp, reducedMotion }: Props) {
  const playing = phase !== "idle";
  if (!playing || !request) return null;
  // Development previews may supply Lowform art; preserve gameplay's current artwork.
  const visualRequest = {
    ...request,
    toImage: import.meta.env.DEV && request.persist === false
      ? request.toImage
      : request.fromImage,
  };
  const config = ELEMENT_RESONANCE[request.element];
  const style: CSSProperties & Record<"--resonance-color" | "--resonance-accent", string> = {
    "--resonance-color": config.color, "--resonance-accent": config.accent,
  };
  return <div className="resonanceCinematic" style={style}>
      <style>{`
        .resonanceCinematic .resonanceEvolution {
          --phase-duration: ${playing ? CINEMATIC_DURATIONS[phase] : 0}ms !important;
        }
        .resonanceCinematic > .resonanceEvolution .resonanceEvolution__energy { display: none; }
        .resonanceCinematic .resonanceEvolution__scene { animation: none; }
        .resonanceCinematic__arrival .resonanceEvolution__scene {
          animation: resonanceSceneIn 350ms ease-out 350ms both;
        }
        .resonanceCinematic__floorSparkles {
          position: fixed;
          inset: 0;
          z-index: 2147483000;
          pointer-events: none;
          overflow: hidden;
        }
        .resonanceCinematic__floorSparkles--complete {
          animation: resonanceFinish 1100ms ease-in both;
        }
        .resonanceCinematic__sparkOrigin {
          position: absolute;
          left: 50%;
          bottom: 4%;
          width: min(58vw, 520px);
          height: min(12vw, 112px);
          transform: translateX(-50%);
        }
        .resonanceCinematic__floorSpark {
          position: absolute;
          left: var(--spark-x);
          bottom: var(--spark-y);
          width: var(--spark-size);
          height: var(--spark-size);
          opacity: 0;
          filter: drop-shadow(0 0 5px #d69aff);
          animation: resonanceCinematicSparkRise var(--spark-duration) linear var(--spark-delay) infinite;
        }
        .resonanceCinematic__floorSpark::before,
        .resonanceCinematic__floorSpark::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: #f8e8ff;
          box-shadow: 0 0 7px #bd75ff;
        }
        .resonanceCinematic__floorSpark::before { transform: scaleX(.22); }
        .resonanceCinematic__floorSpark::after { transform: scaleY(.22); }
        @keyframes resonanceCinematicSparkRise {
          0% { opacity: 0; transform: translate(0, 0) scale(.6); }
          15% { opacity: .85; }
          55% { opacity: .65; }
          100% { opacity: 0; transform: translate(var(--spark-drift), calc(-1 * var(--spark-rise))) scale(.9); }
        }
        @media (max-width: 640px) {
          .resonanceCinematic__sparkOrigin { width: 78vw; height: 18vw; }
        }
        .resonanceCinematic__bubbleLayer {
          position: fixed;
          inset: 0;
          z-index: 2147483000;
          pointer-events: none;
        }
        .resonanceCinematic__bubbleLayer .resonanceEvolution__energy {
          overflow: visible;
          transform-origin: 50% 50%; /* Same center as the beam contact. */
        }
        .resonanceCinematic__bubbleLayer--hpDrain .resonanceEvolution__energy {
          animation: resonanceCinematicImpactBubble 690ms ease-out both;
        }
        @keyframes resonanceCinematicImpactBubble {
          0% { opacity: .12; transform: scale(.015); }
          100% { opacity: .48; transform: scale(1); }
        }
        .resonanceCinematic .resonanceEvolution__energy {
          background: radial-gradient(circle at 38% 28%, color-mix(in srgb, var(--resonance-color) 30%, white) 0%, var(--resonance-color) 28%, color-mix(in srgb, var(--resonance-color) 48%, #18203a) 62%, color-mix(in srgb, var(--resonance-color) 22%, #171327) 83%, #102333 100%);
          border: 2px solid color-mix(in srgb, var(--resonance-accent) 45%, transparent);
          box-sizing: border-box;
          box-shadow: inset 0 0 26px color-mix(in srgb, var(--resonance-accent) 33%, transparent), inset 0 0 65px color-mix(in srgb, var(--resonance-color) 20%, transparent), 0 0 24px color-mix(in srgb, var(--resonance-color) 40%, transparent), 0 0 58px color-mix(in srgb, var(--resonance-color) 22%, transparent);
        }
        .resonanceCinematic .resonanceEvolution__energy::before,
        .resonanceCinematic .resonanceEvolution__shellArcs {
          display: none;
        }
        .resonanceCinematic .resonanceEvolution__energy::after {
          inset: 13%;
          background: radial-gradient(circle at 34% 24%, color-mix(in srgb, var(--resonance-accent) 45%, transparent), color-mix(in srgb, var(--resonance-color) 20%, transparent) 32%, color-mix(in srgb, var(--resonance-color) 27%, transparent) 75%);
          box-shadow: 0 0 32px color-mix(in srgb, var(--resonance-accent) 33%, transparent);
          opacity: 1;
          animation: none;
        }
        .resonanceCinematic__bubbleLayer--transformation .resonanceEvolution__energy {
          animation: resonanceCinematicBubble 1650ms linear both;
        }
        @keyframes resonanceCinematicBubble {
          0% { opacity: .48; transform: translate(0, 0); filter: brightness(1); }
          45% { opacity: 1; transform: translate(0, 0); filter: brightness(1); }
          55% { transform: translate(-3px, 2px); }
          63% { transform: translate(5px, -3px); }
          71% { transform: translate(-6px, 3px); }
          78% { transform: translate(6px, -4px); }
          85% { transform: translate(-8px, -3px); }
          91% { transform: translate(8px, 5px); }
          96% { transform: translate(-5px, 2px); }
          100% { opacity: 1; transform: translate(0, 0); filter: brightness(1.8) drop-shadow(0 0 28px var(--resonance-accent)); }
        }
        .resonanceCinematic .resonanceCinematic__bubbleLayer--reveal .resonanceEvolution__energy {
          background: none;
          border-color: transparent;
          box-shadow: none;
        }
        .resonanceCinematic .resonanceCinematic__bubbleLayer--reveal .resonanceEvolution__energy::after {
          inset: 0;
          background: radial-gradient(circle, var(--resonance-accent), var(--resonance-color) 55%, transparent 72%);
          animation: resonanceLightningClear 230ms ease-out both;
        }
        .resonanceCinematic__fragment {
          position: absolute;
          inset: -2px;
          border-radius: 50%;
          background: conic-gradient(from var(--turn), transparent 0deg 8deg, var(--resonance-accent) 13deg, color-mix(in srgb, var(--resonance-color) 60%, transparent) 24deg, transparent 42deg 360deg);
          mask-image: radial-gradient(ellipse, transparent 32%, #000 51%, #0008 61%, transparent 72%);
          mix-blend-mode: screen;
          animation: resonanceCinematicShatter 620ms cubic-bezier(.18,.65,.35,1) both;
        }
        @keyframes resonanceCinematicShatter {
          0% { opacity: 1; transform: translate(0, 0) rotate(0) scale(1); filter: blur(3px) brightness(1.8); }
          30% { opacity: .85; }
          100% { opacity: 0; transform: translate(var(--dx), var(--dy)) rotate(28deg) scale(1.3); filter: blur(12px) brightness(1); }
        }
        .resonanceCinematic__bubbleLayer--reduced .resonanceEvolution__energy { animation: resonanceSceneIn 350ms both; }
        .resonanceCinematic__bubbleLayer--reduced .resonanceCinematic__fragment { animation: resonanceLightningClear 620ms both; }
        .resonanceCinematic .resonanceEvolution--reduced.resonanceEvolution--reveal .resonanceEvolution__energy {
          animation-name: resonanceLightningClear;
        }
        .resonanceCinematic .resonanceEvolution--reduced.resonanceEvolution--transformation .resonanceEvolution__energy {
          animation-name: resonanceSceneIn;
        }
        @media (prefers-reduced-motion: reduce) {
          .resonanceCinematic__floorSparkles { display: none; }
          .resonanceCinematic__bubbleLayer .resonanceEvolution__energy { animation: resonanceSceneIn 350ms both; }
          .resonanceCinematic__fragment { animation: resonanceLightningClear 620ms both; }
          .resonanceCinematic .resonanceEvolution--transformation .resonanceEvolution__energy {
            animation-name: resonanceSceneIn;
          }
          .resonanceCinematic .resonanceEvolution--reveal .resonanceEvolution__energy {
            animation-name: resonanceLightningClear;
          }
        }
      `}</style>
      {phase === "elementReveal" && (
        <div className="resonanceCinematic__arrival">
          <ResonanceEvolutionOverlay request={visualRequest} phase="elementalBuild" displayedHp={displayedHp} reducedMotion={reducedMotion} />
        </div>
      )}
      <ResonanceEvolutionOverlay
        request={visualRequest}
        phase={phase === "fadeGameplay" || phase === "environment" || phase === "summon" ? "elementalBuild" : phase}
        displayedHp={displayedHp}
        reducedMotion={reducedMotion}
      />
      {!reducedMotion && phase !== "warningTransparent" && phase !== "warningRed" && phase !== "elementReveal" && (
        <div className={`resonanceCinematic__floorSparkles${phase === "complete" ? " resonanceCinematic__floorSparkles--complete" : ""}`} aria-hidden="true">
          <div className="resonanceEvolution__petStage">
            <div className="resonanceCinematic__sparkOrigin">
              {Array.from({ length: 24 }, (_, index) => {
                const sparkStyle: CSSProperties & Record<"--spark-x" | "--spark-y" | "--spark-size" | "--spark-duration" | "--spark-delay" | "--spark-drift" | "--spark-rise", string> = {
                  "--spark-x": `${8 + (index * 37) % 84}%`,
                  "--spark-y": `${30 + (index * 17) % 40}%`,
                  "--spark-size": `${4 + index % 4}px`,
                  "--spark-duration": `${1800 + (index % 5) * 210}ms`,
                  "--spark-delay": `${index * 75}ms`,
                  "--spark-drift": `${(index % 7 - 3) * 9}px`,
                  "--spark-rise": `min(${130 + (index % 6) * 25}px, 30vh)`,
                };
                return <span key={index} className="resonanceCinematic__floorSpark" style={sparkStyle} />;
              })}
            </div>
          </div>
        </div>
      )}
      {(phase === "hpDrain" || phase === "transformation" || phase === "reveal") && (
        <div className={`resonanceCinematic__bubbleLayer resonanceCinematic__bubbleLayer--${phase}${reducedMotion ? " resonanceCinematic__bubbleLayer--reduced" : ""}`} aria-hidden="true">
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
                  return <span key={index} className="resonanceCinematic__fragment" style={fragmentStyle} />;
                })}
              </div>
            </div>
          </div>
        </div>
      )}
  </div>;
}
