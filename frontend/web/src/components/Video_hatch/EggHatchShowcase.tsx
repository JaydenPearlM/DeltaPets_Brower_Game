import { useEffect, useRef, useState } from "react";
import prismaticEgg from "@/kith/assets/eggs/eggs/prismatic_egg/prismatic_egg.png";
import cribiHatchling from "@/kith/assets/startepets/hatchling_cribi.png";
import "./EggHatchShowcase.css";

/**
 * EggHatchShowcase
 * --------------------------------------------------------------
 * TEMPORARY recording scene for a TikTok clip. Not part of the
 * production hatch flow — does not touch egg/hatch game logic,
 * the global button system, or the locked blue grid panel system.
 *
 * Built the same way as pages/cutscene/create.tsx and
 * rescueEggReveal.tsx: a named TIMING table, a requestAnimationFrame
 * tween() helper, and named easing curves (easeOutCubic /
 * easeInCubic / easeInOutCubic), run as a sequential async
 * timeline. CSS keyframes alone made the hatch beat hard to
 * synchronize (Cribi's pop and the egg's disappearance need to
 * happen in lockstep) — a scripted timeline makes that trivial: the
 * egg-fade and Cribi's backward recede are literally the same
 * tween() call.
 *
 * The care room is a scoped, sized-down copy of the exact shape
 * used on /pet (PetDetailsPanel's petRepoSceneOrb): same
 * width/height ratio, same 180px-style corner radius (scaled),
 * same ceiling/wall/floor clip-paths, same star field coordinates,
 * plus a Bond ring + meter echoing petRepoSceneRing--bond /
 * petRepoBondPanel. It's hand-copied into this file's own CSS, not
 * an import of the real one, so this stays isolated from
 * production pet-page state (--bond/--energy, element theming).
 *
 * Replay remounts the whole tree via `playKey`, which re-runs this
 * effect from a clean DOM — no manual state reset needed.
 */

