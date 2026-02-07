import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogoutButton } from "../../../../../components/Authentication/LogoutButton";
import { useAuth } from "../../../../../app/providers/useAuth";
import { useGame } from "../../../../../app/providers/GameProvider";
import { supabase } from "../../../../../lib/supabase/client";
import { DailyCareCard } from "../../../../../dailyQuest/components/DailyCareCard";
import { useUI } from "../../../../../app/providers/UIProvider";
import PetMainStats from "../../../../../components/petMainstats";

// ✅ exists: src/Pets_Design/auth/pets/Designs/stats.css
import "../../Designs/stats.css";

// ✅ exists: src/Pets_Design/auth/pets/StatsModal.tsx
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

type ActivePetResponse = {
  server_now: string;
  pet: any | null;
  // NOTE: /api/pets/active returns cooldowns, not hatch.
  // Keep hatch optional for compatibility (it will be null/undefined).
  hatch?: {
    ready: boolean;
    hatch_ends_at: string | null;
    hatch_remaining_ms: number;
  } | null;
  stats: PetStatsRow | null;
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

/**
 * Merge server response into a "pet row" that the UI can consume easily.
 * PetMainStats + StatsModal should NOT depend on response shape.
 */
function mergePetModel(resp: ActivePetResponse | null) {
  if (!resp?.pet) return null;

  const stats = resp.stats ?? null;
  const elements = resp.elements ?? null;

  return {
    ...resp.pet,
    stats,
    elements,
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

  // AUTH REDIRECT
  useEffect(() => {
    if (!authLoading && !user) navigate("/", { replace: true });
  }, [authLoading, user, navigate]);

  // Kick GameProvider once after login
  useEffect(() => {
    if (authLoading || !user) return;
    game.refresh?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  // LOAD ACTIVE PET
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
        console.log("resp.stats =", resp?.stats);
        console.log("resp.elements =", resp?.elements);
        console.log("resp.server_now =", resp?.server_now);
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

  // SOURCE OF TRUTH
  const pet = (petModel ?? (game as any)?.pet ?? null) as any | null;

  useEffect(() => {
    console.group("🐣 [PetPage] Pet Debug");
    console.log("game.pet =", (game as any)?.pet);
    console.log("activeResp =", activeResp);
    console.log("petModel =", petModel);
    console.log("pet used =", pet);
    console.groupEnd();
  }, [game, activeResp, petModel, pet]);

  const petName = pet?.name ?? "Your Pet";

  const petStats = useMemo(() => {
    const s = pet?.stats ?? null;
    if (s) {
      return {
        hp: Number(s.hp ?? 0),
        atk: Number(s.atk ?? 0),
        def: Number(s.def ?? 0),
        magi: Number(s.magi ?? 0),
        spd: Number(s.spd ?? 0),
      };
    }
    if (!pet) return null;
    return {
      hp: Number(pet?.hp ?? pet?.stat_hp ?? 0),
      atk: Number(pet?.atk ?? pet?.stat_atk ?? 0),
      def: Number(pet?.def ?? pet?.stat_def ?? 0),
      magi: Number(pet?.magi ?? pet?.stat_magi ?? 0),
      spd: Number(pet?.spd ?? pet?.stat_spd ?? 0),
    };
  }, [pet]);

  // 🔒 DO NOT REVEAL ELEMENTS TO PLAYER
  // const petElements = pet?.elements ?? null;
  const petElements = null;

  // Timer fields (from server OR pet row)
  const hatchEndsAt =
    activeResp?.hatch?.hatch_ends_at ?? pet?.hatch_ends_at ?? null;
  const serverNowIso = activeResp?.server_now ?? null;

  const countdown = useServerCountdown(
    hatchEndsAt && serverNowIso
      ? { serverNowIso, endsAtIso: hatchEndsAt }
      : null,
  );

  const msLeft = countdown.remainingMs ?? 0;
  const isReady = countdown.done;
  const prettyLeft = useMemo(() => formatDuration(msLeft), [msLeft]);

  const petMainStatsModel = useMemo(() => {
    if (!pet) return null;

    const s = pet?.stats ?? null;
    const hpValue = Number((s?.hp ?? pet?.hp ?? pet?.stat_hp ?? 0) as any);

    const hpMax =
      Number(pet?.hp_max ?? pet?.hpMax ?? pet?.stat_hp_max ?? 0) || hpValue;

    const hpCur =
      Number(pet?.hp_cur ?? pet?.hpCur ?? pet?.stat_hp_cur ?? 0) || hpValue;

    const training =
      pet?.training ??
      pet?.training_elements ??
      pet?.trainingElements ??
      undefined;

    return {
      name: pet?.name ?? null,
      // still pass line internally if your component uses it, but we removed element display inside the component earlier
      line: String(pet?.line ?? "null_element"),
      level: Number(pet?.level ?? 1),

      hp_max: hpMax,
      hp_cur: hpCur,

      atk: Number((s?.atk ?? pet?.atk ?? pet?.stat_atk ?? 0) as any),
      def: Number((s?.def ?? pet?.def ?? pet?.stat_def ?? 0) as any),
      spd: Number((s?.spd ?? pet?.spd ?? pet?.stat_spd ?? 0) as any),
      magi: Number((s?.magi ?? pet?.magi ?? pet?.stat_magi ?? 0) as any),

      training,
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
      console.log("body.pet =", (body as any)?.pet);
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

      {(game as any)?.error ? (
        <p style={{ color: "crimson" }}>
          Game load error: {(game as any)?.error}
        </p>
      ) : null}

      {!pet ? (
        <div>
          <p>No pet found for this account.</p>
        </div>
      ) : (
        <div style={{ marginTop: 12, maxWidth: 820 }}>
          <p style={{ margin: 0 }}>
            <strong>Stage:</strong> {pet.stage}
          </p>

          {/* 🔒 Removed: do NOT show the pet's element/line */}
          {/* <p style={{ margin: "6px 0 0" }}>
            <strong>Line:</strong> {pet.line}
          </p> */}

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

              {/* ✅ show egg base stats here */}
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

      {/* =========================================================
         TEMP DEV BUTTONS — DELETE THIS WHOLE BLOCK WHEN DONE ✅
         ========================================================= */}
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

      {/* Stats Modal */}
      <StatsModal
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        petName={petName}
        stats={petStats}
        level={pet?.level ?? 0}
        elements={petElements} // ✅ forced null
      />

      <div style={{ marginTop: 16 }}>
        <LogoutButton />
      </div>
    </div>
  );
}
