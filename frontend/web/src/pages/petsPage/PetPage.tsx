import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PetDetailsPanel from "./components/petDetailsPanel/PetDetailsPanel";
import { useAuth } from "../../app/providers/useAuth";
import { supabase } from "@/lib/supabase/client";
import {
  addCareItem,
  consumeCareItem,
  ensureStarterCareInventory,
  getCareItemCount,
  getInventoryChangeEventName,
  type CareInventoryCategory,
} from "../../components/inventory/inventory";
import "./PetPage.css";

type CareAction = "feed" | "clean" | "play" | "pet";

type StatKey = "hp" | "atk" | "magi" | "def" | "spd" | "mana";

type PetRecord = {
  id?: string;
  user_id?: string;
  name?: string | null;
  nickname?: string | null;
  level?: number | null;
  gender?: string | null;
  element?: string | null;
  line?: string | null;
  stage?: string | null;

  personality?: string | null;
  personality_name?: string | null;
  personality_key?: string | null;
  personality_id?: string | null;

  hunger?: number | null;
  cleanliness?: number | null;
  happiness?: number | null;
  comfort?: number | null;
  rest?: number | null;
  energy?: number | null;
  bond?: number | null;

  description?: string | null;
  is_active?: boolean | null;
  growth_strong_stats?: StatKey[] | null;
  growth_weak_stat?: StatKey | null;
  hatch_time_alignment?: string | null;

  image_url?: string | null;
  sprite_url?: string | null;
  portrait_url?: string | null;
};

type PetStatsRow = {
  pet_id?: string;
  hp?: number | null;
  atk?: number | null;
  def?: number | null;
  spd?: number | null;
  magi?: number | null;
  mana?: number | null;
  base_total?: number | null;
};

type PetElementsRow = {
  pet_id?: string;
  null?: number | null;
  water?: number | null;
  fire?: number | null;
  earth?: number | null;
  air?: number | null;
  ice?: number | null;
  storm?: number | null;
  light?: number | null;
  shadow?: number | null;
};

type CareCurrentResponse = {
  pet?: PetRecord | null;
  stats?: PetStatsRow | null;
  total_points?: number | null;
  hp_display?: number | null;
  elements?: PetElementsRow | null;
  team?: TeamCardPet[];
  error?: string;
};

type TeamCardPet = {
  id: string;
  slotIndex: number;
  species: string;
  nickname: string;
  stage: string;
  stageKey: string;
  element: string;
  elementKey: string;
  personality: string;
  level: number;
  isActive: boolean;
  previewUrl: string | null;
};

const ELEMENT_ORDER: Array<keyof Omit<PetElementsRow, "pet_id">> = [
  "null",
  "water",
  "fire",
  "earth",
  "air",
  "ice",
  "storm",
  "light",
  "shadow",
];

const STAT_ORDER: StatKey[] = ["hp", "atk", "def", "spd", "magi", "mana"];

const STAT_LABELS: Record<StatKey, string> = {
  hp: "HP",
  atk: "ATK",
  def: "DEF",
  spd: "SPD",
  magi: "MAGI",
  mana: "MANA",
};

function isStatKey(value: unknown): value is StatKey {
  return typeof value === "string" && STAT_ORDER.includes(value as StatKey);
}

