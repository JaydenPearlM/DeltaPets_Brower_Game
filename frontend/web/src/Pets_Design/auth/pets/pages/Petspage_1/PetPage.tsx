import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogoutButton } from "../../../../../components/Authentication/LogoutButton";
import { useAuth } from "../../../../../app/providers/useAuth";
import { useGame } from "../../../../../app/providers/GameProvider";
import { supabase } from "../../../../../lib/supabase/client";
import { DailyCareCard } from "../../../../../dailyQuest/components/DailyCareCard";
import { useUI } from "../../../../../app/providers/UIProvider";
import PetMainStats from "../../../../../components/petMainstats";

import "../../Designs/stats.css";
import { StatsModal } from "../../Stats/StatsModal";
import { useServerCountdown, formatDuration } from "../../../Timers/index";

type PetStatsRow = {
  pet_id: string;
  hp: number;
  atk: number;
  magi: number;
  def: number;
  spd: number;
  mana: number;
  base_total: number;
};

type PetElementsRow = {
  pet_id: string;
  null: number;
  water: number;
  fire: number;
  earth: number;
  air: number;
  ice: number;
  storm: number;
  light: number;
  shadow: number;
};

type PetPointsBundle = {
  base: PetStatsRow;
  alloc: { hp: number; atk: number; magi: number; def: number; spd: number };
  total: {
    hp: number;
    atk: number;
    magi: number;
    def: number;
    spd: number;
    mana: number;
  };
  total_points: number;
} | null;

type ActivePetResponse = {
  server_now: string;
  pet: any | null;

  hatch?: {
    ready: boolean;
    hatch_ends_at: string | null;
    hatch_remaining_ms: number;
  } | null;

  stats: PetStatsRow | null;
  points?: PetPointsBundle;

  elements: PetElementsRow | null;
  cooldowns?: any | null;
};

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  const token = data.session?.access_token;
  if (!token) throw new Error("Missing access token. Are you logged in?");
  return token;
}

async function fetchActive(): Promise<ActivePetResponse> {
  const token = await getAccessToken();

  const res = await fetch("/api/pets/active", {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });

  const data = (await res.json().catch(() => ({}))) as any;
  if (!res.ok)
    throw new Error(data?.error ?? `Active pet failed (${res.status})`);
  return data as ActivePetResponse;
}

function mergePetModel(resp: ActivePetResponse | null) {
  if (!resp?.pet) return null;

  return {
    ...resp.pet,
    stats: resp.stats ?? null,
    points: resp.points ?? null,
    elements: resp.elements ?? null,
    server_now: resp.server_now,
    hatch: resp.hatch ?? null,
  };
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "8px 10px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <span style={{ fontWeight: 800 }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function EggBaseStatsCard({ stats }: { stats: PetStatsRow | null }) {
  if (!stats) return null;

  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12,
      }}
    >
      <p style={{ margin: 0, fontWeight: 800 }}>Selected Egg Stats</p>
      <p style={{ margin: "6px 0 10px", opacity: 0.8 }}>
        These are the egg’s base stats (total should be 10).
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 8,
        }}
      >
        <StatRow label="HP" value={stats.hp} />
        <StatRow label="ATK" value={stats.atk} />
        <StatRow label="DEF" value={stats.def} />
        <StatRow label="SPD" value={stats.spd} />
        <StatRow label="MAGI" value={stats.magi} />
        <StatRow label="MANA" value={stats.mana} />
      </div>

      <div style={{ marginTop: 10, opacity: 0.85 }}>
        <strong>Total:</strong> {stats.base_total}
      </div>

      <div style={{ marginTop: 10, opacity: 0.7 }}>
        On hatch (Level 1), the game will apply{" "}
        <strong>+7 random points</strong>.
      </div>
    </div>
  );
}

