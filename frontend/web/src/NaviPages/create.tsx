import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase/client";
import { useAuth } from "../app/providers/useAuth";
import "./create.css";

type Phase =
  | "fadeInBlack"
  | "typingLine"
  | "showEgg"
  | "fadeOutAll"
  | "goodLuck"
  | "done";

const LINE_1 = "Every bond begins with a chance.";

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
  // Prefer your username from auth metadata if present
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

export default function CreatePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("fadeInBlack");
  const [typed1, setTyped1] = useState("");
  const [typed2, setTyped2] = useState("");
  const [busy, setBusy] = useState(false);

  // Pick starter ONCE per mount
  const starterLine = useMemo(() => pickRandomStarterLine(), []);
  const startedRef = useRef(false);

  const playerName = getPlayerName(user);

  // Guard 1: if logged out, bounce
  useEffect(() => {
    if (!authLoading && !user) navigate("/", { replace: true });
  }, [authLoading, user, navigate]);

  // Guard 2: if already has pet, skip cutscene forever
  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("pets")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) return;

      if (data?.id) navigate("/pet", { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [user, navigate]);

  // Cutscene + pet insert
  useEffect(() => {
    if (!user) return;
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;

    const run = async () => {
      setPhase("fadeInBlack");
      await sleep(450);
      if (cancelled) return;

      setPhase("typingLine");
      await typeText(LINE_1, setTyped1, 35);
      if (cancelled) return;

      await sleep(450);
      if (cancelled) return;

      setPhase("showEgg");
      await sleep(900);
      if (cancelled) return;

      // Create pet row once
      setBusy(true);
      try {
        const hatchReadyAt = new Date(
          Date.now() + 20 * 60 * 1000,
        ).toISOString();

        const { error } = await supabase.from("pets").insert({
          user_id: user.id,
          line: starterLine,
          stage: "egg",
          hatch_ready_at: hatchReadyAt,
        });

        if (error) {
          const msg = String(error.message ?? error);

          // If already created in another tab/session, just continue to /pet
          if (
            msg.toLowerCase().includes("duplicate") ||
            msg.toLowerCase().includes("unique")
          ) {
            navigate("/pet", { replace: true });
            return;
          }

          console.error("Create pet insert failed:", error);
          navigate("/", { replace: true });
          return;
        }
      } finally {
        setBusy(false);
      }

      setPhase("fadeOutAll");
      await sleep(600);
      if (cancelled) return;

      setPhase("goodLuck");
      const line2 = `GoodLuck, ${playerName}`;
      await typeText(line2, setTyped2, 45);
      if (cancelled) return;

      await sleep(600);
      if (cancelled) return;

      setPhase("done");
      navigate("/pet", { replace: true });
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [user, navigate, starterLine, playerName]);

  if (authLoading) return null;

  return (
    <div className="dp-create-root" aria-busy={busy ? "true" : "false"}>
      <div className="dp-black dp-black-on" />

      <div
        className={`dp-center ${phase === "fadeOutAll" ? "dp-fade-out" : ""}`}
      >
        {(phase === "typingLine" || phase === "showEgg") && (
          <div className="dp-line" role="status" aria-live="polite">
            {typed1}
          </div>
        )}

        {phase === "showEgg" && (
          <div className="dp-egg-wrap" aria-hidden="true">
            <div className="dp-egg" />
          </div>
        )}

        {phase === "goodLuck" && (
          <div className="dp-line" role="status" aria-live="polite">
            {typed2}
          </div>
        )}
      </div>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}

async function typeText(
  full: string,
  set: (s: string) => void,
  msPerChar: number,
) {
  set("");
  for (let i = 1; i <= full.length; i++) {
    set(full.slice(0, i));
    await sleep(msPerChar);
  }
}
