import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogoutButton } from "../../../../../components/Authentication/LogoutButton";
import { useAuth } from "../../../../../app/providers/useAuth";
import { useGame } from "../../../../../app/providers/GameProvider";
import { supabase } from "../../../../../lib/supabase/client";
import { DailyCareCard } from "../../../../../DailyQuest/components/DailyCareCard";

// ✅ exists: src/Pets_Design/auth/pets/Designs/stats.css
import "../../Designs/stats.css";

// ✅ exists: src/Pets_Design/auth/pets/StatsModal.tsx
import { StatsModal } from "../../StatsModal";

import {
  useServerCountdown,
  formatDuration,
  fetchActivePet,
} from "../../../Timers/index";

export default function PetPage() {
  const { user, loading: authLoading } = useAuth();
  const game = useGame();
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [activePet, setActivePet] = useState<any | null>(null);

  const [statsOpen, setStatsOpen] = useState(false);

  /* -------------------------------------------
   * AUTH REDIRECT
   * ------------------------------------------- */
  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [authLoading, user, navigate]);

  /* -------------------------------------------
   * LOAD ACTIVE PET + SERVER TIMER DATA
   * ------------------------------------------- */
  useEffect(() => {
    if (authLoading || !user) return;

    let alive = true;

    async function loadActive() {
      const apiBase = import.meta.env.VITE_API_URL;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;

      const data = await fetchActivePet(apiBase, token);
      if (!alive) return;

      setActivePet(data);
    }

    loadActive();
    const id = window.setInterval(loadActive, 30_000);

    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [authLoading, user]);

  /* -------------------------------------------
   * DERIVED STATE
   * ------------------------------------------- */
  const pet = game.pet;

  // ✅ Name is safe even when no pet
  const petName = (pet as any)?.name ?? "Your Pet";

  // ✅ IMPORTANT: No pet = null -> StatsModal will show 0s
  const petStats = pet
    ? {
        hp: Number((pet as any)?.hp ?? (pet as any)?.stat_hp ?? 0),
        atk: Number((pet as any)?.atk ?? (pet as any)?.stat_atk ?? 0),
        def: Number((pet as any)?.def ?? (pet as any)?.stat_def ?? 0),
        magi: Number((pet as any)?.magi ?? (pet as any)?.stat_magi ?? 0),
        spd: Number((pet as any)?.spd ?? (pet as any)?.stat_spd ?? 0),
      }
    : null;

  // ✅ Optional: elements (if you have them on pet later)
  // No pet => null => modal renders all 0s
  const petElements = pet ? ((pet as any)?.elements ?? null) : null;

  // ✅ FIX: useServerCountdown expects { serverNowIso, endsAtIso }
  const hatchEndsAt = activePet?.hatch?.hatch_ends_at ?? null;
  const serverNowIso = activePet?.server_now ?? null;

  const countdown = useServerCountdown(
    hatchEndsAt && serverNowIso
      ? { serverNowIso, endsAtIso: hatchEndsAt }
      : null,
  );

  const msLeft = countdown.remainingMs ?? 0;
  const isReady = countdown.done;

  const prettyLeft = useMemo(() => formatDuration(msLeft), [msLeft]);

  /* -------------------------------------------
   * HATCH (SERVER-AUTHORITATIVE)
   * ------------------------------------------- */
  async function hatchNow() {
    if (!pet) return;
    setMsg(null);
    setBusy(true);

    try {
      const apiBase = import.meta.env.VITE_API_URL;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("No access token");

      const res = await fetch(`${apiBase}/api/pets/hatch`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Hatch failed");

      await game.refresh();
      setMsg("Hatched (stage = sprout)");
    } catch (e: any) {
      setMsg(`Hatch failed: ${e?.message ?? String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  /* -------------------------------------------
   * LOADING GUARD
   * ------------------------------------------- */
  if (authLoading || game.loading) return null;

  /* -------------------------------------------
   * RENDER
   * ------------------------------------------- */
  return (
    <div style={{ padding: 16 }}>
      <h1>Pet Page</h1>

      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <button type="button" onClick={() => navigate("/hatchery")}>
          Hatchery (test)
        </button>
      </div>

      <div style={{ marginTop: 12, maxWidth: 520 }}>
        <DailyCareCard />
      </div>

      {game.error ? (
        <p style={{ color: "crimson" }}>Game load error: {game.error}</p>
      ) : null}

      {!pet ? (
        <div>
          <p>No pet found for this account.</p>
          <button type="button" onClick={() => navigate("/create")}>
            Go to Create
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 12, maxWidth: 520 }}>
          <p style={{ margin: 0 }}>
            <strong>Stage:</strong> {(pet as any).stage}
          </p>
          <p style={{ margin: "6px 0 0" }}>
            <strong>Line:</strong> {(pet as any).line}
          </p>

          {(pet as any).stage === "egg" ? (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
              }}
            >
              <p style={{ margin: 0 }}>
                <strong>Hatch timer:</strong>{" "}
                {isReady ? "Ready to hatch!" : prettyLeft}
              </p>

              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  disabled={!isReady || busy}
                  onClick={hatchNow}
                >
                  {busy ? "Hatching…" : "Hatch Egg"}
                </button>
              </div>
            </div>
          ) : (
            <p style={{ marginTop: 14, opacity: 0.85 }}>
              Sprout is alive. Next: bonding / home / fights.
            </p>
          )}

          {msg ? <p style={{ marginTop: 12 }}>{msg}</p> : null}
        </div>
      )}

      {/* =========================================================
         TEMP DEV BUTTONS — DELETE THIS WHOLE BLOCK WHEN DONE ✅
         ========================================================= */}
      <div
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <button
          type="button"
          className="openStatsBtn"
          onClick={() => {
            if (!pet) console.warn("Stats opened with no pet loaded yet");
            setStatsOpen(true);
          }}
          aria-label="Open Pet Stats (TEMP)"
        >
          📊 Open Stats (TEMP)
        </button>

        <button
          type="button"
          onClick={() => navigate("/create")}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            fontWeight: 700,
            border: "2px solid #ff3b3b",
            background: "rgba(0,0,0,0.75)",
            color: "white",
            cursor: "pointer",
          }}
          aria-label="Replay Cutscene (TEMP)"
        >
          ▶ Replay Cutscene (TEMP)
        </button>
      </div>

      {/* Stats Modal */}
      <StatsModal
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        petName={petName}
        stats={petStats} // ✅ null => zeros
        level={(pet as any)?.level ?? 0}
        elements={petElements} // ✅ null => zeros
      />

      <div style={{ marginTop: 16 }}>
        <LogoutButton />
      </div>
    </div>
  );
}
