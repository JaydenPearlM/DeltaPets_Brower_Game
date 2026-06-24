import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clientLog } from "@/lib/debug/clientLogger";
import { useAuth } from "../../app/providers/useAuth";
import { MYSTERY_EGG } from "../../Pets_Creation/assets/eggs/eggType";
import { apiFetch } from "@/lib/api/baseClient";
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

type StarterLine =
  | "water"
  | "fire"
  | "earth"
  | "air"
  | "ice"
  | "storm"
  | "light"
  | "shadow";

type WorldTimeState = "day" | "night";

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

function pickRandomStarterLine(): StarterLine {
  const lines: StarterLine[] = [
    "water",
    "fire",
    "earth",
    "air",
    "ice",
    "storm",
    "light",
    "shadow",
  ];

  return lines[Math.floor(Math.random() * lines.length)];
}

function getWorldTimeState(date = new Date()): WorldTimeState {
  const hour = date.getHours();
  return hour >= 6 && hour < 18 ? "day" : "night";
}

function getPlayerName(user: any) {
  const meta = user?.user_metadata ?? {};
  const fromMeta =
    meta.username || meta.display_name || meta.displayName || meta.name;

  if (typeof fromMeta === "string" && fromMeta.trim()) return fromMeta.trim();

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

export default function CreatePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const starterLine = useMemo(() => pickRandomStarterLine(), []);
  const worldTime = useMemo(() => getWorldTimeState(), []);
  const playerName = useMemo(() => getPlayerName(user), [user]);

  const [phase, setPhase] = useState<Phase>("fadeInBlack");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [goodluck, setGoodluck] = useState("");
  const [eggVisible, setEggVisible] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const runIdRef = useRef(0);

  useEffect(() => {
    const myRunId = ++runIdRef.current;
    const alive = () => runIdRef.current === myRunId;
    const replay =
      new URLSearchParams(window.location.search).get("replay") === "1";

    async function run() {
      setFatalError(null);

      if (authLoading) return;

      if (!user) {
        navigate("/", { replace: true });
        return;
      }

      const GOODLUCK = `"Goodluck, ${playerName}"`;

      setLine1("");
      setLine2("");
      setGoodluck("");
      setEggVisible(false);
      setBubbleVisible(false);

      try {
        setPhase("fadeInBlack");
        await sleep(TIMING.fadeInMs);
        if (!alive()) return;

        setPhase("typeLine1");
        await typeText(LINE_1, setLine1, TIMING.type1MsPerChar, alive);
        if (!alive()) return;

        await sleep(TIMING.pauseAfterLine1Ms);
        if (!alive()) return;

        setPhase("deleteLine1");
        await deleteText(LINE_1, setLine1, TIMING.delete1MsPerChar, alive);
        if (!alive()) return;

        setPhase("pauseBeforeLine2");
        await sleep(TIMING.pauseBeforeLine2Ms);
        if (!alive()) return;

        setPhase("typeLine2");
        await typeText(LINE_2, setLine2, TIMING.type2MsPerChar, alive);
        if (!alive()) return;

        setPhase("eggFadeIn");
        setEggVisible(true);

        await sleep(TIMING.pauseAfterLine2TypedMs);
        if (!alive()) return;

        setPhase("deleteLine2");
        await deleteText(LINE_2, setLine2, TIMING.delete2MsPerChar, alive);
        if (!alive()) return;

        await sleep(TIMING.bubblePopDelayMs);
        if (!alive()) return;

        setPhase("bubblePop");
        setBubbleVisible(true);

        await sleep(450);
        if (!alive()) return;

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

        setPhase("fadeOut");
        await sleep(TIMING.fadeOutMs);
        if (!alive()) return;

        if (!replay) {
          setBusy(true);

          try {
            const requestedLine = "random";

            clientLog("create", "ensure-egg started", "info", {
              line: requestedLine,
            });

            await apiFetch("/api/pets/ensure-egg", {
              method: "POST",
              json: {
                line: requestedLine,
                worldTime,
              },
            });

            clientLog("create", "ensure-egg success", "info", {
              line: requestedLine,
            });

            apiFetch("/api/me/intro/seen", {
              method: "POST",
              json: {},
            }).catch((err) => {
              clientLog("create", "intro-seen failed", "error", {
                error: err?.message ?? String(err),
              });
            });
          } catch (err: any) {
            console.error("[create] ensure-egg failed:", err);

            clientLog("create", "ensure-egg failed", "error", {
              error: err?.message ?? String(err),
            });

            if (alive()) {
              setBusy(false);
              setFatalError(
                err?.message ?? "Failed to create your egg. Please try again.",
              );
            }

            return;
          }

          if (alive()) setBusy(false);
        }

        if (!alive()) return;

        setPhase("done");
        navigate("/hatchery", { replace: true });
      } catch (err: any) {
        console.error("[create] cutscene crashed:", err);

        clientLog("create", "cutscene crashed", "error", {
          error: err?.message ?? String(err),
        });

        if (alive()) {
          setFatalError(err?.message ?? "Cutscene crashed");
        }
      }
    }

    run();

    return () => {
      if (runIdRef.current === myRunId) runIdRef.current++;
    };
  }, [
    authLoading,
    user,
    navigate,
    playerName,
    starterLine,
    worldTime,
    retryCount,
  ]);

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
              className={`dp-egg-wrap ${
                eggVisible ? "is-visible" : "is-hidden"
              }`}
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
              className={`dp-bubble ${
                bubbleVisible ? "is-visible" : "is-hidden"
              }`}
            >
              <span className="dp-chat-text">{BUBBLE_TEXT}</span>
            </div>
          </div>

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
                onClick={() => setRetryCount((c) => c + 1)}
              >
                Retry
              </button>
              <button
                type="button"
                className="dp-debug-btn"
                style={{ marginLeft: 8 }}
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
