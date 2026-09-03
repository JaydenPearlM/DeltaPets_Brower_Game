import { useEffect, useRef, useState } from "react";
import prismaticEgg from "@/kith/assets/eggs/eggs/prismatic_egg/prismatic_egg.png";
import { solenPortrait } from "@/kith/registry/starterPortraits";
import "./FirstRevealTrailer.css";

export const REVEAL_DURATION_MS = 20_000;

type PlaybackState = "playing" | "paused" | "finished";

const PARTICLES = Array.from({ length: 28 }, (_, index) => ({
  id: index,
  x: (index * 37) % 100,
  y: (index * 61) % 100,
  delay: (index % 9) * 0.19,
  size: 1 + (index % 3),
}));

function playRevealAudio(): () => void {
  const AudioContextClass = window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextClass) return () => undefined;

  const context = new AudioContextClass();
  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, context.currentTime);
  master.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.5);
  master.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 20);
  master.connect(context.destination);

  const tone = (start: number, frequency: number, duration: number, gain: number) => {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, context.currentTime + start);
    envelope.gain.setValueAtTime(0.0001, context.currentTime + start);
    envelope.gain.exponentialRampToValueAtTime(gain, context.currentTime + start + 0.04);
    envelope.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + start + duration);
    oscillator.connect(envelope).connect(master);
    oscillator.start(context.currentTime + start);
    oscillator.stop(context.currentTime + start + duration + 0.05);
  };

  tone(0.5, 92, 3.2, 0.18);
  tone(2.0, 660, 0.24, 0.16);
  tone(4.2, 440, 1.1, 0.12);
  tone(5.0, 554, 1.4, 0.1);
  [9.2, 10.0, 10.7, 11.3, 11.8].forEach((start, index) =>
    tone(start, 82 + index * 7, 0.3, 0.09 + index * 0.018),
  );
  tone(12.25, 110, 1.0, 0.4);
  tone(12.28, 880, 0.8, 0.24);
  tone(13.0, 659, 1.2, 0.14);
  tone(16.1, 523, 3.2, 0.12);
  tone(16.35, 659, 3.0, 0.1);
  tone(16.6, 784, 2.8, 0.09);

  return () => void context.close();
}

export default function FirstRevealTrailer() {
  const [runKey, setRunKey] = useState(0);
  const [playback, setPlayback] = useState<PlaybackState>("playing");
  const [progress, setProgress] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const startedAtRef = useRef(performance.now());
  const elapsedRef = useRef(0);

  useEffect(() => {
    startedAtRef.current = performance.now();
    elapsedRef.current = 0;
    setProgress(0);
    setPlayback("playing");
  }, [runKey]);

  useEffect(() => {
    if (playback !== "playing") return;
    let frame = 0;
    const tick = (now: number) => {
      const elapsed = Math.min(
        REVEAL_DURATION_MS,
        elapsedRef.current + now - startedAtRef.current,
      );
      setProgress(elapsed / REVEAL_DURATION_MS);
      if (elapsed >= REVEAL_DURATION_MS) {
        elapsedRef.current = REVEAL_DURATION_MS;
        setPlayback("finished");
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playback, runKey]);

  useEffect(() => {
    if (!soundEnabled || playback !== "playing" || elapsedRef.current > 0) return;
    return playRevealAudio();
  }, [soundEnabled, playback, runKey]);

  const replay = () => setRunKey((key) => key + 1);
  const togglePlayback = () => {
    if (playback === "finished") {
      replay();
      return;
    }
    if (playback === "playing") {
      elapsedRef.current = progress * REVEAL_DURATION_MS;
      setPlayback("paused");
    } else {
      startedAtRef.current = performance.now();
      setPlayback("playing");
    }
  };

  return (
    <main className="reveal-workbench">
      <section
        className={`reveal-frame reveal-frame--${playback}`}
        key={runKey}
        aria-label="DeltaPets first reveal trailer"
      >
        <div className="reveal-grid" />
        <div className="reveal-corruption" aria-hidden="true">0110&nbsp; DELTA://UNKNOWN &nbsp;001</div>
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
          <div className="reveal-rings" />
          <img className="reveal-egg" src={prismaticEgg} alt="Prismatic Egg" draggable={false} />
          <div className="reveal-cracks" />
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

      <div className="reveal-controls" aria-label="Trailer playback controls">
        <button type="button" onClick={togglePlayback}>{playback === "playing" ? "Pause" : playback === "finished" ? "Play again" : "Resume"}</button>
        <button type="button" onClick={replay}>Replay from start</button>
        <button type="button" aria-pressed={soundEnabled} onClick={() => setSoundEnabled((enabled) => !enabled)}>{soundEnabled ? "Sound on" : "Sound off"}</button>
        <div className="reveal-progress"><i style={{ width: `${progress * 100}%` }} /></div>
        <output>{(progress * 20).toFixed(1)} / 20.0s</output>
      </div>
    </main>
  );
}
