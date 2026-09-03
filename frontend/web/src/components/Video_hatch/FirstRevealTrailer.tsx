import { useEffect, useState } from "react";
import prismaticEgg from "@/kith/assets/eggs/eggs/prismatic_egg/prismatic_egg.png";
import { solenPortrait } from "@/kith/registry/starterPortraits";
import "./FirstRevealTrailer.css";

export const REVEAL_DURATION_MS = 20_000;

type PlaybackState = "idle" | "playing" | "finished";

const PARTICLES = Array.from({ length: 28 }, (_, index) => ({
  id: index,
  x: (index * 37) % 100,
  y: (index * 61) % 100,
  delay: (index % 9) * 0.19,
  size: 1 + (index % 3),
}));

export default function FirstRevealTrailer() {
  const [runKey, setRunKey] = useState(0);
  const [playback, setPlayback] = useState<PlaybackState>("idle");

  useEffect(() => {
    if (playback !== "playing") return;

    const finishTimer = window.setTimeout(
      () => setPlayback("finished"),
      REVEAL_DURATION_MS,
    );
    return () => window.clearTimeout(finishTimer);
  }, [playback, runKey]);

  const startTrailer = () => {
    setRunKey((key) => key + 1);
    setPlayback("playing");
  };

  return (
    <main className="reveal-workbench">
      <section
        className={`reveal-frame reveal-frame--${playback}`}
        key={runKey}
        aria-label="DeltaPets first reveal trailer"
      >
        <div className="reveal-grid" />
        <div className="reveal-signal">ALIUNE SIGNAL</div>

        <div className="reveal-delta" aria-hidden="true">
          <svg viewBox="0 0 100 100">
            <defs>
              <linearGradient id="reveal-rainbow" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#ff5577" />
                <stop offset=".23" stopColor="#ffd94d" />
                <stop offset=".48" stopColor="#62f6d0" />
                <stop offset=".7" stopColor="#4deaff" />
                <stop offset="1" stopColor="#b87aff" />
              </linearGradient>
            </defs>
            <polygon points="50,7 92,90 8,90" fill="none" stroke="url(#reveal-rainbow)" strokeWidth="7" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="reveal-chamber">
          <div className="reveal-chamber-stars" />
          <div className="reveal-chamber-ribs" />
          <div className="reveal-stage-glow" />
          <div className="reveal-stage-aura" aria-hidden="true" />
          <div className="reveal-rings" />
          <img className="reveal-egg" src={prismaticEgg} alt="Prismatic Egg" draggable={false} />
          <div className="reveal-flash" />
          <img className="reveal-kith" src={solenPortrait} alt="Solen hatchling" draggable={false} />
          <div className="reveal-bond"><span>BOND</span><i /></div>
        </div>

        <div className="reveal-shockwave" />
        <div className="reveal-particles" aria-hidden="true">
          {PARTICLES.map((particle) => (
            <i key={particle.id} style={{ "--x": `${particle.x}%`, "--y": `${particle.y}%`, "--delay": `${particle.delay}s`, "--size": `${particle.size}px` } as React.CSSProperties} />
          ))}
        </div>

        <div className="reveal-copy">
          <p className="reveal-pillars">RAISE <b>•</b> BATTLE <b>•</b> EVOLVE</p>
          <div className="reveal-logo" aria-label="DeltaPets">
            <span className="reveal-logo-mark" aria-hidden="true">△</span>
            <span className="reveal-logo-type">DeltaPets</span>
          </div>
          <p className="reveal-waiting">Your Kith is waiting.</p>
          <p className="reveal-alpha">Open Alpha Coming Soon</p>
        </div>
        <div className="reveal-island" aria-hidden="true" />
      </section>

      <button
        className="reveal-start"
        type="button"
        onClick={startTrailer}
        disabled={playback === "playing"}
      >
        {playback === "idle"
          ? "Start trailer"
          : playback === "playing"
            ? "Playing…"
            : "Start again"}
      </button>
    </main>
  );
}
