import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../lib/api/baseClient";

/**
 * DeltaPets intro cutscene  (v2)
 * --------------------------------------------------------------
 * Beats:
 *   1. Black fade in
 *   2. Aliune Signal rockets up from below, grows in perspective, impacts,
 *      then settles above the egg and blinks red
 *   3. Man talks via glitch text (label still blinking red)
 *   4. Lore line, triangle falls in
 *   5. Triangle morphs into wireframe egg -> label cross-fades to cyan, stops blinking
 *   6. Egg shockwave, solid rainbow egg
 *   7. Goodluck text -> fade to hatchery
 */

/* =========================================================
   TIMING
========================================================= */
const TIMING = {
  fadeInMs: 700,

  glitch1RevealMs: 3200,
  glitch1HoldMs: 2800,
  glitch2RevealMs: 3600,
  glitch2HoldMs: 3000,

  loreTypeMsPerChar: 52,
  loreDeleteMsPerChar: 30,

  gridFadeInMs: 1300,

  triangleDrawMs: 1400,
  trianglePulseMs: 900,
  morphMs: 1900,

  shockEggFlashMs: 320,
  shockMs: 2200,
  solidMs: 1500,

  typeGoodluckMsPerChar: 62,
  holdMs: 3800,
  fadeOutMs: 2000,
};

/* =========================================================
   COPY
========================================================= */
const GLITCH_1 = `...Wait... Who... are you?`;
const GLITCH_2 = `You should not be here. This is confidential to the real world! But... the signal...`;
const LORE_1 = `This signal is buried beneath corrupted data..... What's happening? There's something coming through.`;
const WIRE_LINE = `That... that is impossible. A Prismatic Egg...? The signal chose you. Take care of it.`;

/* =========================================================
   LOOK
========================================================= */
const C = {
  bg: "#02040a",
  gridGreen: [70, 255, 170] as const,
  text: "rgba(225,248,255,0.95)",
};

const EGG = {
  H: 305,
  R: 118,
  latTilt: 0.22,
  meridians: [-1, -0.66, -0.33, 0, 0.33, 0.66, 1],
  latitudes: [0.14, 0.32, 0.5, 0.68, 0.86],
  triSize: 165,
};
const GRIDCFG = {
  spacing: 56,
  bandWidth: 90,
  push: 120,
  clearBand: 200,
  lineWidth: 1.25,
};

const GLITCH_CHARS = "!<>-_/[]{}=+*?#ΔΞΛ█▓▒░01";

/* =========================================================
   helpers
========================================================= */
type Point = [number, number];
type AliveCheck = () => boolean;
type TextSetter = Dispatch<SetStateAction<string>>;
type TimelinePhase =
  | "fadeInBlack"
  | "gridFadeIn"
  | "glitchBoot"
  | "lore"
  | "triangle"
  | "morph"
  | "wireHold"
  | "shock"
  | "goodluck"
  | "hold"
  | "fadeOut"
  | "done";
type VisualState = {
  gridAlpha: number;
  introPulse: number;
  shock: number;
  triProg: number;
  triDropY: number;
  triSquash: number;
  morphProg: number;
  wireAlpha: number;
  solidProg: number;
  eggScale: number;
  eggGlow: number;
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t: number) => t * t * t;
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

async function deleteText(
  current: string,
  set: TextSetter,
  msPerChar: number,
  alive: AliveCheck,
) {
  for (let i = current.length; i >= 0; i--) {
    if (!alive()) return;
    set(current.slice(0, i));
    await sleep(msPerChar);
  }
}

