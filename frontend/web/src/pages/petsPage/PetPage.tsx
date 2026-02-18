// frontend/web/src/pages/petsPage/PetPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { LogoutButton } from "../../components/Authentication/LogoutButton";
import { useAuth } from "../../app/providers/useAuth";
import { useGame } from "../../app/providers/GameProvider";
import { supabase } from "../../lib/supabase/client";
import { DailyCareCard } from "../../dailyQuest/components/DailyCareCard/DailyCareCard";
import { useUI } from "../../app/providers/UIProvider";

import PetMainStats from "../../Pets_Creation/registry/Stats/mainStats/petMainstats";
import { WeeklyRewardsBar } from "../../components/rewards/weeklyRewardsBar";
import { StatsModal } from "../../Pets_Creation/registry/Stats/mainStats/StatsModal";

import { useServerCountdown } from "../../lib/timers/useServerCountdown";
import { formatDuration } from "../../lib/timers/time";
import { AwardsModal } from "../../components/awardModels/awardsModel";
import { PetPageHeader } from "./components/petPageHeader";
import { PetTempNavButtons } from "./components/petTempNavButtons";
import { EggSection } from "./components/eggSection";

/** -----------------------------
 * Types (kept here for copy/paste)
 * ------------------------------ */

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

/** -----------------------------
 * Helpers
 * ------------------------------ */

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
  if (!res.ok) {
    throw new Error(data?.error ?? `Active pet failed (${res.status})`);
  }

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

/** -----------------------------
 * Component
 * ------------------------------ */

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

  // ✅ personality display name resolved from Supabase if needed
  const [personalityName, setPersonalityName] = useState<string | null>(null);

  /** Redirect if not logged in */
  useEffect(() => {
    if (!authLoading && !user) navigate("/", { replace: true });
  }, [authLoading, user, navigate]);

  /** Nudge game refresh key when auth becomes ready */
  useEffect(() => {
    if (authLoading || !user) return;
    game.bumpRefreshKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  /** Load active pet + poll */
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

        game.bumpRefreshKey();
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

  /** Resolve personality name (frontend-only) */
  useEffect(() => {
    let alive = true;

    async function loadPersonality() {
      setPersonalityName(null);
      if (!pet) return;

      // 1) prefer direct payload fields
      const direct =
        pet?.personality_name ??
        pet?.personalityName ??
        pet?.personality?.name ??
        pet?.personality?.key ??
        (typeof pet?.personality === "string" ? pet.personality : null) ??
        null;

      if (typeof direct === "string" && direct.trim()) {
        setPersonalityName(direct);
        return;
      }

      // 2) resolve by id/key using Supabase table `personalities`
      const pid = pet?.personality_id ?? pet?.personalityId ?? null;
      const pkey = pet?.personality_key ?? pet?.personalityKey ?? null;

      try {
        if (pid) {
          const { data, error } = await supabase
            .from("personalities")
            .select("name,key")
            .eq("id", pid)
            .maybeSingle();

          if (!alive) return;
          if (!error && data) setPersonalityName(data.name ?? data.key ?? null);
          return;
        }

        if (pkey) {
          const { data, error } = await supabase
            .from("personalities")
            .select("name,key")
            .eq("key", pkey)
            .maybeSingle();

          if (!alive) return;
          if (!error && data) setPersonalityName(data.name ?? data.key ?? null);
          return;
        }
      } catch {
        // ignore
      }
    }

    loadPersonality();
    return () => {
      alive = false;
    };
  }, [pet]);

  const activePetId = useMemo(() => {
    const p = petModel ?? (game as any)?.pet ?? null;
    return (
      p?.id ??
      p?.pet_id ??
      p?.petId ??
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

  /** Build the exact model PetMainStats expects */
  const petMainStatsModel = useMemo(() => {
    if (!pet) return null;

    const pts = pet?.points?.total ?? null;
    const base = pet?.stats ?? null;
    const src = pts ?? base ?? pet;

    return {
      name: pet?.name ?? null,

      line: String(pet?.line ?? "null_element"),
      stage: String(pet?.stage ?? "baby"),
      level: Number(pet?.level ?? 1),

      hp_max: Number(pet?.hp_max ?? 0),
      hp_cur: Number(pet?.hp_cur ?? 0),

      hp_stat: Number(src?.hp ?? 0),

      atk: Number(src?.atk ?? 0),
      def: Number(src?.def ?? 0),
      spd: Number(src?.spd ?? 0),
      magi: Number(src?.magi ?? 0),

      // ✅ ADD: mana + personality
      mana: Number(src?.mana ?? pet?.mana ?? 0),
      personality:
        (typeof personalityName === "string" ? personalityName : null) ??
        pet?.personality_name ??
        pet?.personalityName ??
        pet?.personality?.name ??
        pet?.personality_key ??
        pet?.personalityKey ??
        (typeof pet?.personality === "string" ? pet.personality : null) ??
        null,

      gender: pet?.gender ?? "null_gender",

      training:
        pet?.elements ??
        pet?.training ??
        pet?.training_elements ??
        pet?.trainingElements ??
        undefined,
    };
  }, [pet, personalityName]);

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

      await game.bumpRefreshKey();

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

  const statsForModal = (pet?.points?.total ?? pet?.stats ?? null) as
    | any
    | null;
  const elementsForModal = (pet?.elements ?? null) as any | null;

  return (
    <div style={{ padding: 16 }}>
      <PetPageHeader
        activePetId={activePetId ? String(activePetId) : null}
        onOpenRewards={() => setRewardsOpen(true)}
        onOpenAwards={() => setAwardsOpen(true)}
      />

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
          <EggSection
            pet={pet}
            isReady={isReady}
            prettyLeft={prettyLeft}
            busy={busy}
            onHatch={hatchNow}
          />
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

      <PetTempNavButtons
        onOpenStats={() => setStatsOpen(true)}
        onOpenAwards={() => setAwardsOpen(true)}
      />

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