export default function PetPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const game = useGame();
  const { openInventory } = useUI();

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [activeResp, setActiveResp] = useState<ActivePetResponse | null>(null);
  const [petModel, setPetModel] = useState<any | null>(null);

  const [statsOpen, setStatsOpen] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/", { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (authLoading || !user) return;
    game.refresh?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading || !user) return;

    let alive = true;

    async function load() {
      setLoadErr(null);
      try {
        const resp = await fetchActive();
        if (!alive) return;

        console.group("📡 [active] Response");
        console.log("raw =", resp);
        console.log("resp.pet =", resp?.pet);
        console.log("resp.stats (base) =", resp?.stats);
        console.log("resp.points (total) =", resp?.points);
        console.groupEnd();

        setActiveResp(resp);
        setPetModel(mergePetModel(resp));

        game.refresh?.();
      } catch (e: any) {
        if (!alive) return;
        setLoadErr(e?.message ?? String(e));
      }
    }

    load();
    const id = window.setInterval(load, 30_000);

    return () => {
      alive = false;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const pet = (petModel ?? (game as any)?.pet ?? null) as any | null;
  const petName = pet?.name ?? "Your Pet";

  const petStats = useMemo(() => {
    const pts = pet?.points?.total;
    const base = pet?.stats;

    const s = pts ?? base ?? null;
    if (!s) return null;

    return {
      hp: Number(s.hp ?? 0),
      atk: Number(s.atk ?? 0),
      def: Number(s.def ?? 0),
      magi: Number(s.magi ?? 0),
      spd: Number(s.spd ?? 0),
    };
  }, [pet]);

  const petElements = null;

  const hatchEndsAt =
    activeResp?.hatch?.hatch_ends_at ?? pet?.hatch_ends_at ?? null;
  const serverNowIso = activeResp?.server_now ?? pet?.server_now ?? null;

  const countdown = useServerCountdown(
    hatchEndsAt && serverNowIso
      ? { serverNowIso, endsAtIso: hatchEndsAt }
      : null,
  );

  const msLeft = countdown.remainingMs ?? 0;
  const isReady = countdown.done;
  const prettyLeft = useMemo(() => formatDuration(msLeft), [msLeft]);

  // ✅ FIXED: PetMainStats must use HP STAT points from resp.points.total.hp, not hp_cur snapshot.
  const petMainStatsModel = useMemo(() => {
    if (!pet) return null;

    // Real HP snapshot values (for real HP UI elsewhere)
    const hpMax = Number(pet?.hp_max ?? 0);
    const hpCur = Number(pet?.hp_cur ?? 0);

    // Stat points: totals if available, else base, else fallback
    const pts = pet?.points?.total ?? null;
    const base = pet?.stats ?? null;
    const src = pts ?? base ?? pet;

    return {
      name: pet?.name ?? null,
      line: String(pet?.line ?? "null_element"),
      level: Number(pet?.level ?? 1),

      hp_max: hpMax,
      hp_cur: hpCur,

      // ✅ THIS is the HP number used in "Main Stats" + Total = (hp+atk+def+spd+magi)
      hp_stat: Number(src?.hp ?? 0),

      atk: Number(src?.atk ?? 0),
      def: Number(src?.def ?? 0),
      spd: Number(src?.spd ?? 0),
      magi: Number(src?.magi ?? 0),

      gender: pet?.gender ?? "null_gender",

      training:
        pet?.training ??
        pet?.training_elements ??
        pet?.trainingElements ??
        undefined,
    };
  }, [pet]);

  async function hatchNow() {
    if (!pet) return;
    setMsg(null);
    setBusy(true);

    try {
      const token = await getAccessToken();

      const res = await fetch("/api/pets/hatch", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });

      const body = await res.json().catch(() => ({}));

      console.group("🥚 [HATCH RESPONSE]");
      console.log("status =", res.status);
      console.log("body =", body);
      console.groupEnd();

      if (!res.ok) throw new Error((body as any)?.error ?? "Hatch failed");

      await game.refresh?.();

      const resp = await fetchActive();
      setActiveResp(resp);
      setPetModel(mergePetModel(resp));

      setMsg("Hatched ✅");
    } catch (e: any) {
      setMsg(`Hatch failed: ${e?.message ?? String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || (game as any)?.loading) return null;

  return (
    <div style={{ padding: 16 }}>
      <h1>Pet Page</h1>

      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <button type="button" onClick={() => navigate("/hatchery")}>
          Hatchery (test)
        </button>
      </div>

      {loadErr ? (
        <p style={{ color: "crimson", marginTop: 10 }}>Load error: {loadErr}</p>
      ) : null}

      <div style={{ marginTop: 12, maxWidth: 520 }}>
        <DailyCareCard />
      </div>

      <div
        style={{
          marginTop: 12,
          marginLeft: -200,
          marginRight: -16,
          width: "calc(100vw)",
        }}
      >
        <PetMainStats pet={petMainStatsModel} />
      </div>

      {!pet ? (
        <div>
          <p>No pet found for this account.</p>
        </div>
      ) : (
        <div style={{ marginTop: 12, maxWidth: 820 }}>
          <p style={{ margin: 0 }}>
            <strong>Stage:</strong> {pet.stage}
          </p>

          {/* Real HP snapshot */}
          <p style={{ margin: "6px 0 0" }}>
            <strong>HP:</strong> {Number(pet?.hp_cur ?? 0)} /{" "}
            {Number(pet?.hp_max ?? 0)}
          </p>

          {/* Debug total points (canonical) */}
          {pet?.points?.total_points != null ? (
            <p style={{ margin: "6px 0 0", opacity: 0.85 }}>
              <strong>Total Stat Points:</strong> {pet.points.total_points}
              {"  "}
              <small style={{ opacity: 0.8 }}>
                (egg base 10 + IV 7 at hatch)
              </small>
            </p>
          ) : null}

          {pet.stage === "egg" ? (
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

              <EggBaseStatsCard stats={pet?.stats ?? null} />
            </div>
          ) : (
            <p style={{ marginTop: 14, opacity: 0.85 }}>
              Baby is alive. Next: bonding / home / fights.
            </p>
          )}

          {msg ? <p style={{ marginTop: 12 }}>{msg}</p> : null}
        </div>
      )}

      <button
        type="button"
        onClick={openInventory}
        style={{
          padding: "10px 14px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.18)",
          background: "rgba(255,255,255,0.06)",
          color: "rgba(255,255,255,0.92)",
          cursor: "pointer",
          fontWeight: 800,
          marginTop: 16,
        }}
      >
        Inventory (temp)
      </button>

      <button
        onClick={() => navigate("/inventory")}
        style={{
          marginTop: 12,
          padding: "10px 14px",
          borderRadius: 12,
          fontWeight: 700,
          border: "1px solid rgba(255,255,255,0.2)",
          background: "rgba(255,255,255,0.08)",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        🧳 Inventory (TEST)
      </button>

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
          onClick={() => navigate("/home")}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            fontWeight: 700,
            border: "2px dashed #4caf50",
            background: "rgba(0,0,0,0.75)",
            color: "white",
            cursor: "pointer",
          }}
          aria-label="Go to Pet Home (TEMP)"
        >
          🏠 Pet Home (TEMP)
        </button>

        <button
          type="button"
          onClick={() => navigate("/gym")}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            fontWeight: 700,
            border: "2px dashed #ff9800",
            background: "rgba(0,0,0,0.75)",
            color: "white",
            cursor: "pointer",
          }}
          aria-label="Go to Gym (TEMP)"
        >
          🏋️ Gym (TEMP)
        </button>

        <button
          type="button"
          className="openStatsBtn"
          onClick={() => setStatsOpen(true)}
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

      <StatsModal
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        petName={petName}
        stats={petStats}
        level={pet?.level ?? 0}
        elements={petElements}
      />

      <div style={{ marginTop: 16 }}>
        <LogoutButton />
      </div>
    </div>
  );
}