function getPetGrowthTraits(pet: PetRecord | null, stats: PetStatsRow | null) {
  const savedStrong = Array.isArray(pet?.growth_strong_stats)
    ? pet.growth_strong_stats.filter(isStatKey)
    : [];

  const savedWeak = isStatKey(pet?.growth_weak_stat)
    ? pet.growth_weak_stat
    : null;

  if (savedStrong.length || savedWeak) {
    return {
      strongStats: savedStrong,
      weakStat: savedWeak,
      source: "saved" as const,
    };
  }

  const statValues: Array<{ key: StatKey; value: number }> = [
    { key: "hp", value: safeNum(stats?.hp) },
    { key: "atk", value: safeNum(stats?.atk) },
    { key: "def", value: safeNum(stats?.def) },
    { key: "spd", value: safeNum(stats?.spd) },
    { key: "magi", value: safeNum(stats?.magi) },
    { key: "mana", value: safeNum(stats?.mana) },
  ];

  const sorted = [...statValues].sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value;
    return STAT_ORDER.indexOf(a.key) - STAT_ORDER.indexOf(b.key);
  });

  const strongestValue = sorted[0]?.value ?? 0;
  const weakestValue = sorted[sorted.length - 1]?.value ?? 0;

  const strongStats =
    strongestValue > 0
      ? sorted
          .filter((row) => row.value === strongestValue)
          .slice(0, 2)
          .map((row) => row.key)
      : [];

  const weakStat =
    sorted.length > 0 && weakestValue < strongestValue
      ? ([...sorted]
          .reverse()
          .find(
            (row: { key: StatKey; value: number }) =>
              row.value === weakestValue,
          )?.key ?? null)
      : null;

  return {
    strongStats,
    weakStat,
    source: "derived" as const,
  };
}

function getElementThemeKey(pet: PetRecord | null) {
  return normalizeElement(pet?.element || pet?.line);
}

function clampPercent(value: unknown) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function safeNum(value: unknown, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

function titleCase(value: string | null | undefined) {
  if (!value) return "";

  return String(value)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeElement(value: string | null | undefined) {
  if (!value) return "null";

  const v = String(value).trim().toLowerCase().replace(/\s+/g, "_");

  if (v === "null_element") return "null";
  if (ELEMENT_ORDER.includes(v as keyof Omit<PetElementsRow, "pet_id">)) {
    return v;
  }

  return "null";
}

async function getAccessTokenSafe() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message || "Failed to read auth session.");
  }

  return data.session?.access_token ?? null;
}