const TIMING = {
  introFadeInMs: 650,
  introHoldMs: 1500, // hold the intro line on screen longer before it fades out
  introFadeOutMs: 450,

  eggFadeInMs: 750,

  floatCycleMs: 3400, // one full slow up/down cycle
  floatCycles: 2,

  embedFloatHoldMs: 60000, // homepage: repeat the normal float for about 1 minute before hatching

  anticipationMs: 160,
  shakeGentleMs: 480,
  shakeHardMs: 560,

  flashMs: 500,

  cribiForwardMs: 460, // Cribi pops toward the viewer
  cribiBackMs: 640, // Cribi recedes back to rest — the egg fades away across this exact window
  cribiSettleMs: 260, // tiny follow-through wobble once he's back

  bondRevealMs: 900,

  captionEachMs: 500,
  captionGapMs: 220,

  holdMs: 1600,
  embedHoldMs: 1100, // shorter hold before the embed variant loops itself
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t: number) => t * t * t;
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutBack = (t: number) => {
  const c1 = 1.7,
    c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
// Gentle, physical sine curve — smoother turnarounds than cubic, which is
// what makes a slow float (constant direction reversal) read as "wonky."
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

type AliveCheck = () => boolean;

function tween(
  durationMs: number,
  onUpdate: (eased: number, raw: number) => void,
  alive: AliveCheck,
  ease: (t: number) => number = (t) => t,
) {
  return new Promise<void>((resolve) => {
    const start = performance.now();
    function step(now: number) {
      if (!alive()) {
        resolve();
        return;
      }
      const raw = Math.min(1, (now - start) / durationMs);
      onUpdate(ease(raw), raw);
      if (raw >= 1) {
        resolve();
        return;
      }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

type EggHatchShowcaseProps = {
  /**
   * "standalone" (default): the original full-page /showcase recording
   * scene — phone-frame chrome, intro line, captions, Replay button,
   * plays once and holds.
   * "embed": compact, chrome-less version for dropping into real UI (the
   * Homepage hero card). No intro line, no caption stack, no Replay
   * button — it loops on its own.
   */
  variant?: "standalone" | "embed";
};

export default function EggHatchShowcase({
  variant = "standalone",
}: EggHatchShowcaseProps) {
  const embed = variant === "embed";
  const [playKey, setPlayKey] = useState(0);

  const introRef = useRef<HTMLParagraphElement | null>(null);
  const bondLabelRef = useRef<HTMLDivElement | null>(null);
  const bondFillRef = useRef<HTMLSpanElement | null>(null);
  const roomRef = useRef<HTMLDivElement | null>(null);
  const eggGlowRef = useRef<HTMLDivElement | null>(null);
  const eggRef = useRef<HTMLImageElement | null>(null);
  const flashRef = useRef<HTMLDivElement | null>(null);
  const kithRef = useRef<HTMLImageElement | null>(null);
  const bgBrightenRef = useRef<HTMLDivElement | null>(null);
  const burstRefs = useRef<Array<HTMLDivElement | null>>([]);
  const taglineRef = useRef<HTMLParagraphElement | null>(null);
  const titleRef = useRef<HTMLParagraphElement | null>(null);
  const subtitleRef = useRef<HTMLDivElement | null>(null);

  const runIdRef = useRef(0);

  useEffect(() => {
    const myRunId = ++runIdRef.current;
    const alive: AliveCheck = () => runIdRef.current === myRunId;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const egg = { opacity: 0, x: 0, y: 14, rot: 0, scaleX: 0.85, scaleY: 0.85 };
    function paintEgg() {
      const el = eggRef.current;
      if (!el) return;
      el.style.opacity = String(egg.opacity);
      el.style.transform = `translate(${egg.x}px, ${egg.y}px) rotate(${egg.rot}deg) scale(${egg.scaleX}, ${egg.scaleY})`;
    }
    // Shake/anticipation should rock from the egg's bottom (like it's
    // rocking on the ground); every other scene scales/moves from center.
    function setEggPivot(bottom: boolean) {
      const el = eggRef.current;
      if (!el) return;
      el.style.transformOrigin = bottom ? "50% 100%" : "50% 50%";
    }

    const kith = { opacity: 0, y: 8, scale: 0.55 };
    function paintKith() {
      const el = kithRef.current;
      if (!el) return;
      el.style.opacity = String(kith.opacity);
      el.style.transform = `translateY(${kith.y}px) scale(${kith.scale})`;
    }

    function paintRoom(scale: number) {
      const el = roomRef.current;
      if (!el) return;
      el.style.transform = `scale(${scale})`;
    }

    function fadeEl(
      el: HTMLElement | null,
      from: number,
      to: number,
      raw: number,
    ) {
      if (!el) return;
      el.style.opacity = String(lerp(from, to, raw));
    }

    async function playOnce() {
      if (!alive()) return;

      // ---------- Reset every animated element up front ----------
      // Defensive: guarantees Replay always starts from the true hidden
      // state, even if a prior run's inline styles are still sitting on
      // these nodes (e.g. Kith should never be visible this early).
      egg.opacity = 0;
      egg.x = 0;
      egg.y = 14;
      egg.rot = 0;
      egg.scaleX = 0.85;
      egg.scaleY = 0.85;
      setEggPivot(false);
      paintEgg();
      kith.opacity = 0;
      kith.y = 8;
      kith.scale = 0.55;
      paintKith();
      if (eggGlowRef.current) eggGlowRef.current.style.opacity = "0";
      if (flashRef.current) flashRef.current.style.opacity = "0";
      if (bgBrightenRef.current) bgBrightenRef.current.style.opacity = "0";
      if (bondLabelRef.current) bondLabelRef.current.style.opacity = "0";
      if (bondFillRef.current) bondFillRef.current.style.width = "0%";
      paintRoom(1);
      if (introRef.current) introRef.current.style.opacity = "0";
      [taglineRef, titleRef, subtitleRef].forEach((ref) => {
        if (!ref.current) return;
        ref.current.style.opacity = "0";
        ref.current.style.transform = "translateY(10px)";
      });
      burstRefs.current.forEach((el) => {
        if (!el) return;
        el.style.animation = "none";
      });
      if (!alive()) return;

      // ---------- Scene 1: intro line (standalone recording only) ----------
      if (!embed) {
        await tween(
          reduce ? 120 : TIMING.introFadeInMs,
          (e) => fadeEl(introRef.current, 0, 1, e),
          alive,
          easeOutCubic,
        );
        if (!alive()) return;
        await sleep(TIMING.introHoldMs);
        if (!alive()) return;
        await tween(
          TIMING.introFadeOutMs,
          (e) => fadeEl(introRef.current, 1, 0, e),
          alive,
          easeInCubic,
        );
        if (!alive()) return;
      }

      // ---------- Scene 2: egg fades in ----------
      egg.opacity = 0;
      egg.scaleX = 0.85;
      egg.scaleY = 0.85;
      egg.y = 14;
      paintEgg();
      if (eggGlowRef.current) eggGlowRef.current.style.opacity = "0";

      await tween(
        reduce ? 150 : TIMING.eggFadeInMs,
        (e) => {
          egg.opacity = e;
          egg.scaleX = lerp(0.85, 1, e);
          egg.scaleY = lerp(0.85, 1, e);
          egg.y = lerp(14, 0, e);
          paintEgg();
          if (eggGlowRef.current)
            eggGlowRef.current.style.opacity = String(0.55 * e);
        },
        alive,
        easeOutCubic,
      );
      if (!alive()) return;

      // ---------- Scene 2b: egg floats before the hatch sequence ----------
      // Keep the original float speed and motion exactly as designed.
      // On the Homepage embed, repeat complete float cycles for roughly
      // one minute before continuing into the existing hatch animation.
      // Standalone keeps its original two float cycles.
      if (!reduce) {
        const floatCycle = async () => {
          await tween(
            TIMING.floatCycleMs / 2,
            (e) => {
              egg.x = 0;
              egg.y = lerp(0, 12, e);
              paintEgg();
            },
            alive,
            easeInOutSine,
          );
          if (!alive()) return;

          await tween(
            TIMING.floatCycleMs / 2,
            (e) => {
              egg.x = 0;
              egg.y = lerp(12, 0, e);
              paintEgg();
            },
            alive,
            easeInOutSine,
          );
        };

        if (embed) {
          const floatStart = performance.now();

          while (
            alive() &&
            performance.now() - floatStart < TIMING.embedFloatHoldMs
          ) {
            await floatCycle();
            if (!alive()) return;
          }
        } else {
          for (let i = 0; i < TIMING.floatCycles && alive(); i++) {
            await floatCycle();
            if (!alive()) return;
          }
        }
      }

      // ---------- Scene 3: anticipation -> shake -> shake harder ----------
      // Pivot from the bottom for this whole scene: the egg rocks in place
      // like it's resting on the ground, base fixed, top tips side to side.
      setEggPivot(true);
      await tween(
        TIMING.anticipationMs,
        (e) => {
          egg.scaleX = lerp(1, 1.05, e);
          egg.scaleY = lerp(1, 0.92, e);
          paintEgg();
        },
        alive,
        easeInCubic,
      );
      if (!alive()) return;

      await tween(
        TIMING.shakeGentleMs,
        (_e, raw) => {
          const s = Math.sin(raw * Math.PI * 3); // 3 full swings, returns to 0
          egg.rot = s * 6; // top rocks side to side, base stays put
          egg.scaleX = lerp(1.05, 1, raw);
          egg.scaleY = lerp(0.92, 1, raw);
          paintEgg();
        },
        alive,
        (t) => t,
      );
      if (!alive()) return;

      await tween(
        TIMING.shakeHardMs,
        (_e, raw) => {
          const s = Math.sin(raw * Math.PI * 4); // 4 harder swings, returns to 0
          egg.rot = s * 18; // shakes harder, still pivoting from the base
          paintEgg();
        },
        alive,
        (t) => t,
      );
      if (!alive()) return;
      egg.rot = 0;
      paintEgg();
      // Back to center pivot for the disappear/grow-away beat below.
      setEggPivot(false);

      // ---------- Scene 4: flash, Cribi pushes forward, then back — ----------
      // the egg's disappearing animation plays in that exact backward window.
      if (flashRef.current) flashRef.current.style.opacity = "0";
      tween(
        TIMING.flashMs,
        (_e, raw) => {
          const v = raw < 0.3 ? raw / 0.3 : Math.max(0, 1 - (raw - 0.3) / 0.7);
          if (flashRef.current) flashRef.current.style.opacity = String(v);
        },
        alive,
      );

      if (bgBrightenRef.current) bgBrightenRef.current.style.opacity = "0";
      tween(
        TIMING.flashMs + TIMING.cribiForwardMs,
        (_e, raw) => {
          const v = raw < 0.4 ? raw / 0.4 : Math.max(0, 1 - (raw - 0.4) / 0.6);
          if (bgBrightenRef.current)
            bgBrightenRef.current.style.opacity = String(v * 0.55);
        },
        alive,
      );

      // Sparks + light heading toward the viewer, timed to finish well
      // before the follow-through settle below.
      burstRefs.current.forEach((el, i) => {
        if (!el) return;
        el.style.animation = "none";
        void el.offsetWidth;
        el.style.animation = `showcaseBurst${(i % 4) + 1} 650ms ease-out ${i * 60}ms both`;
      });

      kith.opacity = 0;
      kith.scale = 0.55;
      kith.y = 8;
      paintKith();

      // Cribi comes forward, toward the viewer
      await tween(
        TIMING.cribiForwardMs,
        (e) => {
          kith.opacity = Math.min(1, e * 1.4);
          kith.scale = lerp(0.55, 1.28, e);
          kith.y = lerp(8, -8, e);
          paintKith();
          if (roomRef.current) paintRoom(lerp(1, 1.035, e));
        },
        alive,
        easeOutCubic,
      );
      if (!alive()) return;

      // ...then goes backward. This is what makes the egg go away —
      // one tween drives both.
      await tween(
        TIMING.cribiBackMs,
        (e) => {
          kith.scale = lerp(1.28, 1, e);
          kith.y = lerp(-8, 0, e);
          paintKith();
          if (roomRef.current) paintRoom(lerp(1.035, 1, e));

          egg.opacity = lerp(1, 0, e);
          egg.scaleX = lerp(1, 1.05, e);
          egg.scaleY = lerp(1, 1.4, e);
          egg.y = lerp(0, -18, e);
          paintEgg();
        },
        alive,
        easeInOutCubic,
      );
      if (!alive()) return;

      // small follow-through settle
      await tween(
        TIMING.cribiSettleMs,
        (_e, raw) => {
          const overshoot = Math.sin(raw * Math.PI) * 0.03;
          kith.scale = 1 + overshoot;
          paintKith();
        },
        alive,
        easeOutCubic,
      );
      if (!alive()) return;
      kith.scale = 1;
      kith.y = 0;
      paintKith();

      // ---------- Ending: Cribi floats gently for the rest of the clip ----------
      // Standalone only — fire-and-forget, keeps drifting through the
      // captions and final hold. The embed variant loops the whole scene
      // on its own instead, so this would just fight the next playOnce().
      if (!embed) {
        (async () => {
          const kithFloatAmp = 6;
          while (alive()) {
            await tween(
              1400,
              (e) => {
                kith.y = lerp(0, -kithFloatAmp, e);
                paintKith();
              },
              alive,
              easeInOutSine,
            );
            if (!alive()) return;
            await tween(
              1400,
              (e) => {
                kith.y = lerp(-kithFloatAmp, 0, e);
                paintKith();
              },
              alive,
              easeInOutSine,
            );
          }
        })();
      }

      // ---------- Bond meter + ring ----------
      if (bondLabelRef.current) bondLabelRef.current.style.opacity = "0";
      await tween(
        350,
        (e) => fadeEl(bondLabelRef.current, 0, 1, e),
        alive,
        easeOutCubic,
      );
      tween(
        TIMING.bondRevealMs,
        (e) => {
          if (bondFillRef.current)
            bondFillRef.current.style.width = `${lerp(0, 78, e)}%`;
        },
        alive,
        easeOutCubic,
      );
      if (!alive()) return;

      // ---------- Captions (standalone recording only) ----------
      if (!embed) {
        await tween(
          TIMING.captionEachMs,
          (e) => {
            fadeEl(taglineRef.current, 0, 1, e);
            if (taglineRef.current)
              taglineRef.current.style.transform = `translateY(${lerp(10, 0, e)}px)`;
          },
          alive,
          easeOutCubic,
        );
        if (!alive()) return;
        await sleep(TIMING.captionGapMs);
        if (!alive()) return;

        await tween(
          TIMING.captionEachMs,
          (e) => {
            fadeEl(titleRef.current, 0, 1, e);
            if (titleRef.current)
              titleRef.current.style.transform = `translateY(${lerp(12, 0, e)}px) scale(${lerp(0.85, 1, e)})`;
          },
          alive,
          easeOutBack,
        );
        if (!alive()) return;
        await sleep(TIMING.captionGapMs);
        if (!alive()) return;

        await tween(
          TIMING.captionEachMs,
          (e) => {
            fadeEl(subtitleRef.current, 0, 1, e);
            if (subtitleRef.current)
              subtitleRef.current.style.transform = `translateY(${lerp(10, 0, e)}px)`;
          },
          alive,
          easeOutCubic,
        );
        if (!alive()) return;
      }

      await sleep(embed ? TIMING.embedHoldMs : TIMING.holdMs);
      // standalone: holds here — Replay restarts the whole timeline
      // embed: run() below loops straight back into another playOnce()
    }

    async function run() {
      if (embed) {
        while (alive()) {
          await playOnce();
        }
      } else {
        await playOnce();
      }
    }

    run();

    return () => {
      if (runIdRef.current === myRunId) runIdRef.current++;
    };
  }, [playKey, embed]);

  const bondMeter = (
    <div className="showcase-bond-label" ref={bondLabelRef}>
      <span className="showcase-bond-label-text">Bond</span>
      <span className="showcase-bond-label-track">
        <span className="showcase-bond-label-fill" ref={bondFillRef} />
      </span>
    </div>
  );

  const archRoom = (
    <div className="showcase-arch-room" ref={roomRef}>
      <div className="showcase-arch-ceiling" />
      <div className="showcase-arch-wall showcase-arch-wall--left" />
      <div className="showcase-arch-wall showcase-arch-wall--right" />
      <div className="showcase-arch-stars" />

      <div className="showcase-egg-stage">
        <div className="showcase-egg-glow" ref={eggGlowRef} />
        <div className="showcase-sparkle showcase-sparkle--a" />
        <div className="showcase-sparkle showcase-sparkle--b" />
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`showcase-sparkle showcase-sparkle--burst${i + 1}`}
            ref={(el) => {
              burstRefs.current[i] = el;
            }}
          />
        ))}
        <img
          className="showcase-egg"
          ref={eggRef}
          src={prismaticEgg}
          alt="DeltaPets egg"
          draggable={false}
        />
        <div className="showcase-flash" ref={flashRef} />
        <img
          className="showcase-kith"
          ref={kithRef}
          src={cribiHatchling}
          alt="DeltaPets Kith"
          draggable={false}
        />
      </div>

      <div className="showcase-arch-floor" />
    </div>
  );

  if (embed) {
    // Compact, chrome-less loop for dropping into real UI (Homepage hero).
    // Scaled uniformly from the same fixed-px design the standalone scene
    // uses, so the /pet-accurate arch shape never has to be re-tuned.

    return (
      <div className="showcase-embed-box" key={playKey}>
        <div className="showcase-embed-scale">
          <div className="showcase-bg" />
          <div className="showcase-bg-brighten" ref={bgBrightenRef} />
          {bondMeter}
          {archRoom}
        </div>
      </div>
    );
  }

  return (
    <div className="showcase-page">
      <div className="showcase-record-frame" key={playKey}>
        <div className="showcase-bg" />
        <div className="showcase-bg-brighten" ref={bgBrightenRef} />

        <p className="showcase-intro-text" ref={introRef}>
          I&rsquo;ve been building a browser pet game.
        </p>

        {bondMeter}
        {archRoom}

        <div className="showcase-alphaLine" ref={subtitleRef}>
          <p className="showcase-subtitle">Open Alpha coming soon</p>
          <p className="showcase-copyright">
            &copy; 2026 Jayden. All rights reserved.
          </p>
        </div>

        <div className="showcase-caption-stack">
          <p className="showcase-tagline" ref={taglineRef}>
            Raise &bull; Battle &bull; Evolve
          </p>
          <p className="showcase-title" ref={titleRef}>
            DeltaPets
          </p>
        </div>
      </div>

      <button
        type="button"
        className="showcase-replay-btn"
        onClick={() => setPlayKey((key) => key + 1)}
      >
        Replay
      </button>
    </div>
  );
}
