import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogoutButton } from "../../../../../components/Authentication/LogoutButton";
import { useAuth } from "../../../../../app/providers/useAuth";
import { useGame } from "../../../../../app/providers/GameProvider";
import { supabase } from "../../../../../lib/supabase/client";
import { DailyCareCard } from "../../../../../dailyQuest/components/DailyCareCard";
import { useUI } from "../../../../../app/providers/UIProvider";
import PetMainStats from "../../../../../components/petMainstats";
import { WeeklyRewardsBar } from "../../../../../components/rewards/weeklyRewardsBar";

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
  null_element: number;
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

/** ============================
 *  Awards Modal (inline)
 *  ============================ */

type AwardRow = {
  id: string;
  name: string;
  type: "ribbon" | "trophy";
  icon_url: string | null;
  rarity: string | null;
};

type PetAwardRow = {
  id: string;
  earned_at: string;
  awards: AwardRow | null; // joined
};

function AwardsModal({
  petId,
  onClose,
}: {
  petId: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PetAwardRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr(null);

      const { data, error } = await supabase
        .from("pet_awards")
        .select(
          `
            id,
            earned_at,
            awards:award_id (
              id,
              name,
              type,
              icon_url,
              rarity
            )
          `,
        )
        .eq("pet_id", petId)
        .order("earned_at", { ascending: false });

      if (!alive) return;

      if (error) {
        setErr(error.message);
        setRows([]);
      } else {
        setRows(((data as any) ?? []) as PetAwardRow[]);
      }

      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [petId]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10001,
        padding: 16,
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(950px, 100%)",
          borderRadius: 16,
          padding: 14,
          background: "rgba(10, 16, 28, 0.95)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 10,
          }}
        >
          <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>
            🎀 Ribbons & Trophies
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.92)",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Close
          </button>
        </div>

        {loading ? <p>Loading awards…</p> : null}
        {err ? <p style={{ color: "crimson" }}>{err}</p> : null}

        {!loading && !err && rows.length === 0 ? (
          <p style={{ opacity: 0.9 }}>
            No awards yet. Go commit violence in the arena 😈
          </p>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
            marginTop: 12,
          }}
        >
          {rows.map((r) => {
            const a = r.awards;
            return (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(0,0,0,0.25)",
                }}
              >
                {a?.icon_url ? (
                  <img
                    src={a.icon_url}
                    alt={a.name}
                    style={{
                      width: 52,
                      height: 52,
                      objectFit: "contain",
                      borderRadius: 12,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.08)",
                    }}
                  />
                )}

                <div>
                  <div style={{ fontWeight: 900 }}>
                    {a?.name ?? "Unknown Award"}
                  </div>
                  <div style={{ opacity: 0.85, fontSize: 12 }}>
                    {(a?.type ?? "ribbon") + " • " + (a?.rarity ?? "common")}
                  </div>
                  <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>
                    Earned: {new Date(r.earned_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
  const [rewardsOpen, setRewardsOpen] = useState(false);
  const [awardsOpen, setAwardsOpen] = useState(false);

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

  const activePetId = useMemo(() => {
    const p = petModel ?? (game as any)?.pet ?? null;
    return (
      p?.id ??
      p?.pet_id ??
      p?.petId ??
      p?.petID ??
      p?.petID ??
      activeResp?.pet?.id ??
      activeResp?.pet?.pet_id ??
      null
    );
  }, [petModel, game, activeResp]);

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

  const petMainStatsModel = useMemo(() => {
    if (!pet) return null;

    const pts = pet?.points?.total ?? null;
    const base = pet?.stats ?? null;
    const src = pts ?? base ?? pet;

    return {
      name: pet?.name ?? null,

      // ✅ display these now
      line: String(pet?.line ?? "null_element"),
      stage: String(pet?.stage ?? "baby"),
      level: Number(pet?.level ?? 1),

      // health bar snapshot (optional UI use)
      hp_max: Number(pet?.hp_max ?? 0),
      hp_cur: Number(pet?.hp_cur ?? 0),

      // ✅ HP STAT used to compute “Baby HP”
      hp_stat: Number(src?.hp ?? 0),

      atk: Number(src?.atk ?? 0),
      def: Number(src?.def ?? 0),
      spd: Number(src?.spd ?? 0),
      magi: Number(src?.magi ?? 0),

      gender: pet?.gender ?? "null_gender",

      // ✅ training values come from pet_elements row
      training:
        pet?.elements ??
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

  // ✅ StatsModal wants a stats-like object (hp/atk/magi/def/spd)
  const statsForModal = (pet?.points?.total ?? pet?.stats ?? null) as
    | any
    | null;

  const elementsForModal = (pet?.elements ?? null) as any | null;

  return (
    <div style={{ padding: 16 }}>
      <h1>User and Pets Page (gotta find a new name for this page.)</h1>

      <div
        style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}
      >
        <button type="button" onClick={() => navigate("/hatchery")}>
          Hatchery (test)
        </button>

        <button type="button" onClick={() => setRewardsOpen(true)}>
          🎁 Daily Rewards
        </button>

        <button
          type="button"
          className="dp-tab"
          onClick={() => setAwardsOpen(true)}
          disabled={!activePetId}
          title={!activePetId ? "No active pet yet" : "View ribbons & trophies"}
        >
          🎀 Ribbons
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
          {/* Egg flow stays here */}
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
            <p style={{ marginTop: 14, opacity: 0.85 }}>Baby is alive.</p>
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
          onClick={() => navigate("/secretHaven")}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            fontWeight: 700,
            border: "2px dashed #4caf50",
            background: "rgba(0,0,0,0.75)",
            color: "white",
            cursor: "pointer",
          }}
          aria-label="Go to Pet Secret Haven (TEMP)"
        >
          🏠 Pet Secret Haven (TEMP)
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

      {rewardsOpen && (
        <div
          onClick={() => setRewardsOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(1150px, 100%)",
              borderRadius: 16,
              padding: 14,
              background: "rgba(10, 16, 28, 0.95)",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 10,
              }}
            >
              <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>
                Daily Rewards
              </div>

              <button
                type="button"
                onClick={() => setRewardsOpen(false)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.92)",
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                Close
              </button>
            </div>

            <WeeklyRewardsBar />
          </div>
        </div>
      )}

      {awardsOpen && activePetId ? (
        <AwardsModal
          petId={String(activePetId)}
          onClose={() => setAwardsOpen(false)}
        />
      ) : null}

      {/* ✅ FIXED: pass real pet info, not activePetId (string) */}
      <StatsModal
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        petName={pet?.name ?? null}
        level={Number(pet?.level ?? 1)}
        stats={statsForModal ?? undefined}
        elements={elementsForModal ?? undefined}
      />

      <div style={{ marginTop: 16 }}>
        <LogoutButton />
      </div>
    </div>
  );
}
