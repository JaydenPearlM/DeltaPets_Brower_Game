import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase/client";
import { useAuth } from "../app/providers/useAuth";
import "./create.css";

type Phase =
  | "fadeInBlack"
  | "typingLine1"
  | "pauseAfterLine1"
  | "typingLine2"
  | "pauseAfterLine2"
  | "revealEggAndSave"
  | "typingGoodluck"
  | "pauseAfterGoodluck"
  | "fadeOutToBlack"
  | "done";

const TIMING = {
  fadeInMs: 2200,

  // line 1
  typeMsPerChar1: 80,
  pauseAfterLine1Ms: 1200,

  // line 2
  typeMsPerChar2: 55,
  pauseAfterLine2Ms: 900, // pause before egg reveal

  // egg
  eggFadeInMs: 1400,
  eggIdleStartMs: 350,
  eggTitleTypeMsPerChar: 45,

  // goodluck
  typeMsPerChar3: 65,
  pauseAfterGoodluckMs: 3000, // longer, per your request

  // exit
  fadeOutMs: 2000,
};

const LINE_1 = "Every bond begins with a chance...";

function pickRandomStarterLine() {
  const lines = [
    "water",
    "fire",
    "earth",
    "air",
    "ice",
    "storm",
    "light",
    "shadow",
  ] as const;

  return lines[Math.floor(Math.random() * lines.length)];
}

function getPlayerName(user: any) {
  const meta = user?.user_metadata ?? {};
  const fromMeta =
    meta.username || meta.display_name || meta.displayName || meta.name;

  if (typeof fromMeta === "string" && fromMeta.trim().length > 0) {
    return fromMeta.trim();
  }

  const email = user?.email;
  if (typeof email === "string" && email.includes("@")) {
    return email.split("@")[0];
  }

  return "Traveler";
}

function sleep(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}

async function typeText(
  full: string,
  set: (s: string) => void,
  msPerChar: number,
  alive?: () => boolean,
  humanize = true,
) {
  set("");
  for (let i = 1; i <= full.length; i++) {
    if (alive && !alive()) return;
    set(full.slice(0, i));

    const jitter = humanize ? Math.floor(Math.random() * 18) - 7 : 0;
    await sleep(Math.max(12, msPerChar + jitter));
  }
}