function glitchReveal(
  target: string,
  set: TextSetter,
  totalMs: number,
  alive: AliveCheck,
) {
  const start = performance.now();
  return new Promise<void>((resolve) => {
    function frame(now: number) {
      if (!alive()) {
        resolve();
        return;
      }
      const p = Math.min(1, (now - start) / totalMs);
      const locked = Math.floor(p * target.length);
      let out = "";
      for (let i = 0; i < target.length; i++) {
        const ch = target[i];
        if (ch === " ") {
          out += " ";
        } else if (i < locked) {
          out += ch;
        } else {
          out += GLITCH_CHARS[(Math.random() * GLITCH_CHARS.length) | 0];
        }
      }
      set(out);
      if (p >= 1) {
        set(target);
        resolve();
        return;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}

function tween(
  durationMs: number,
  onUpdate: (eased: number, raw: number) => void,
  alive: AliveCheck,
  ease: (t: number) => number = (t: number) => t,
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

function resampleClosed(pts: Point[], N: number) {
  const segLen: number[] = [];
  let total = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segLen.push(d);
    total += d;
  }
  const out: Point[] = [];
  const step = total / N;
  let seg = 0;
  let segStart = 0;
  for (let k = 0; k < N; k++) {
    const target = k * step;
    while (seg < pts.length - 1 && segStart + segLen[seg] < target) {
      segStart += segLen[seg];
      seg++;
    }
    const a = pts[seg];
    const b = pts[(seg + 1) % pts.length];
    const t = segLen[seg] > 0 ? (target - segStart) / segLen[seg] : 0;
    out.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t)]);
  }
  return out;
}

/* =========================================================
   component
========================================================= */

export default function CreatePage() {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const crackRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playerName, setPlayerName] = useState("Traveler");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await apiFetch<{
          profile?: {
            display_name?: string | null;
            username?: string | null;
          } | null;
        }>("/api/me");
        const name = me?.profile?.display_name || me?.profile?.username;
        if (!cancelled && name) setPlayerName(name);
      } catch {
        // keep "Traveler" fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [phase, setPhase] = useState<TimelinePhase>("fadeInBlack");
  const [centerText, setCenterText] = useState("");
  const [glitching, setGlitching] = useState(false);

  const visualRef = useRef<VisualState>({
    gridAlpha: 0,
    introPulse: 0,
    shock: -1,
    triProg: 0,
    triDropY: 0,
    triSquash: 0,
    morphProg: 0,
    wireAlpha: 0,
    solidProg: 0,
    eggScale: 1,
    eggGlow: 0,
  });

  const runIdRef = useRef(0);
  const [replayKey] = useState(0);

  /*
    The label stays mounted for the entire cutscene and is driven imperatively.
    Its entrance animation is awaited so dialogue cannot begin early.
  */
  const labelRef = useRef<HTMLDivElement | null>(null);

  async function labelSlam(reduceMotion: boolean) {
    const el = labelRef.current;
    if (!el) return;

    el.getAnimations().forEach((animation) => animation.cancel());
    el.className = "dpc-syslabel";
    el.style.opacity = "0";
    el.style.color = "rgba(255,70,90,0.95)";
    el.style.textShadow = "none";

    if (reduceMotion) {
      const entrance = el.animate(
        [
          {
            top: "calc(50% - 212px)",
            transform: "translateX(-50%) scale(0.8)",
            opacity: 0,
          },
          {
            top: "calc(50% - 212px)",
            transform: "translateX(-50%) scale(1)",
            opacity: 1,
          },
        ],
        {
          duration: 260,
          easing: "ease-out",
          fill: "forwards",
        },
      );

      await new Promise<void>((resolve) => {
        entrance.onfinish = () => resolve();
        entrance.oncancel = () => resolve();
      });

      el.style.opacity = "1";
      el.style.color = "";
      el.style.textShadow = "";
      el.className = "dpc-syslabel dpc-syslabel--red";
      return;
    }

    const impact = el.animate(
      [
        {
          top: "calc(50% - 212px)",
          transform:
            "translateX(-50%) translate(-52px, 46px) perspective(900px) translateZ(-1150px) scale(0.035)",
          opacity: 0,
        },
        {
          offset: 0.2,
          top: "calc(50% - 212px)",
          transform:
            "translateX(-50%) translate(-84px, 72px) perspective(900px) translateZ(-980px) scale(0.07)",
          opacity: 0.18,
        },
        {
          offset: 0.42,
          top: "calc(50% - 212px)",
          transform:
            "translateX(-50%) translate(-46px, -38px) perspective(900px) translateZ(-620px) scale(0.22)",
          opacity: 0.48,
        },
        {
          offset: 0.66,
          top: "calc(50% - 212px)",
          transform:
            "translateX(-50%) translate(24px, -62px) perspective(900px) translateZ(-280px) scale(0.72)",
          opacity: 0.82,
        },
        {
          offset: 0.86,
          top: "calc(50% - 212px)",
          transform:
            "translateX(-50%) translate(12px, -26px) perspective(900px) translateZ(-80px) scale(1.55)",
          opacity: 1,
        },
        {
          top: "calc(50% - 212px)",
          transform:
            "translateX(-50%) translate(0, 0) perspective(900px) translateZ(0) scale(4.2)",
          opacity: 1,
        },
      ],
      {
        duration: 1600,
        easing: "cubic-bezier(0.58, 0.02, 0.72, 0.18)",
        fill: "forwards",
      },
    );

    await new Promise<void>((resolve) => {
      impact.onfinish = () => resolve();
      impact.oncancel = () => resolve();
    });

    await sleep(10);

    if (crackRef.current) {
      crackRef.current.className = "dpc-impact-crack active";
    }

    const shake = rootRef.current?.animate(
      [
        { transform: "translate(0, 0)" },
        { transform: "translate(-10px, 6px)" },
        { transform: "translate(9px, -5px)" },
        { transform: "translate(-6px, 3px)" },
        { transform: "translate(0, 0)" },
      ],
      {
        duration: 70,
        easing: "linear",
      },
    );

    if (shake) {
      await new Promise<void>((resolve) => {
        shake.onfinish = () => resolve();
        shake.oncancel = () => resolve();
      });
    }

    el.style.opacity = "1";
    el.style.color = "rgba(255,70,90,0.95)";
    el.style.textShadow = "none";
    el.className = "dpc-syslabel";

    const wobble = el.animate(
      [
        {
          transform: "translateX(-50%) translate(0, 0) scale(4.2) rotate(0deg)",
        },
        {
          offset: 0.25,
          transform:
            "translateX(-50%) translate(-5px, 2px) scale(4.12) rotate(-1.4deg)",
        },
        {
          offset: 0.5,
          transform:
            "translateX(-50%) translate(4px, -2px) scale(4.24) rotate(1.1deg)",
        },
        {
          offset: 0.75,
          transform:
            "translateX(-50%) translate(-2px, 1px) scale(4.16) rotate(-0.6deg)",
        },
        {
          transform: "translateX(-50%) translate(0, 0) scale(4.2) rotate(0deg)",
        },
      ],
      {
        duration: 360,
        easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
        fill: "forwards",
      },
    );

    await new Promise<void>((resolve) => {
      wobble.onfinish = () => resolve();
      wobble.oncancel = () => resolve();
    });

    await sleep(480);

    if (crackRef.current) {
      crackRef.current.className = "dpc-impact-crack fading";
    }

    const settle = el.animate(
      [
        {
          top: "calc(50% - 212px)",
          transform: "translateX(-50%) translate(0, 0) scale(4.2)",
        },
        {
          offset: 0.4,
          top: "calc(50% - 212px)",
          transform: "translateX(-50%) translate(34px, 58px) scale(2.45)",
        },
        {
          offset: 0.74,
          top: "calc(50% - 212px)",
          transform: "translateX(-50%) translate(14px, 30px) scale(1.45)",
        },
        {
          top: "calc(50% - 212px)",
          transform: "translateX(-50%) translate(0, 0) scale(1)",
        },
      ],
      {
        duration: 2050,
        easing: "cubic-bezier(0.45, 0, 0.2, 1)",
        fill: "forwards",
      },
    );

    await new Promise<void>((resolve) => {
      settle.onfinish = () => resolve();
      settle.oncancel = () => resolve();
    });

    if (crackRef.current) {
      crackRef.current.className = "dpc-impact-crack";
    }

    el.style.color = "";
    el.className = "dpc-syslabel dpc-syslabel--red";
  }

  function startMorphColorTransition(durationMs: number) {
    const el = labelRef.current;
    if (!el) return;

    el.className = "dpc-syslabel";

    const colorTransition = el.animate(
      [
        {
          color: "rgba(255,70,90,0.95)",
          textShadow: "none",
        },
        {
          color: "rgba(120,230,255,0.8)",
          textShadow: "0 0 14px rgba(120,230,255,0.5)",
        },
      ],
      {
        duration: durationMs,
        easing: "ease-in-out",
        fill: "forwards",
      },
    );

    colorTransition.onfinish = () => {
      el.className = "dpc-syslabel dpc-syslabel--cyan";
    };
  }

  /* ---------------- canvas: grid + triangle + egg ---------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const canvasEl = canvas;
    const renderCtx = ctx;

    let raf = 0;
    let alive = true;
    let w = 0;
    let h = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvasEl.clientWidth;
      h = canvasEl.clientHeight;
      canvasEl.width = Math.floor(w * dpr);
      canvasEl.height = Math.floor(h * dpr);
      renderCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    const rgba = (c: readonly number[], a: number) =>
      `rgba(${c[0]},${c[1]},${c[2]},${a})`;

    function halfW(t: number, scale: number) {
      const y = t * 2 - 1;
      const base = Math.sqrt(Math.max(0, 1 - y * y));
      return EGG.R * scale * base * (1 + 0.3 * y);
    }
    function yAt(t: number, cy: number, scale: number) {
      return cy + (t - 0.5) * EGG.H * scale;
    }
    function eggOutlineRaw(cx: number, cy: number, scale: number) {
      const raw: Point[] = [];
      const M = 80;
      for (let i = 0; i <= M; i++) {
        const t = i / M;
        raw.push([cx + halfW(t, scale), yAt(t, cy, scale)]);
      }
      for (let i = 0; i <= M; i++) {
        const t = 1 - i / M;
        raw.push([cx - halfW(t, scale), yAt(t, cy, scale)]);
      }
      return raw;
    }
    function triOutlineRaw(
      cx: number,
      cy: number,
      scale: number,
      sizeMul: number,
      squashX = 1,
      squashY = 1,
    ) {
      const s = EGG.triSize * scale * sizeMul;
      const apex: Point = [cx, cy - s * 0.62 * squashY];
      const br: Point = [cx + s * 0.95 * squashX, cy + s * 0.46 * squashY];
      const bl: Point = [cx - s * 0.95 * squashX, cy + s * 0.46 * squashY];
      const verts: Point[] = [apex, br, bl];
      const dense: Point[] = [];
      const STEPS = 28;
      for (let v = 0; v < verts.length; v++) {
        const a = verts[v];
        const b = verts[(v + 1) % verts.length];
        for (let i = 0; i < STEPS; i++) {
          const t = i / STEPS;
          dense.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t)]);
        }
      }
      return dense;
    }

    function strokeRainbowPath(
      points: Point[],
      time: number,
      hueBase: number,
      alpha: number,
      lw: number,
      glow: boolean,
    ) {
      const N = points.length;
      renderCtx.lineWidth = lw;
      renderCtx.lineCap = "round";
      renderCtx.lineJoin = "round";
      for (let i = 0; i < N; i++) {
        const a = points[i];
        const b = points[(i + 1) % N];
        const hue = (hueBase + (i / N) * 320 + time * 40) % 360;
        renderCtx.strokeStyle = `hsla(${hue},90%,62%,${alpha})`;
        renderCtx.shadowColor = `hsla(${hue},90%,62%,${alpha * (glow ? 0.8 : 0.4)})`;
        renderCtx.shadowBlur = glow ? 14 : 6;
        renderCtx.beginPath();
        renderCtx.moveTo(a[0], a[1]);
        renderCtx.lineTo(b[0], b[1]);
        renderCtx.stroke();
      }
      renderCtx.shadowBlur = 0;
    }

    function drawWire(
      cx: number,
      cy: number,
      scale: number,
      time: number,
      alpha: number,
    ) {
      if (alpha <= 0.01) return;
      EGG.meridians.forEach((f, mi) => {
        const pts: Point[] = [];
        const M = 44;
        for (let i = 0; i <= M; i++) {
          const t = i / M;
          pts.push([cx + f * halfW(t, scale), yAt(t, cy, scale)]);
        }
        const hueBase = (mi / EGG.meridians.length) * 320;
        renderCtx.lineWidth = 1.8;
        renderCtx.lineCap = "round";
        for (let i = 0; i < pts.length - 1; i++) {
          const hue = (hueBase + (i / pts.length) * 90 + time * 40) % 360;
          renderCtx.strokeStyle = `hsla(${hue},90%,63%,${alpha})`;
          renderCtx.shadowColor = `hsla(${hue},90%,63%,${alpha * 0.6})`;
          renderCtx.shadowBlur = 10;
          renderCtx.beginPath();
          renderCtx.moveTo(pts[i][0], pts[i][1]);
          renderCtx.lineTo(pts[i + 1][0], pts[i + 1][1]);
          renderCtx.stroke();
        }
      });
      EGG.latitudes.forEach((t, li) => {
        const rx = halfW(t, scale);
        const ry = rx * EGG.latTilt;
        const cyl = yAt(t, cy, scale);
        const hue = (200 + li * 26 + time * 40) % 360;
        renderCtx.strokeStyle = `hsla(${hue},88%,64%,${alpha * 0.9})`;
        renderCtx.shadowColor = `hsla(${hue},88%,64%,${alpha * 0.5})`;
        renderCtx.shadowBlur = 10;
        renderCtx.lineWidth = 1.6;
        renderCtx.beginPath();
        renderCtx.ellipse(cx, cyl, rx, ry, 0, 0, Math.PI * 2);
        renderCtx.stroke();
      });
      renderCtx.shadowBlur = 0;
    }

    function drawEggSolid(
      cx: number,
      cy: number,
      scale: number,
      time: number,
      prog: number,
    ) {
      if (prog <= 0.01) return;
      // [PORT] swap with your art: draw sprite at globalAlpha=prog centered at (cx,cy)
      const outline = eggOutlineRaw(cx, cy, scale);
      renderCtx.save();
      renderCtx.globalAlpha = prog;

      const path = new Path2D();
      path.moveTo(outline[0][0], outline[0][1]);
      for (let i = 1; i < outline.length; i++)
        path.lineTo(outline[i][0], outline[i][1]);
      path.closePath();

      const top = yAt(0, cy, scale);
      const bot = yAt(1, cy, scale);
      const g = renderCtx.createLinearGradient(
        cx - EGG.R * scale,
        top,
        cx + EGG.R * scale,
        bot,
      );
      for (let k = 0; k <= 6; k++) {
        const hue = (time * 38 + k * 56) % 360;
        g.addColorStop(k / 6, `hsl(${hue},88%,62%)`);
      }
      renderCtx.fillStyle = g;
      renderCtx.shadowColor = `hsla(${(time * 38) % 360},90%,60%,${0.6 * prog})`;
      renderCtx.shadowBlur = 50 * prog;
      renderCtx.fill(path);
      renderCtx.shadowBlur = 0;

      renderCtx.save();
      renderCtx.clip(path);
      const rg = renderCtx.createRadialGradient(
        cx - EGG.R * scale * 0.3,
        top + EGG.H * scale * 0.28,
        10,
        cx,
        cy,
        EGG.R * scale * 2.2,
      );
      rg.addColorStop(0, "rgba(255,255,255,0.35)");
      rg.addColorStop(0.5, "rgba(255,255,255,0)");
      rg.addColorStop(1, "rgba(0,0,0,0.4)");
      renderCtx.fillStyle = rg;
      renderCtx.fillRect(cx - 300, top - 50, 600, EGG.H * scale + 120);
      renderCtx.restore();

      drawWire(cx, cy, scale, time, 0.16 * prog);

      renderCtx.fillStyle = "rgba(255,255,255,0.5)";
      renderCtx.beginPath();
      renderCtx.ellipse(
        cx - EGG.R * scale * 0.34,
        top + EGG.H * scale * 0.26,
        EGG.R * scale * 0.16,
        EGG.R * scale * 0.26,
        -0.3,
        0,
        Math.PI * 2,
      );
      renderCtx.fill();
      renderCtx.restore();
    }

    function draw(now: number) {
      if (!alive) return;
      renderCtx.clearRect(0, 0, w, h);
      const v = visualRef.current;
      const cx = w / 2;
      const cy = h / 2;
      const time = now * 0.001;

      if (v.gridAlpha > 0.001) {
        const maxR = Math.hypot(w, h) / 2;
        const waveActive = v.shock >= 0;
        const waveR = waveActive ? v.shock * maxR * 1.18 : -1;
        const sp = GRIDCFG.spacing;
        const cols = Math.ceil(w / sp) + 2;
        const rows = Math.ceil(h / sp) + 2;
        const x0 = (w - (cols - 1) * sp) / 2;
        const y0 = (h - (rows - 1) * sp) / 2;

        const px = new Float32Array(cols * rows);
        const py = new Float32Array(cols * rows);
        const pa = new Float32Array(cols * rows);
        const pg = new Float32Array(cols * rows);

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const i = r * cols + c;
            const bx = x0 + c * sp;
            const by = y0 + r * sp;
            const introTargetY = cy - 212;
            const dx = bx - cx;
            const dy = by - (v.introPulse > 0 ? introTargetY : cy);
            const d = Math.hypot(dx, dy) || 0.0001;
            const ux = dx / d;
            const uy = dy / d;
            const shimmer = 0.85 + 0.15 * Math.sin(d * 0.012 - time * 1.8);
            const introWave =
              v.introPulse > 0
                ? Math.sin(Math.max(0, Math.min(1, v.introPulse)) * Math.PI)
                : 0;
            const introPull =
              introWave * Math.max(0, 1 - d / maxR) * (10 + v.introPulse * 20);
            let ox = bx - ux * introPull;
            let oy = by - uy * introPull;
            let a = Math.min(1, shimmer + introWave * 0.2);
            let gold = 0;
            if (waveActive) {
              const front = d - waveR;
              const bump = Math.exp(
                -(front * front) / (2 * GRIDCFG.bandWidth * GRIDCFG.bandWidth),
              );
              ox = bx + ux * bump * GRIDCFG.push;
              oy = by + uy * bump * GRIDCFG.push;
              gold = bump;
              if (d < waveR) {
                a *= Math.max(
                  0,
                  (d - (waveR - GRIDCFG.clearBand)) / GRIDCFG.clearBand,
                );
              }
              a = Math.min(1, a + bump * 0.8);
            }
            px[i] = ox;
            py[i] = oy;
            pa[i] = a;
            pg[i] = gold;
          }
        }

        renderCtx.lineWidth = GRIDCFG.lineWidth;
        renderCtx.lineCap = "round";
        const drawSeg = (i: number, j: number) => {
          const a = Math.min(pa[i], pa[j]) * v.gridAlpha;
          if (a <= 0.01) return;
          const goldMix = (pg[i] + pg[j]) * 0.5;
          const col = [
            Math.round(lerp(C.gridGreen[0], 255, goldMix)),
            Math.round(lerp(C.gridGreen[1], 240, goldMix)),
            Math.round(lerp(C.gridGreen[2], 200, goldMix)),
          ];
          renderCtx.strokeStyle = rgba(col, a);
          renderCtx.shadowColor = rgba(col, a * 0.6);
          renderCtx.shadowBlur = goldMix > 0.05 ? 12 : 6;
          renderCtx.beginPath();
          renderCtx.moveTo(px[i], py[i]);
          renderCtx.lineTo(px[j], py[j]);
          renderCtx.stroke();
        };
        for (let r = 0; r < rows; r++)
          for (let c = 0; c < cols - 1; c++)
            drawSeg(r * cols + c, r * cols + c + 1);
        for (let c = 0; c < cols; c++)
          for (let r = 0; r < rows - 1; r++)
            drawSeg(r * cols + c, (r + 1) * cols + c);
        renderCtx.shadowBlur = 0;
      }

      const scale = v.eggScale;

      if (v.solidProg > 0.01) {
        drawEggSolid(cx, cy, scale, time, v.solidProg);
      }

      const wireFade = 1 - v.solidProg;
      if ((v.triProg > 0.01 || v.wireAlpha > 0.01) && wireFade > 0.01) {
        if (v.morphProg < 0.999) {
          const triScaleIn = lerp(0.55, 1, Math.min(1, v.triProg));
          const squashX = 1 + v.triSquash * 0.3;
          const squashY = 1 - v.triSquash * 0.4;
          const N = 120;
          const tri = resampleClosed(
            triOutlineRaw(
              cx,
              cy + v.triDropY,
              scale,
              triScaleIn,
              squashX,
              squashY,
            ),
            N,
          );
          const egg = resampleClosed(eggOutlineRaw(cx, cy, scale), N);
          const pts: Point[] = tri.map(
            (p, i): Point => [
              lerp(p[0], egg[i][0], v.morphProg),
              lerp(p[1], egg[i][1], v.morphProg),
            ],
          );
          const outlineAlpha = Math.min(1, v.triProg) * wireFade;
          strokeRainbowPath(pts, time, 0, outlineAlpha, 2.4, true);
          drawWire(cx, cy, scale, time, v.wireAlpha * wireFade);
        } else {
          drawWire(cx, cy, scale, time, v.wireAlpha * wireFade);
        }
      }

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  /* ---------------- timeline ---------------- */
  useEffect(() => {
    const myRunId = ++runIdRef.current;
    const alive = () => runIdRef.current === myRunId;

    setCenterText("");
    setGlitching(false);
    visualRef.current = {
      gridAlpha: 0,
      introPulse: 0,
      shock: -1,
      triProg: 0,
      triDropY: 0,
      triSquash: 0,
      morphProg: 0,
      wireAlpha: 0,
      solidProg: 0,
      eggScale: 1,
      eggGlow: 0,
    };

    // Reset the single mounted label before the entrance animation.
    if (labelRef.current) {
      labelRef.current
        .getAnimations()
        .forEach((animation) => animation.cancel());
      labelRef.current.className = "dpc-syslabel";
      labelRef.current.style.opacity = "0";
    }

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    async function run() {
      const TAKE_CARE = `"Take Care of it."`;
      const GOODLUCK = `"Good luck, ${playerName}."`;
      const V = visualRef.current;

      setPhase("fadeInBlack");
      await sleep(reduce ? 150 : TIMING.fadeInMs);
      if (!alive()) return;

      // The opening shows only the green grid.
      setPhase("gridFadeIn");
      await tween(
        TIMING.gridFadeInMs,
        (e) => {
          V.gridAlpha = e * 0.4;
        },
        alive,
        easeOutCubic,
      );
      if (!alive()) return;

      await sleep(reduce ? 80 : 500);
      if (!alive()) return;

      if (!reduce) {
        await tween(
          1500,
          (e, raw) => {
            V.introPulse = raw;
            V.gridAlpha = 0.4 + e * 0.12;
          },
          alive,
          easeInOutCubic,
        );
        if (!alive()) return;

        V.introPulse = 0;
        V.gridAlpha = 0.4;

        const interference = rootRef.current?.animate(
          [
            { filter: "brightness(1)" },
            { filter: "brightness(1.7)" },
            { filter: "brightness(0.72)" },
            { filter: "brightness(1.18)" },
            { filter: "brightness(1)" },
          ],
          {
            duration: 130,
            easing: "steps(2, end)",
          },
        );

        if (interference) {
          await new Promise<void>((resolve) => {
            interference.onfinish = () => resolve();
            interference.oncancel = () => resolve();
          });
        }

        await sleep(120);
        if (!alive()) return;
      }

      // The single Aliune Signal element appears through depth, impacts once,
      // holds against the screen, then slowly settles into its assigned seat.
      await labelSlam(reduce);
      if (!alive()) return;

      // Brief pause after the label settles, then dialogue begins.
      await sleep(reduce ? 120 : 500);
      if (!alive()) return;

      // Man starts talking. Label still blinking red, sitting still.
      setPhase("glitchBoot");
      setGlitching(true);
      await glitchReveal(
        GLITCH_1,
        setCenterText,
        TIMING.glitch1RevealMs,
        alive,
      );
      if (!alive()) return;
      await sleep(TIMING.glitch1HoldMs);
      if (!alive()) return;
      setCenterText("");
      await sleep(220);
      if (!alive()) return;
      await glitchReveal(
        GLITCH_2,
        setCenterText,
        TIMING.glitch2RevealMs,
        alive,
      );
      if (!alive()) return;
      await sleep(TIMING.glitch2HoldMs);
      if (!alive()) return;
      setGlitching(false);
      setCenterText("");
      await sleep(280);
      if (!alive()) return;

      setPhase("lore");
      setGlitching(true);
      await glitchReveal(
        LORE_1,
        setCenterText,
        LORE_1.length * TIMING.loreTypeMsPerChar,
        alive,
      );
      if (!alive()) return;
      setGlitching(false);
      await sleep(2800);
      if (!alive()) return;
      await deleteText(
        LORE_1,
        setCenterText,
        TIMING.loreDeleteMsPerChar,
        alive,
      );
      if (!alive()) return;
      await sleep(400);
      if (!alive()) return;

      // Triangle + morph. Label still red, still blinking.
      setPhase("triangle");
      tween(
        reduce ? 200 : TIMING.triangleDrawMs,
        (e) => {
          V.triProg = e;
        },
        alive,
        easeOutCubic,
      );
      await tween(
        reduce ? 200 : TIMING.triangleDrawMs,
        (e) => {
          V.triDropY = lerp(-220, 0, e);
          V.triSquash =
            e < 0.85
              ? lerp(0, -0.5, e / 0.85)
              : lerp(-0.5, -0.15, (e - 0.85) / 0.15);
        },
        alive,
        easeInCubic,
      );
      if (!alive()) return;
      await tween(
        reduce ? 120 : 420,
        (e) => {
          const decay = Math.exp(-e * 4.2);
          V.triSquash = Math.sin(e * Math.PI * 2.4) * 0.85 * decay;
        },
        alive,
      );
      V.triSquash = 0;
      if (!alive()) return;
      await sleep(TIMING.trianglePulseMs);
      if (!alive()) return;

      setPhase("morph");
      const morphDuration = reduce ? 250 : TIMING.morphMs;
      startMorphColorTransition(morphDuration);
      await tween(
        morphDuration,
        (e) => {
          V.morphProg = e;
          V.wireAlpha = e;
        },
        alive,
        easeInOutCubic,
      );
      if (!alive()) return;

      // Morph complete. The onfinish handler applies the cyan resting class.
      setPhase("wireHold");
      setGlitching(true);
      await glitchReveal(
        `"${WIRE_LINE}"`,
        setCenterText,
        WIRE_LINE.length * TIMING.loreTypeMsPerChar,
        alive,
      );
      if (!alive()) return;
      setGlitching(false);
      await sleep(2400);
      if (!alive()) return;
      await deleteText(
        `"${WIRE_LINE}"`,
        setCenterText,
        TIMING.loreDeleteMsPerChar,
        alive,
      );
      if (!alive()) return;

      setPhase("shock");
      tween(
        TIMING.shockEggFlashMs,
        (e) => {
          V.eggGlow = e;
        },
        alive,
      );
      tween(
        reduce ? 300 : TIMING.solidMs,
        (e) => {
          V.solidProg = e;
          V.eggScale = lerp(1, 1.14, e);
        },
        alive,
        easeOutCubic,
      );
      await tween(
        reduce ? 320 : TIMING.shockMs,
        (e) => {
          V.shock = e;
        },
        alive,
        easeInOutCubic,
      );
      if (!alive()) return;
      V.gridAlpha = 0;
      V.shock = -1;

      setPhase("goodluck");
      setGlitching(true);
      await glitchReveal(
        TAKE_CARE,
        setCenterText,
        TAKE_CARE.length * TIMING.typeGoodluckMsPerChar,
        alive,
      );
      if (!alive()) return;
      setGlitching(false);
      await sleep(1800);
      if (!alive()) return;
      await deleteText(
        TAKE_CARE,
        setCenterText,
        TIMING.loreDeleteMsPerChar,
        alive,
      );
      if (!alive()) return;
      await sleep(350);
      if (!alive()) return;
      setGlitching(true);
      await glitchReveal(
        GOODLUCK,
        setCenterText,
        GOODLUCK.length * TIMING.typeGoodluckMsPerChar,
        alive,
      );
      if (!alive()) return;
      setGlitching(false);
      setPhase("hold");
      await sleep(TIMING.holdMs);
      if (!alive()) return;

      setPhase("fadeOut");
      await sleep(TIMING.fadeOutMs);
      if (!alive()) return;

      await apiFetch("/api/pets/ensure-egg", {
        method: "POST",
        json: { line: "random" },
      });
      if (!alive()) return;

      await apiFetch("/api/me/intro/seen", { method: "POST" });
      if (!alive()) return;

      navigate("/hatchery", { replace: true });
      setPhase("done");
    }

    run();
    return () => {
      if (runIdRef.current === myRunId) runIdRef.current++;
    };
  }, [playerName, replayKey]);

  const blackOn =
    phase === "fadeInBlack" || phase === "fadeOut" || phase === "done";
  const centerFadesOut = phase === "fadeOut" || phase === "done";
  const typingPhase =
    phase === "lore" || phase === "wireHold" || phase === "goodluck";
  const isGoodluckText =
    phase === "goodluck" || phase === "hold" || phase === "fadeOut";

  return (
    <div ref={rootRef} className="dpc-root">
      <style>{css}</style>
      <canvas ref={canvasRef} className="dpc-canvas" />
      <div className={`dpc-black ${blackOn ? "on" : "off"}`} />
      <div ref={crackRef} className="dpc-impact-crack" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      {/*
        Always in the DOM. Hidden until labelSlam() fires.
        Never conditionally mounted -- that was the bug causing animation replays.
      */}
      <div ref={labelRef} className="dpc-syslabel" style={{ opacity: 0 }}>
        Systems // Aliune Signal
      </div>

      <div className={`dpc-center ${centerFadesOut ? "fade-out" : ""}`}>
        <div
          className={`dpc-text ${glitching ? "glitch" : ""} ${
            isGoodluckText ? "dpc-text--goodluck" : ""
          }`}
        >
          <span>{centerText}</span>
          {typingPhase || glitching ? (
            <span className="dpc-caret">▍</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   styles
========================================================= */
const css = `
.dpc-root{
  position:relative; width:100%; height:100vh; min-height:560px;
  background:${C.bg}; overflow:hidden;
  font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
}
.dpc-canvas{ position:absolute; inset:0; width:100%; height:100%; display:block; }

.dpc-black{ position:absolute; inset:0; background:#000; pointer-events:none;
  transition:opacity 900ms ease; }
.dpc-black.on{ opacity:1; } .dpc-black.off{ opacity:0; }

.dpc-impact-crack{
  position:absolute;
  left:50%;
  top:calc(50% - 212px);
  width:210px;
  height:190px;
  transform:translate(-50%,-50%) scale(.9);
  opacity:0;
  z-index:9;
  pointer-events:none;
}
.dpc-impact-crack.active{
  opacity:.9;
  transform:translate(-50%,-50%) scale(1);
  transition:opacity 20ms linear, transform 70ms ease-out;
}
.dpc-impact-crack.fading{
  opacity:0;
  transform:translate(-50%,-50%) scale(1.04);
  transition:opacity 900ms ease-out, transform 900ms ease-out;
}
.dpc-impact-crack span{
  position:absolute;
  left:50%;
  top:50%;
  width:3px;
  height:92px;
  background:rgba(225,248,255,.8);
  box-shadow:0 0 4px rgba(225,248,255,.35);
  transform-origin:50% 0;
  clip-path:polygon(38% 0,100% 0,62% 30%,100% 48%,48% 72%,70% 100%,0 100%,30% 70%,0 50%,42% 28%);
}
.dpc-impact-crack span:nth-child(1){ transform:rotate(8deg); height:104px; }
.dpc-impact-crack span:nth-child(2){ transform:rotate(58deg); height:88px; }
.dpc-impact-crack span:nth-child(3){ transform:rotate(112deg); height:96px; }
.dpc-impact-crack span:nth-child(4){ transform:rotate(168deg); height:82px; }
.dpc-impact-crack span:nth-child(5){ transform:rotate(226deg); height:100px; }
.dpc-impact-crack span:nth-child(6){ transform:rotate(302deg); height:86px; }

/* =====================================================
   ALIUNE SIGNAL LABEL
   Resting spot: horizontally centered, above the egg.
===================================================== */
.dpc-syslabel{
  position:absolute;
  top:calc(50% - 212px);
  left:50%;
  transform:translateX(-50%);
  z-index:10;
  font-size:18px;
  letter-spacing:5px;
  white-space:nowrap;
  pointer-events:none;
}

.dpc-syslabel--red{
  color:rgba(255,70,90,0.95);
  text-shadow:none;
  animation:dpcSignalBlink 0.9s steps(1) infinite;
}

.dpc-syslabel--cyan{
  color:rgba(120,230,255,0.8);
  text-shadow:0 0 14px rgba(120,230,255,0.5);
  animation:none;
}

@keyframes dpcSignalBlink{
  0%,100%{ color:rgba(255,70,90,0.95); }
  50%{ color:rgba(255,70,90,0.28); }
}

/* =====================================================
   CENTER TEXT
===================================================== */
.dpc-center{
  position:absolute; inset:0;
  display:flex; align-items:center; justify-content:center;
}
.dpc-center.fade-out{
  opacity:0;
  transition:opacity ${TIMING.fadeOutMs}ms ease;
}

.dpc-text{
  position:absolute; left:50%; top:50%;
  transform:translate(-50%, calc(-50% + 220px));
  width:100%; max-width:780px; min-height:86px;
  padding:0 20px;
  display:flex; align-items:center; justify-content:center;
  overflow:visible;
  color:${C.text}; font-size:22px; line-height:1.35;
  letter-spacing:.3px; text-align:center;
  text-wrap:balance;
  text-shadow:0 0 18px rgba(70,220,255,0.28);
}
.dpc-text.dpc-text--goodluck{
  font-size:20px;
}
.dpc-text.glitch span{
  text-shadow:2px 0 rgba(255,60,120,0.6), -2px 0 rgba(60,200,255,0.6), 0 0 18px rgba(120,230,255,0.4);
  animation:dpcJit .12s steps(2) infinite;
}
@keyframes dpcJit{
  0%  { transform:translate(0,0); }
  50% { transform:translate(0.6px,-0.6px); }
  100%{ transform:translate(-0.5px,0.5px); }
}

.dpc-caret{
  display:inline-block; width:.7ch; margin-left:2px;
  color:rgba(120,230,255,0.95);
  animation:dpcBlink .7s steps(1) infinite;
}
@keyframes dpcBlink{ 50%{ opacity:0; } }

.dpc-controls{ position:absolute; bottom:16px; left:50%; transform:translateX(-50%);
  display:flex; gap:8px; z-index:10; }
.dpc-input{ background:rgba(0,0,0,0.5); border:1px solid rgba(120,230,255,0.4);
  color:#eafdff; padding:7px 10px; border-radius:8px; font-size:13px; width:140px; font-family:inherit; }
.dpc-btn{ background:rgba(120,230,255,0.14); border:1px solid rgba(120,230,255,0.5);
  color:#eafdff; padding:7px 14px; border-radius:8px; font-size:13px; cursor:pointer; font-family:inherit; }
.dpc-btn:hover{ background:rgba(120,230,255,0.24); }
`;