function getPetLabel(pet: PetRecord | null) {
  return pet?.nickname?.trim() || pet?.name?.trim() || "Your Delta";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getPetPageDescription(pet: PetRecord | null) {
  if (!pet) {
    return "No active Delta is currently placed. Once you set a pet as active, its details will show here.";
  }

  const nickname = pet.nickname?.trim();
  const speciesName = pet.name?.trim();
  const rawDescription =
    pet.description?.trim() ||
    "Your pet is quietly observing the world around it.";

  if (!nickname || !speciesName) {
    return rawDescription;
  }

  const speciesRegex = new RegExp(`\\b${escapeRegExp(speciesName)}\\b`, "gi");
  return rawDescription.replace(speciesRegex, nickname);
}

function getTeamDisplayName(teamPet: TeamCardPet) {
  return teamPet.nickname?.trim() || teamPet.species;
}

function getTeamElementKey(teamPet: TeamCardPet | null) {
  if (!teamPet) return "silver";
  return normalizeElement(teamPet.elementKey || teamPet.element || "null");
}

function buildArcId(raw: string) {
  return `petRepoArc-${raw.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

function TeamOrbTextRing({
  pathId,
  label,
  elementKey,
}: {
  pathId: string;
  label: string;
  elementKey: string;
}) {
  return (
    <svg className="petRepoTeamArcSvg" viewBox="0 0 214 214" aria-hidden="true">
      <defs>
        <path id={pathId} d="M 6 107 A 101 101 0 0 1 208 107" />
      </defs>

      <text className={`petRepoTeamArcText petRepoTeamArcText--${elementKey}`}>
        <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
          {label}
        </textPath>
      </text>
    </svg>
  );
}

export default function PetPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [pet, setPet] = useState<PetRecord | null>(null);
  const [stats, setStats] = useState<PetStatsRow | null>(null);
  const [elements, setElements] = useState<PetElementsRow | null>(null);
  const [team, setTeam] = useState<TeamCardPet[]>([]);

  const [busy, setBusy] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [personalityName, setPersonalityName] = useState<string | null>(null);

  const [nicknameDraft, setNicknameDraft] = useState("");
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [showNicknameEditor, setShowNicknameEditor] = useState(false);
  const [careInventoryCounts, setCareInventoryCounts] = useState({
    food: 0,
    soap: 0,
    toy: 0,
    bed: 0,
  });

  const hasLoadedOnceRef = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/", { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    ensureStarterCareInventory();
  }, []);

  const loadPetPage = useCallback(
    async (showSpinner: boolean) => {
      if (!user) return;

      if (showSpinner) {
        setLoadingPage(true);
        console.log("[pet] PetPage mounted");
      }

      setLoadErr(null);

      try {
        const token = await getAccessTokenSafe();

        if (!token) {
          throw new Error("You are not authenticated.");
        }

        if (showSpinner) {
          console.log("[pet] GET /api/care/current");
        }

        const res = await fetch("/api/care/current", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json = (await res
          .json()
          .catch(() => ({}))) as CareCurrentResponse;

        if (!res.ok) {
          throw new Error(json.error || "Failed to load pet page.");
        }

        const nextPet = json.pet ?? null;
        const nextStats = json.stats ?? null;
        const nextElements = json.elements ?? null;
        const nextTeam = json.team ?? [];

        setPet(nextPet);
        setStats(nextStats);
        setElements(nextElements);
        setTeam(nextTeam);
        setNicknameDraft(nextPet?.nickname?.trim() || "");

        // do NOT auto-open nickname editor anymore
        setShowNicknameEditor(false);

        const directPersonality =
          nextPet?.personality_name ??
          nextPet?.personality ??
          nextPet?.personality_key ??
          null;

        setPersonalityName(
          directPersonality ? titleCase(directPersonality) : null,
        );

        hasLoadedOnceRef.current = true;

        if (showSpinner) {
          const activeSlot =
            nextTeam.find((member) => member?.isActive)?.slotIndex ??
            nextTeam[0]?.slotIndex ??
            null;

          const totalPoints =
            typeof json.total_points === "number"
              ? json.total_points
              : nextStats
                ? [
                    Number(nextStats.hp ?? 0),
                    Number(nextStats.atk ?? 0),
                    Number(nextStats.def ?? 0),
                    Number(nextStats.spd ?? 0),
                    Number(nextStats.magi ?? 0),
                    Number(nextStats.mana ?? 0),
                  ].reduce((sum, value) => sum + value, 0)
                : null;

          console.log(
            "[pet] active pet loaded -> %s (%s, %s, level %s)",
            nextPet?.name ?? "None",
            nextPet?.line ?? nextPet?.element ?? "unknown",
            nextPet?.stage ?? "unknown",
            nextPet?.level ?? "unknown",
          );
          console.log(
            "[pet] stats loaded -> total_points=%s",
            totalPoints ?? "unknown",
          );
          console.log(
            "[pet] team loaded -> slot %s active",
            activeSlot ?? "none",
          );
          console.log("[pet] active pet payload ->", {
            id: nextPet?.id ?? null,
            name: nextPet?.name ?? null,
            nickname: nextPet?.nickname ?? null,
            stage: nextPet?.stage ?? null,
            element: nextPet?.element ?? null,
            line: nextPet?.line ?? null,
            hatch_time_alignment: nextPet?.hatch_time_alignment ?? null,
            growth_strong_stats: nextPet?.growth_strong_stats ?? null,
            growth_weak_stat: nextPet?.growth_weak_stat ?? null,
            stats: nextStats
              ? {
                  hp: nextStats.hp ?? 0,
                  atk: nextStats.atk ?? 0,
                  def: nextStats.def ?? 0,
                  spd: nextStats.spd ?? 0,
                  magi: nextStats.magi ?? 0,
                  mana: nextStats.mana ?? 0,
                  base_total: nextStats.base_total ?? null,
                }
              : null,
            elements: nextElements ?? null,
          });
          console.log("[pet] render complete");
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load pet page.";

        setLoadErr(message);
        setPet(null);
        setStats(null);
        setElements(null);
        setTeam([]);
        setPersonalityName(null);
        setShowNicknameEditor(false);

        if (showSpinner) {
          console.error("[pet] load failed:", message);
        }
      } finally {
        setLoadingPage(false);
      }
    },
    [user],
  );

  const syncCareInventoryCounts = useCallback(() => {
    ensureStarterCareInventory();
    setCareInventoryCounts({
      food: getCareItemCount("food"),
      soap: getCareItemCount("soap"),
      toy: getCareItemCount("toy"),
      bed: getCareItemCount("bed"),
    });
  }, []);

  useEffect(() => {
    syncCareInventoryCounts();

    const eventName = getInventoryChangeEventName();
    window.addEventListener(eventName, syncCareInventoryCounts);

    return () => {
      window.removeEventListener(eventName, syncCareInventoryCounts);
    };
  }, [syncCareInventoryCounts]);

  useEffect(() => {
    if (authLoading || !user) return;

    void loadPetPage(true);

    const handleWindowFocus = () => {
      void loadPetPage(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadPetPage(false);
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [authLoading, user, loadPetPage]);

  const runCareAction = useCallback(
    async (action: CareAction) => {
      if (busy) return;

      const inventoryCategoryByAction: Partial<
        Record<CareAction, CareInventoryCategory>
      > = {
        feed: "food",
        clean: "soap",
        play: "toy",
      };

      const inventoryCategory = inventoryCategoryByAction[action] ?? null;

      if (inventoryCategory) {
        const didConsume = consumeCareItem(inventoryCategory, 1);

        if (!didConsume) {
          const missingLabel =
            inventoryCategory === "food"
              ? "food"
              : inventoryCategory === "soap"
                ? "soap"
                : "toy";
          setActionMsg(`You need ${missingLabel} in your inventory first.`);
          syncCareInventoryCounts();
          return;
        }

        syncCareInventoryCounts();
      }

      setBusy(true);
      setActionMsg(null);

      try {
        const token = await getAccessTokenSafe();

        if (!token) {
          throw new Error("You are not authenticated.");
        }

        const res = await fetch(`/api/care/${action}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const json = (await res.json().catch(() => null)) as {
          message?: string;
          error?: string;
        } | null;

        if (!res.ok) {
          throw new Error(json?.error || `Failed to ${action} your pet.`);
        }

        const defaultMessageMap: Record<CareAction, string> = {
          feed: "Your Delta has been fed.",
          clean: "Your Delta is all cleaned up.",
          play: "Your Delta had a fun play session.",
          pet: "Your Delta looks happier after the extra affection.",
        };

        setActionMsg(json?.message || defaultMessageMap[action]);
        await loadPetPage(false);
        syncCareInventoryCounts();
      } catch (error) {
        if (inventoryCategory) {
          addCareItem(inventoryCategory, 1);
          syncCareInventoryCounts();
        }

        const message =
          error instanceof Error
            ? error.message
            : `Failed to ${action} your pet.`;
        setActionMsg(message);
      } finally {
        setBusy(false);
      }
    },
    [busy, loadPetPage, syncCareInventoryCounts],
  );

  const switchActivePet = useCallback(
    async (petId: string) => {
      if (!petId || busy || nicknameSaving) return;

      setBusy(true);
      setActionMsg(null);

      try {
        const token = await getAccessTokenSafe();

        if (!token) {
          throw new Error("You are not authenticated.");
        }

        const res = await fetch("/api/care/place", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ petId }),
        });

        const json = (await res.json().catch(() => null)) as {
          success?: boolean;
          error?: string;
        } | null;

        if (!res.ok) {
          throw new Error(json?.error || "Failed to switch active Delta.");
        }

        setActionMsg("Active Delta switched.");
        await loadPetPage(false);
      } catch (error) {
        setActionMsg(
          error instanceof Error
            ? error.message
            : "Failed to switch active Delta.",
        );
      } finally {
        setBusy(false);
      }
    },
    [busy, loadPetPage, nicknameSaving],
  );

  const saveNickname = useCallback(async () => {
    if (!user?.id || !pet?.id) return;

    const trimmed = nicknameDraft.trim();
    const existingNickname = pet.nickname?.trim() || "";

    if (!trimmed) {
      setActionMsg("Your Delta needs a nickname before you can lock it in.");
      return;
    }

    if (existingNickname) {
      setActionMsg("This Delta's nickname is already locked.");
      setShowNicknameEditor(false);
      return;
    }

    setNicknameSaving(true);
    setActionMsg(null);

    try {
      const { error } = await supabase
        .from("pets")
        .update({ nickname: trimmed })
        .eq("id", pet.id)
        .eq("user_id", user.id)
        .is("nickname", null);

      if (error) {
        throw new Error(error.message);
      }

      setActionMsg(`Nickname locked in as ${trimmed}.`);
      setShowNicknameEditor(false);
      await loadPetPage(false);
    } catch (error) {
      setActionMsg(
        error instanceof Error ? error.message : "Failed to save nickname.",
      );
    } finally {
      setNicknameSaving(false);
    }
  }, [loadPetPage, nicknameDraft, pet?.id, pet?.nickname, user?.id]);

  const hunger = clampPercent(pet?.hunger);
  const clean = clampPercent(pet?.cleanliness);
  const happy = clampPercent(pet?.happiness);
  const comfort = Math.max(0, Math.min(50, safeNum((pet as any)?.comfort, 50)));
  const rest = Math.max(0, Math.min(50, safeNum((pet as any)?.rest, 50)));
  const energy = clampPercent(pet?.energy);
  const bond = clampPercent(pet?.bond);

  const totalStats = useMemo(() => {
    const hp = safeNum(stats?.hp);
    const atk = safeNum(stats?.atk);
    const def = safeNum(stats?.def);
    const spd = safeNum(stats?.spd);
    const magi = safeNum(stats?.magi);
    const mana = safeNum(stats?.mana);

    return {
      hp,
      atk,
      def,
      spd,
      magi,
      mana,
    };
  }, [stats]);

  const activeElementKey = normalizeElement(pet?.element || pet?.line);
  const petElementTheme = getElementThemeKey(pet);

  const elementRows = useMemo(() => {
    return ELEMENT_ORDER.map((key) => ({
      key,
      label: key === "null" ? "Voidborne" : titleCase(key),
      value: safeNum(elements?.[key]),
      active: key === activeElementKey,
    }));
  }, [elements, activeElementKey]);

  const petDescription = useMemo(() => {
    return getPetPageDescription(pet);
  }, [pet]);

  const growthTraits = useMemo(() => {
    return getPetGrowthTraits(pet, stats);
  }, [pet, stats]);

  const nicknameLocked = Boolean(pet?.nickname?.trim());
  const canRenameNickname = !nicknameLocked;
  const trimmedNicknameDraft = nicknameDraft.trim();
  const canSaveNickname =
    !busy &&
    !nicknameSaving &&
    canRenameNickname &&
    showNicknameEditor &&
    Boolean(trimmedNicknameDraft) &&
    trimmedNicknameDraft !== (pet?.nickname?.trim() || "");

  if (authLoading || (!hasLoadedOnceRef.current && loadingPage)) {
    return (
      <div className="petRepoPage">
        <div className="petRepoStateCard">Loading Delta Room…</div>
      </div>
    );
  }

  return (
    <div className="petRepoPage">
      {loadErr ? (
        <div className="petRepoStateCard petRepoStateCardError">
          <h2>Pet page load error</h2>
          <p>{loadErr}</p>
        </div>
      ) : null}

      {!loadErr && !loadingPage && !pet ? (
        <div className="petRepoStateCard">
          <h2>No active pet found</h2>
          <p>Put one of your Deltas into the main team, then come back here.</p>
        </div>
      ) : null}

      {!loadErr && pet ? (
        <section className="petRepoStage">
          <header className="petRepoHeroCard">
            <div className="petRepoHeroStatus petRepoHeroStatus--focusLeft">
              <span className="petRepoStatusLabel">Current Focus</span>
              <strong>{getPetLabel(pet)}</strong>
            </div>

            <div className="petRepoHeroText petRepoHeroTextShifted">
              <h1 className="petRepoTitle">Delta Care Chamber</h1>
              <p className="petRepoSubtitle petRepoSubtitle--centered">
                Care is part of progression, but it does not force evolution.
                This room is for upkeep, trust, and keeping your main team in
                real condition.
              </p>
            </div>
          </header>

          <section className="petRepoTeamPanel">
            <div className="petRepoTeamPanelHeader petRepoTeamPanelHeader--centered">
              <div className="petRepoSectionLine" />
              <h2 className="petRepoTeamPanelTitle">Main Team</h2>
              <p className="petRepoTeamPanelCopy petRepoTeamPanelCopy--centered">
                Click any team pet here to switch the Care panel focus.
              </p>
              <div className="petRepoSectionLine" />
            </div>

            <div className="petRepoTeamGrid">
              {Array.from({ length: 4 }, (_, index) => {
                const teamPet = team[index] ?? null;

                if (!teamPet) {
                  const arcId = buildArcId(`empty-${index + 1}`);

                  return (
                    <div
                      key={`empty-slot-${index + 1}`}
                      className="petRepoTeamOrbWrap"
                    >
                      <div className="petRepoTeamOrb petRepoTeamOrb--empty">
                        <div
                          className="petRepoTeamRing petRepoTeamRing--bond petRepoTeamRing--bondEmpty"
                          aria-hidden="true"
                        />
                        <div
                          className="petRepoTeamRing petRepoTeamRing--energy"
                          aria-hidden="true"
                        />

                        <div className="petRepoTeamPreview petRepoTeamPreview--circle petRepoTeamPreview--empty" />

                        <TeamOrbTextRing
                          pathId={arcId}
                          label="No Pet Yet"
                          elementKey="silver"
                        />
                      </div>
                    </div>
                  );
                }

                const teamDisplayName = getTeamDisplayName(teamPet);
                const elementKey = getTeamElementKey(teamPet);
                const arcId = buildArcId(`${teamPet.id}-${index + 1}`);

                return (
                  <button
                    key={teamPet.id}
                    type="button"
                    className={`petRepoTeamOrbWrap petRepoTeamOrbWrapButton ${teamPet.isActive ? "is-active" : ""}`}
                    onClick={() => void switchActivePet(teamPet.id)}
                    disabled={busy || nicknameSaving}
                  >
                    <div
                      className={`petRepoTeamOrb petRepoTeamOrb--${elementKey}`}
                    >
                      <div
                        className="petRepoTeamRing petRepoTeamRing--bond petRepoTeamRing--bondEmpty"
                        aria-hidden="true"
                      />
                      <div
                        className="petRepoTeamRing petRepoTeamRing--energy"
                        aria-hidden="true"
                      />

                      <div className="petRepoTeamPreview petRepoTeamPreview--circle">
                        <div
                          className="petRepoTeamPreviewGlow"
                          aria-hidden="true"
                        />
                        <div
                          className="petRepoTeamPreviewPlatformOuter"
                          aria-hidden="true"
                        />
                        <div
                          className="petRepoTeamPreviewPlatformInner"
                          aria-hidden="true"
                        />

                        {teamPet.previewUrl ? (
                          <img
                            className="petRepoTeamPreviewImage petRepoTeamPreviewImage--circle"
                            src={teamPet.previewUrl}
                            alt={teamDisplayName}
                          />
                        ) : (
                          <div className="petRepoTeamPreviewFallback petRepoTeamPreviewFallback--orb">
                            <div className="petRepoCreatureCore petRepoCreatureCore--team">
                              <span className="petRepoCreatureEye petRepoCreatureEyeLeft" />
                              <span className="petRepoCreatureEye petRepoCreatureEyeRight" />
                              <span className="petRepoCreatureSmile" />
                            </div>
                          </div>
                        )}
                      </div>

                      <TeamOrbTextRing
                        pathId={arcId}
                        label={teamDisplayName}
                        elementKey={elementKey}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="petRepoMainGrid">
            <div className="petRepoLeftColumn">
              <PetDetailsPanel
                pet={pet}
                personalityName={personalityName}
                nicknameDraft={nicknameDraft}
                nicknameSaving={nicknameSaving}
                showNicknameEditor={showNicknameEditor}
                canRenameNickname={canRenameNickname}
                canSaveNickname={canSaveNickname}
                busy={busy}
                hunger={hunger}
                clean={clean}
                happy={happy}
                comfort={comfort}
                rest={rest}
                energy={energy}
                bond={bond}
                inventoryCounts={careInventoryCounts}
                actionMsg={actionMsg}
                setNicknameDraft={setNicknameDraft}
                setShowNicknameEditor={setShowNicknameEditor}
                saveNickname={saveNickname}
                runCareAction={runCareAction}
              />
            </div>

            <div className="petRepoRightColumn">
              <article className="petRepoPanel petRepoPanel--infoShell">
                <div className="petRepoInfoStack">
                  <section className="petRepoInfoSection petRepoInfoSection--description">
                    <SectionPill title="Pet Description" />
                    <div className="petRepoDescriptionCard">
                      <div className="petRepoDescriptionContent">
                        <p className="petRepoDescription">{petDescription}</p>
                      </div>
                    </div>
                  </section>

                  <div className="petRepoDataTwoCol">
                    <section className="petRepoInfoSection petRepoInfoSection--stats">
                      <SectionPill title="Stats" />
                      <div className="petRepoStatList">
                        {STAT_ORDER.map((statKey) => {
                          const value = totalStats[statKey];
                          const rowClassNames = ["petRepoInfoRow"];

                          if (growthTraits.strongStats.includes(statKey)) {
                            rowClassNames.push("is-strong-stat");
                          }

                          if (growthTraits.weakStat === statKey) {
                            rowClassNames.push("is-weak-stat");
                          }

                          return (
                            <div
                              key={statKey}
                              className={rowClassNames.join(" ")}
                            >
                              <span>{STAT_LABELS[statKey]}</span>
                              <span>{String(value)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </section>

                    <section
                      className={`petRepoInfoSection petRepoInfoSection--elements petRepoPanel--element petRepoPanel--element-${petElementTheme}`}
                    >
                      <SectionPill title="Element Stats" />
                      <div className="petRepoStatList">
                        {elementRows.map((row) => {
                          const rowClassNames = [
                            "petRepoInfoRow",
                            `petRepoInfoRow--element-${row.key}`,
                          ];

                          if (row.active) {
                            rowClassNames.push("is-active-element");
                          }

                          return (
                            <div
                              key={row.key}
                              className={rowClassNames.join(" ")}
                            >
                              <span>{row.label}</span>
                              <span>{row.value}</span>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </section>
      ) : null}
    </div>
  );
}

function SectionPill({
  title,
  className = "",
}: {
  title: string;
  className?: string;
}) {
  return (
    <div className={`petRepoSectionHeader ${className}`.trim()}>
      <div className="petRepoSectionLine" />
      <div className="petRepoSectionPill">{title}</div>
      <div className="petRepoSectionLine" />
    </div>
  );
}