export default function CreatePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("fadeInBlack");

  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [eggTitle, setEggTitle] = useState("");
  const [goodluck, setGoodluck] = useState("");

  const [eggVisible, setEggVisible] = useState(false);

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Initializing…");
  const [fatalError, setFatalError] = useState<string | null>(null);

  const starterLine = useMemo(() => pickRandomStarterLine(), []);
  const playerName = useMemo(() => getPlayerName(user), [user]);

  const runIdRef = useRef(0);

  useEffect(() => {
    const myRunId = ++runIdRef.current;
    const alive = () => runIdRef.current === myRunId;

    async function run() {
      setFatalError(null);

      if (authLoading) {
        setStatus("Waiting for auth…");
        return;
      }

      if (!user) {
        setStatus("Not logged in. Returning home…");
        navigate("/", { replace: true });
        return;
      }

      const LINE_2 =
        "While walking through a forest, something catches your eye...";
      const EGG_TITLE = "You Found an Egg, How peculiar!";
      const GOODLUCK = `Goodluck, ${playerName}`;

      try {
        // Reset + fade in
        setStatus("Cutscene: fade in…");
        setPhase("fadeInBlack");
        setLine1("");
        setLine2("");
        setEggTitle("");
        setGoodluck("");
        setEggVisible(false);

        await sleep(TIMING.fadeInMs);
        if (!alive()) return;

        // Line 1 (keep it, blink)
        setStatus("Cutscene: typing…");
        setPhase("typingLine1");
        await typeText(LINE_1, setLine1, TIMING.typeMsPerChar1, alive, true);
        if (!alive()) return;

        setPhase("pauseAfterLine1");
        await sleep(TIMING.pauseAfterLine1Ms);
        if (!alive()) return;

        // Line 2 (type ONCE, do NOT repeat)
        setStatus("Cutscene: story…");
        setPhase("typingLine2");
        await typeText(LINE_2, setLine2, TIMING.typeMsPerChar2, alive, true);
        if (!alive()) return;

        setPhase("pauseAfterLine2");
        await sleep(TIMING.pauseAfterLine2Ms);
        if (!alive()) return;

        // Egg reveal + save (egg fades in, title types above it)
        setStatus("Cutscene: reveal…");
        setPhase("revealEggAndSave");
        setEggVisible(true);

        // Save egg once, right at reveal (SERVER time)
        setBusy(true);
        try {
          // Prefer env, but don't explode if it's missing in dev
          const apiBase =
            (import.meta.env.VITE_API_URL as string | undefined) ?? "";

          const { data: sessionData, error: sessionErr } =
            await supabase.auth.getSession();
          if (sessionErr) throw sessionErr;

          const accessToken = sessionData.session?.access_token;
          if (!accessToken) throw new Error("No access token");

          const res = await fetch(`${apiBase}/api/pets/ensure-egg`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ line: starterLine }),
          });

          // Try to read JSON either way (nice error messages)
          const data = await res.json().catch(() => ({}) as any);

          if (!alive()) return;

          if (!res.ok) {
            const msg =
              data?.error ||
              data?.message ||
              `Failed to ensure egg (HTTP ${res.status})`;
            throw new Error(msg);
          }
        } catch (err) {
          console.error("Egg ensure failed:", err);
          if (alive()) {
            setFatalError(
              `Egg save failed: ${String((err as any)?.message ?? err)}`,
            );
          }
          return;
        } finally {
          if (alive()) setBusy(false);
        }

        // Type egg title above egg (no repeating story text)
        await typeText(
          EGG_TITLE,
          setEggTitle,
          TIMING.eggTitleTypeMsPerChar,
          alive,
          true,
        );
        if (!alive()) return;

        // Goodluck line (leave longer)
        setStatus("Cutscene: goodluck…");
        setPhase("typingGoodluck");
        await typeText(
          GOODLUCK,
          setGoodluck,
          TIMING.typeMsPerChar3,
          alive,
          true,
        );
        if (!alive()) return;

        setPhase("pauseAfterGoodluck");
        await sleep(TIMING.pauseAfterGoodluckMs);
        if (!alive()) return;

        // Fade out together
        setStatus("Entering game…");
        setPhase("fadeOutToBlack");
        await sleep(TIMING.fadeOutMs);
        if (!alive()) return;

        setPhase("done");
        navigate("/pet", { replace: true });
      } catch (err) {
        console.error("Create cutscene crashed:", err);
        if (alive())
          setFatalError("Cutscene crashed. Check console for details.");
      }
    }

    run();

    return () => {
      if (runIdRef.current === myRunId) runIdRef.current++;
    };
  }, [authLoading, user, navigate, starterLine, playerName]);

  const blackIsOn =
    phase === "fadeInBlack" || phase === "fadeOutToBlack" || phase === "done";

  const centerFadesOut = phase === "fadeOutToBlack" || phase === "done";

  // Cursor blink:
  // - line1 should blink after it finishes (otherworldly)
  const line1CursorOn = phase === "typingLine1" || phase === "pauseAfterLine1";
  const line2CursorOn = phase === "typingLine2";
  const goodluckCursorOn =
    phase === "typingGoodluck" || phase === "pauseAfterGoodluck";

  return (
    <div
      className="dp-create-root"
      aria-busy={busy ? "true" : "false"}
      style={
        {
          ["--eggFadeInMs" as any]: `${TIMING.eggFadeInMs}ms`,
          ["--eggIdleStartMs" as any]: `${TIMING.eggIdleStartMs}ms`,
          ["--fadeOutMs" as any]: `${TIMING.fadeOutMs}ms`,
        } as React.CSSProperties
      }
    >
      <div
        className={`dp-black ${blackIsOn ? "dp-black-on" : "dp-black-off"}`}
      />

      <div className={`dp-center ${centerFadesOut ? "dp-fade-out" : ""}`}>
        <div className="dp-stage">
          <div className="dp-text-slot" aria-live="polite">
            <div
              className={`dp-line dp-line-1 ${line1CursorOn ? "dp-eldritch" : ""}`}
            >
              <span className="dp-text">{line1}</span>
              <span
                className={`dp-caret ${line1CursorOn ? "is-on" : "is-off"}`}
              >
                ▍
              </span>
            </div>

            <div
              className={`dp-line dp-line-2 ${line2CursorOn ? "dp-cursor" : ""}`}
            >
              {line2}
            </div>

            <div
              className={`dp-line dp-line-3 ${goodluckCursorOn ? "dp-cursor" : ""}`}
            >
              {goodluck}
            </div>
          </div>

          <div className="dp-egg-slot" aria-hidden="true">
            <div
              className={[
                "dp-egg-wrap",
                eggVisible ? "is-visible" : "is-hidden",
              ].join(" ")}
            >
              <div className="dp-egg-title">{eggTitle}</div>
              <div className="dp-egg" />
            </div>
          </div>
        </div>

        <div className="dp-debug">
          <div className="dp-debug-row">
            <span className="dp-dot" />
            <span>{fatalError ? "Error" : "Status"}:</span>
          </div>

          <div className="dp-debug-msg">{fatalError ? fatalError : status}</div>

          {!fatalError ? null : (
            <button
              type="button"
              className="dp-debug-btn"
              onClick={() => navigate("/", { replace: true })}
            >
              Go Home
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
