import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
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
 *   2. "Wrong screen" glitch boot: text scrambles, then steadies (subtle)
 *   3. One lore line, then the cyan digital grid blooms in
 *   4. A rainbow Delta triangle draws on at center and pulses
 *   5. The triangle MORPHS into the wireframe egg (rainbow longitude/latitude
 *      lines wrapping the form, like the concept sketch). It reads as digital.
 *   6. The egg pulses: a shockwave shoves the grid away AND the egg breaks free,
 *      filling in as a solid color-shifting rainbow egg (the Mystery Golden Egg).
 *   7. "Good luck, <name>." -> fade out -> done
 *
 * Architecture matches your real CreatePage so it ports back:
 *   - phase state machine, TIMING constants, typeText/deleteText, runIdRef guard.
 *   - The grid, triangle, and egg all render on ONE canvas (shared coordinates),
 *     driven by visualRef values that the tween() helper animates.
 *
 * PORT NOTES: search  // [PORT]
 *   - swap mock playerName for useAuth()
 *   - swap the code-drawn egg for your art whenever you want (see drawEggSolid)
 *   - put your ensure-egg / intro-seen API + navigate("/hatchery") before setPhase("done")
 */

/* =========================================================
   TIMING  (tweak the whole pace here)
========================================================= */
const TIMING = {
  fadeInMs: 700,

  glitch1RevealMs: 2200,
  glitch1HoldMs: 1600,
  glitch2RevealMs: 1800,
  glitch2HoldMs: 1500,

  loreTypeMsPerChar: 70,
  lorePauseMs: 900,
  gridFadeInMs: 1300,
  loreDeleteMsPerChar: 35,

  triangleDrawMs: 1400,
  trianglePulseMs: 900,
  morphMs: 1900, // triangle -> wireframe egg
  wireHoldMs: 2000, // egg sits as digital wireframe

  shockEggFlashMs: 320,
  shockMs: 2200, // grid pushed away
  solidMs: 1500, // wireframe -> solid rainbow egg

  typeGoodluckMsPerChar: 75,
  holdMs: 3000,
  fadeOutMs: 1700,
};

/* =========================================================
   COPY  (edit freely; on-screen text stays short)
========================================================= */
const GLITCH_1 = `...wait. you weren't supposed to find this screen.`;
const GLITCH_2 = `but it seems the signal found you.`;
const WIRE_LINE = `...Oh look, an egg, how quaint.`;

/* =========================================================
   LOOK
========================================================= */
const C = {
  bg: "#02040a",
  gridGreen: [70, 220, 255], // cyan digital world
  text: "rgba(225,248,255,0.95)",
};

