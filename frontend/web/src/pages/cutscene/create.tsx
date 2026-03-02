// frontend/web/src/pages/create.tsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase/client";
import { useAuth } from "../../app/providers/useAuth";
import { MYSTERY_EGG } from "../../Pets_Creation/assets/eggs/eggType";
import "./create.css";

type Phase =
  | "fadeInBlack"
  | "typeLine1"
  | "deleteLine1"
  | "pauseBeforeLine2"
  | "typeLine2"
  | "eggFadeIn"
  | "deleteLine2"
  | "bubblePop"
  | "typeGoodluck"
  | "hold"
  | "fadeOut"
  | "done";

const TIMING = {
  fadeInMs: 900,

  type1MsPerChar: 85,
  delete1MsPerChar: 60,
  pauseAfterLine1Ms: 2550,

  pauseBeforeLine2Ms: 900,
  type2MsPerChar: 65,
  pauseAfterLine2TypedMs: 650,
  delete2MsPerChar: 45,

  bubblePopDelayMs: 120,
  typeGoodluckMsPerChar: 55,
  holdMs: 2500,

  fadeOutMs: 1600,
};

const LINE_1 = `"Every bond begins with a chance..."`;
const LINE_2 = `"You look around and something catches your eye."`;
const BUBBLE_TEXT = `"Oh you found an egg, how peculiar!"`;

// Vite dev flag (frontend only)
const DEV = import.meta.env.DEV;
// Dev-only logger (keeps terminal useful without polluting prod)
const dlog = (...args: unknown[]) => {
  if (DEV) console.log(...args);
};

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

  if (typeof fromMeta === "string" && fromMeta.trim()) return fromMeta.trim();

  const email = user?.email;
  if (typeof email === "string" && email.includes("@"))
    return email.split("@")[0];

  return "Traveler";
}

function sleep(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}

async function typeText(
  full: string,
  set: (s: string) => void,
  msPerChar: number,
  alive: () => boolean,
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
  set: (s: string) => void,
  msPerChar: number,
  alive: () => boolean,
) {
  for (let i = current.length; i >= 0; i--) {
    if (!alive()) return;
    set(current.slice(0, i));
    await sleep(msPerChar);
  }
}

async function getAccessTokenOrThrow() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const token = data.session?.access_token;
  if (!token) throw new Error("No access token");

  return token;
}

