import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase/client";
import { useAuth } from "../app/providers/useAuth";
import "./PetHomePage.css";

type CooldownState = {
  ends_at: string | null;
  remaining_ms: number;
  ready: boolean;
};
type Cooldowns = {
  feed: CooldownState;
  clean: CooldownState;
  play: CooldownState;
  bond: CooldownState;
};

type ActivePetResponse = {
  server_now: string;
  pet: any | null;
  cooldowns?: Cooldowns | null;
};

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r}s`;
  return `${m}m ${r}s`;
}

export default function PetHomePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<ActivePetResponse | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [busy, setBusy] = useState<null | string>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [authLoading, user, navigate]);

  // tick local clock (for countdown UI)
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  async function load() {
    const apiBase = import.meta.env.VITE_API_URL;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;

    const res = await fetch(`${apiBase}/api/pets/active`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Failed to load pet");
    setData(json as ActivePetResponse);
  }

  useEffect(() => {
    if (authLoading || !user) return;
    let alive = true;

    (async () => {
      try {
        await load();
      } catch (e: any) {
        if (!alive) return;
        setMsg(e?.message ?? "Failed to load");
      }
    })();

    const id = window.setInterval(() => load().catch(() => {}), 15_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [authLoading, user]);

  const pet = data?.pet ?? null;
  const cooldowns = (data?.cooldowns ?? null) as Cooldowns | null;

  const cd = useMemo(() => {
    const calc = (endsAtIso: string | null) => {
      if (!endsAtIso) return 0;
      const t = Date.parse(endsAtIso);
      if (!Number.isFinite(t)) return 0;
      return Math.max(0, t - nowMs);
    };
    return {
      feed: calc(cooldowns?.feed?.ends_at ?? null),
      clean: calc(cooldowns?.clean?.ends_at ?? null),
      bond: calc(cooldowns?.bond?.ends_at ?? null),
      play: calc(cooldowns?.play?.ends_at ?? null),
    };
  }, [cooldowns, nowMs]);

  async function doAction(action: "feed" | "clean" | "bond") {
    setMsg(null);
    setBusy(action);

    try {
      const apiBase = import.meta.env.VITE_API_URL;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not logged in");

      const res = await fetch(`${apiBase}/api/pets/actions/do`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Action failed");

      // refresh view
      await load();
    } catch (e: any) {
      setMsg(e?.message ?? "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="petHome">
      <div className="petHome__top">
        <div className="petHome__title">Pet Room (One Bedroom)</div>
        <div className="petHome__nav">
          <button className="petHome__btn" onClick={() => navigate("/pet")}>
            Back to Pet
          </button>
          <button
            className="petHome__btn"
            onClick={() => navigate("/hatchery")}
          >
            Hatchery
          </button>
        </div>
      </div>

      <div className="petHome__grid">
        {/* ROOM */}
        <div className="room">
          <div className="room__wall" />
          <div className="room__floor" />

          <div className="prop prop--bed">
            <div className="prop__label">Bed</div>
          </div>

          <div className="prop prop--bowl">
            <div className="prop__label">Food Bowl</div>
          </div>

          <div className="prop prop--sink">
            <div className="prop__label">Wash Area</div>
          </div>

          <div className="petAvatar">
            <div className="petAvatar__blob" />
            <div className="petAvatar__name">
              {pet?.is_runaway ? "Gone..." : (pet?.name ?? "Your Pet")}
            </div>
          </div>
        </div>

        {/* PANEL */}
        <div className="panel">
          {!pet ? (
            <div className="panel__empty">
              No pet yet. Go to <b>/create</b> and get your starter egg.
            </div>
          ) : (
            <>
              <div className="panel__header">
                <div className="panel__petName">{pet.name ?? "Your Pet"}</div>
                <div className="panel__meta">
                  <span>Stage: {pet.stage}</span>
                  <span>Line: {pet.line}</span>
                </div>
              </div>

              {pet.is_runaway ? (
                <div className="panel__alert panel__alert--bad">
                  Your pet ran away (no feeding for 3 days).
                </div>
              ) : null}

              <div className="stats">
                <div className="stat">
                  <div className="stat__k">Hunger</div>
                  <div className="stat__v">{pet.hunger}</div>
                </div>
                <div className="stat">
                  <div className="stat__k">Clean</div>
                  <div className="stat__v">{pet.cleanliness}</div>
                </div>
                <div className="stat">
                  <div className="stat__k">Happy</div>
                  <div className="stat__v">{pet.happiness}</div>
                </div>
                <div className="stat">
                  <div className="stat__k">Bond</div>
                  <div className="stat__v">{pet.bond ?? 0}</div>
                </div>
              </div>

              <div className="actions">
                <button
                  className="actionBtn"
                  disabled={!!busy || pet.is_runaway || cd.feed > 0}
                  onClick={() => doAction("feed")}
                >
                  Feed {cd.feed > 0 ? `(${fmt(cd.feed)})` : ""}
                </button>

                <button
                  className="actionBtn"
                  disabled={!!busy || pet.is_runaway || cd.clean > 0}
                  onClick={() => doAction("clean")}
                >
                  Clean {cd.clean > 0 ? `(${fmt(cd.clean)})` : ""}
                </button>

                <button
                  className="actionBtn"
                  disabled={!!busy || pet.is_runaway || cd.bond > 0}
                  onClick={() => doAction("bond")}
                >
                  Sit / Bond {cd.bond > 0 ? `(${fmt(cd.bond)})` : ""}
                </button>
              </div>

              {msg ? <div className="panel__msg">{msg}</div> : null}

              <div className="panel__note">
                Runaway logic: if you don’t feed for <b>3 days</b>, they dip.
                Brutal, but fair.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