/* egg + grid geometry (all tweakable) */
const EGG = {
  H: 305, // egg height (px)
  R: 118, // egg half-width (px)
  latTilt: 0.22, // how "flat" the latitude rings look (3D feel)
  meridians: [-1, -0.66, -0.33, 0, 0.33, 0.66, 1],
  latitudes: [0.14, 0.32, 0.5, 0.68, 0.86],
  triSize: 165, // delta triangle size before morph
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
  | "glitchBoot"
  | "lore"
  | "gridFadeIn"
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

async function typeText(
  full: string,
  set: TextSetter,
  msPerChar: number,
  alive: AliveCheck,
) {
  set("");
  for (let i = 1; i <= full.length; i++) {
    if (!alive()) return;
    set(full.slice(0, i));
    await sleep(msPerChar);
  }
}
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

/* glitch reveal: scrambles, locks in left-to-right, then steadies */
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

/* tween 0..1 over duration; resolves on done or when alive() is false */
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

/* resample a closed point loop to N evenly spaced points (by arc length) */
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
export default function DeltaPetsCutscene() {
  // [PORT] const { user } = useAuth();  -> derive display name
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState("Jayden");

  const [phase, setPhase] = useState<TimelinePhase>("fadeInBlack");
  const [centerText, setCenterText] = useState("");
  const [glitching, setGlitching] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const visualRef = useRef<VisualState>({
    gridAlpha: 0,
    shock: -1, // -1 inactive, else 0..1
    triProg: 0, // triangle fade/scale in
    triDropY: 0, // triangle fall-in offset (negative = above final position)
    triSquash: 0, // squash/stretch punch: negative = stretch, positive = squash
    morphProg: 0, // 0 triangle -> 1 egg outline
    wireAlpha: 0, // interior wireframe opacity
    solidProg: 0, // wireframe -> solid rainbow
    eggScale: 1, // egg pushes outward on the break
    eggGlow: 0,
  });

  const runIdRef = useRef(0);
  const [replayKey, setReplayKey] = useState(0);

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

    /* egg geometry around a center */
    function halfW(t: number, scale: number) {
      const y = t * 2 - 1; // -1 top .. 1 bottom
      const base = Math.sqrt(Math.max(0, 1 - y * y));
      return EGG.R * scale * base * (1 + 0.3 * y); // skew: fatter bottom
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
      // [PORT] To use your own art instead of this code-drawn egg:
      //   draw your sprite here with globalAlpha = prog, centered at (cx,cy),
      //   and delete the gradient block below.
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

      /* ---- grid ---- */
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
            const dx = bx - cx;
            const dy = by - cy;
            const d = Math.hypot(dx, dy) || 0.0001;
            const ux = dx / d;
            const uy = dy / d;
            const shimmer = 0.85 + 0.15 * Math.sin(d * 0.012 - time * 1.8);
            let ox = bx;
            let oy = by;
            let a = shimmer;
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

      /* ---- triangle -> wireframe egg -> solid egg ---- */
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

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    async function run() {
      const GOODLUCK = `"Good luck, ${playerName}."`;
      const V = visualRef.current;

      setPhase("fadeInBlack");
      await sleep(reduce ? 150 : TIMING.fadeInMs);
      if (!alive()) return;

      // grid blooms in first, low opacity, ambient backdrop for the glitch text
      setPhase("gridFadeIn");
      await tween(
        TIMING.gridFadeInMs,
        (e) => {
          V.gridAlpha = e * 0.4; // low opacity, not full grid
        },
        alive,
        easeOutCubic,
      );
      if (!alive()) return;

      // wrong-screen glitch boot (subtle)
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

      // rainbow Delta triangle falls in with a squash-and-stretch landing
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
          V.triDropY = lerp(-220, 0, e); // falls from above into place
          V.triSquash = e < 0.7 ? lerp(-0.3, 0, e / 0.7) : 0; // slight stretch while falling
        },
        alive,
        easeInCubic, // gravity: slow start, fast landing
      );
      if (!alive()) return;
      await tween(
        reduce ? 120 : 260,
        (e) => {
          V.triSquash = Math.sin(e * Math.PI) * 0.55; // squash on impact, rebound to normal
        },
        alive,
      );
      V.triSquash = 0;
      if (!alive()) return;
      await sleep(TIMING.trianglePulseMs);
      if (!alive()) return;

      // morph triangle -> wireframe egg
      setPhase("morph");
      await tween(
        reduce ? 250 : TIMING.morphMs,
        (e) => {
          V.morphProg = e;
          V.wireAlpha = e;
        },
        alive,
        easeInOutCubic,
      );
      if (!alive()) return;

      setPhase("wireHold");
      await typeText(
        `"${WIRE_LINE}"`,
        setCenterText,
        TIMING.loreTypeMsPerChar,
        alive,
      );
      if (!alive()) return;
      await sleep(TIMING.wireHoldMs);
      if (!alive()) return;
      await deleteText(
        `"${WIRE_LINE}"`,
        setCenterText,
        TIMING.loreDeleteMsPerChar,
        alive,
      );
      if (!alive()) return;

      // SHOCK: grid pushed away + egg breaks free into solid rainbow
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

      // good luck (uses the same glitch effect as the intro lines)
      setPhase("goodluck");
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

      // [PORT] real flow: await ensure-egg; fire intro-seen; navigate("/hatchery")
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
    phase === "lore" ||
    phase === "gridFadeIn" ||
    phase === "wireHold" ||
    phase === "goodluck";

  return (
    <div className="dpc-root">
      <style>{css}</style>
      <canvas ref={canvasRef} className="dpc-canvas" />
      <div className={`dpc-black ${blackOn ? "on" : "off"}`} />

      {phase === "glitchBoot" ? (
        <div className="dpc-syslabel">SYSTEM // ALIUNE SIGNAL</div>
      ) : null}

      <div className={`dpc-center ${centerFadesOut ? "fade-out" : ""}`}>
        <div className={`dpc-text ${glitching ? "glitch" : ""}`}>
          <span>{centerText}</span>
          {typingPhase || glitching ? (
            <span className="dpc-caret">▍</span>
          ) : null}
        </div>
      </div>

      {/* preview-only controls (delete in your app) */}
      <div className="dpc-controls">
        <input
          className="dpc-input"
          value={playerName}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setPlayerName(e.target.value || "Traveler")
          }
          aria-label="Preview player name"
        />
        <button
          className="dpc-btn"
          type="button"
          onClick={() => setReplayKey((k) => k + 1)}
        >
          Replay
        </button>
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

.dpc-syslabel{
  position:absolute; top:34px; left:50%; transform:translateX(-50%);
  color:rgba(120,230,255,0.7); font-size:12px; letter-spacing:3px;
  animation: dpcFlicker 1.6s steps(2) infinite;
}
@keyframes dpcFlicker{ 0%,100%{opacity:.7} 48%{opacity:.25} 52%{opacity:.85} }

.dpc-center{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }
.dpc-center.fade-out{ opacity:0; transition:opacity ${TIMING.fadeOutMs}ms ease; }

.dpc-text{
  position:absolute; left:50%; top:50%;
  transform:translate(-50%, calc(-50% + 175px));
  width:100%; max-width:780px; height:86px;
  display:flex; align-items:center; justify-content:center;
  overflow:visible;
  color:${C.text}; font-size:22px; letter-spacing:.3px; text-align:center;
  text-shadow:0 0 18px rgba(70,220,255,0.28);
}
.dpc-text.glitch span{
  text-shadow: 2px 0 rgba(255,60,120,0.6), -2px 0 rgba(60,200,255,0.6), 0 0 18px rgba(120,230,255,0.4);
  animation: dpcJit .12s steps(2) infinite;
}
@keyframes dpcJit{ 0%{transform:translate(0,0)} 50%{transform:translate(0.6px,-0.6px)} 100%{transform:translate(-0.5px,0.5px)} }

.dpc-caret{ display:inline-block; width:.7ch; margin-left:2px;
  color:rgba(120,230,255,0.95); animation:dpcBlink .7s steps(1) infinite; }
@keyframes dpcBlink{ 50%{opacity:0} }

.dpc-controls{ position:absolute; bottom:16px; left:50%; transform:translateX(-50%);
  display:flex; gap:8px; z-index:10; }
.dpc-input{ background:rgba(0,0,0,0.5); border:1px solid rgba(120,230,255,0.4);
  color:#eafdff; padding:7px 10px; border-radius:8px; font-size:13px; width:140px; font-family:inherit; }
.dpc-btn{ background:rgba(120,230,255,0.14); border:1px solid rgba(120,230,255,0.5);
  color:#eafdff; padding:7px 14px; border-radius:8px; font-size:13px; cursor:pointer; font-family:inherit; }
.dpc-btn:hover{ background:rgba(120,230,255,0.24); }
`;