async function postJson(
  url: string,
  token: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: body === undefined ? JSON.stringify({}) : JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export default function CreatePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const starterLine = useMemo(() => pickRandomStarterLine(), []);
  const playerName = useMemo(() => getPlayerName(user), [user]);

  const [phase, setPhase] = useState<Phase>("fadeInBlack");

  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [goodluck, setGoodluck] = useState("");

  const [eggVisible, setEggVisible] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Initializing…");
  const [fatalError, setFatalError] = useState<string | null>(null);

  const runIdRef = useRef(0);

  useEffect(() => {
    const myRunId = ++runIdRef.current;
    const alive = () => runIdRef.current === myRunId;

    const replay =
      new URLSearchParams(window.location.search).get("replay") === "1";

    async function run() {
      setFatalError(null);

      if (authLoading) {
        setStatus("Waiting for auth…");
        return;
      }

      if (!user) {
        navigate("/", { replace: true });
        return;
      }

      const GOODLUCK = `"Goodluck, ${playerName}"`;

      // reset UI state
      setLine1("");
      setLine2("");
      setGoodluck("");
      setEggVisible(false);
      setBubbleVisible(false);

      try {
        setStatus("Cutscene: fade in…");
        setPhase("fadeInBlack");
        await sleep(TIMING.fadeInMs);
        if (!alive()) return;

        setStatus("Cutscene: line 1…");
        setPhase("typeLine1");
        await typeText(LINE_1, setLine1, TIMING.type1MsPerChar, alive);
        if (!alive()) return;

        await sleep(TIMING.pauseAfterLine1Ms);
        if (!alive()) return;

        setStatus("Cutscene: delete line 1…");
        setPhase("deleteLine1");
        await deleteText(LINE_1, setLine1, TIMING.delete1MsPerChar, alive);
        if (!alive()) return;

        setStatus("Cutscene: pause…");
        setPhase("pauseBeforeLine2");
        await sleep(TIMING.pauseBeforeLine2Ms);
        if (!alive()) return;

        setStatus("Cutscene: line 2…");
        setPhase("typeLine2");
        await typeText(LINE_2, setLine2, TIMING.type2MsPerChar, alive);
        if (!alive()) return;

        // Dev-only cutscene diagnostics (keeps your terminal useful, not noisy)
        dlog("[create] CUTSCENE MYSTERY_EGG:", MYSTERY_EGG);
        dlog("[create] CUTSCENE sprite value:", MYSTERY_EGG?.sprite);

        setStatus("Cutscene: egg fade in…");
        setPhase("eggFadeIn");
        setEggVisible(true);

        // Safe access (won't crash even if sprite is missing)
        dlog("[create] CUTSCENE sprite:", MYSTERY_EGG?.sprite);

        // Backend actions (only when not replaying)
        if (!replay) {
          setBusy(true);
          try {
            const token = await getAccessTokenOrThrow();

            // Ensure egg gets created/assigned in hatchery slot
            const ensure = await postJson("/api/pets/ensure-egg", token, {
              line: starterLine,
            });

            if (!ensure.ok) {
              throw new Error(
                ensure.data?.error ?? `ensure-egg HTTP ${ensure.status}`,
              );
            }

            // Mark intro as seen (ONLY ONCE)
            const seen = await postJson("/api/me/intro/seen", token);
            if (!seen.ok) {
              console.warn("[create] intro/seen failed", {
                status: seen.status,
                data: seen.data,
              });
            }
          } catch (err) {
            console.warn(
              "[create] ensure-egg / intro-seen failed (continuing cutscene)",
              err,
            );

            // "dev" status in dev, more neutral in prod
            setStatus(
              DEV
                ? "Backend offline — continuing (dev)"
                : "Backend unavailable — continuing",
            );
          } finally {
            if (alive()) setBusy(false);
          }
        }

        await sleep(TIMING.pauseAfterLine2TypedMs);
        if (!alive()) return;

        setStatus("Cutscene: delete line 2…");
        setPhase("deleteLine2");
        await deleteText(LINE_2, setLine2, TIMING.delete2MsPerChar, alive);
        if (!alive()) return;

        await sleep(TIMING.bubblePopDelayMs);
        if (!alive()) return;

        setStatus("Cutscene: bubble…");
        setPhase("bubblePop");
        setBubbleVisible(true);

        await sleep(450);
        if (!alive()) return;

        setStatus("Cutscene: goodluck…");
        setPhase("typeGoodluck");
        await typeText(
          GOODLUCK,
          setGoodluck,
          TIMING.typeGoodluckMsPerChar,
          alive,
        );
        if (!alive()) return;

        setPhase("hold");
        await sleep(TIMING.holdMs);
        if (!alive()) return;

        setStatus("Entering game…");
        setPhase("fadeOut");
        await sleep(TIMING.fadeOutMs);
        if (!alive()) return;

        setPhase("done");
        navigate("/hatchery", { replace: true });
      } catch (err: any) {
        console.error("[create] cutscene crashed:", err);
        if (alive()) setFatalError(err?.message ?? "Cutscene crashed");
      }
    }

    run();

    return () => {
      if (runIdRef.current === myRunId) runIdRef.current++;
    };
  }, [authLoading, user, navigate, playerName, starterLine]);

  const showCursorLine1 = phase === "typeLine1" || phase === "deleteLine1";
  const showCursorLine2 =
    phase === "typeLine2" || phase === "eggFadeIn" || phase === "deleteLine2";
  const showCursorGoodluck = phase === "typeGoodluck";

  const blackIsOn =
    phase === "fadeInBlack" || phase === "fadeOut" || phase === "done";
  const centerFadesOut = phase === "fadeOut" || phase === "done";

  return (
    <div
      className="dp-create-root"
      aria-busy={busy ? "true" : "false"}
      style={
        {
          ["--fadeOutMs" as any]: `${TIMING.fadeOutMs}ms`,
        } as React.CSSProperties
      }
    >
      <div
        className={`dp-black ${blackIsOn ? "dp-black-on" : "dp-black-off"}`}
      />

      <div className={`dp-center ${centerFadesOut ? "dp-fade-out" : ""}`}>
        <div className="dp-stage dp-chatbox">
          <div className="dp-slot-line1">
            <span className="dp-chat-text">{line1}</span>
            {showCursorLine1 ? (
              <span className="dp-caret is-on is-fast">▍</span>
            ) : null}
          </div>

          <div className="dp-slot-center">
            <span className="dp-chat-text">{goodluck ? goodluck : line2}</span>

            {goodluck ? (
              showCursorGoodluck ? (
                <span className="dp-caret is-on">▍</span>
              ) : null
            ) : showCursorLine2 ? (
              <span className="dp-caret is-on">▍</span>
            ) : null}
          </div>

          <div className="dp-slot-eggrow">
            <div
              className={`dp-egg-wrap ${eggVisible ? "is-visible" : "is-hidden"}`}
            >
              <img
                className="dp-egg-img"
                src={MYSTERY_EGG.sprite}
                alt={MYSTERY_EGG.name}
                style={{
                  width: 160,
                  height: 160,
                  objectFit: "contain",
                  display: "block",
                  margin: "0 auto",
                }}
              />
            </div>

            <div
              className={`dp-bubble ${bubbleVisible ? "is-visible" : "is-hidden"}`}
            >
              <span className="dp-chat-text">{BUBBLE_TEXT}</span>
            </div>
          </div>

          <div className="dp-status">{fatalError ? "Error" : status}</div>

          {fatalError ? (
            <div className="dp-debug">
              <div className="dp-debug-row">
                <span className="dp-dot" />
                <span>Error:</span>
              </div>
              <div className="dp-debug-msg">{fatalError}</div>
              <button
                type="button"
                className="dp-debug-btn"
                onClick={() => navigate("/", { replace: true })}
              >
                Go Home
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
