import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/useAuth";
import { apiFetch } from "@/lib/api/baseClient";

import {
  clampPercent,
  normalizeElement,
  safeNum,
  titleCase,
} from "@/lib/petUtils";
import {
  addCareItem,
  consumeCareItem,
  ensureStarterCareInventory,
  getCareItemCount,
  getInventoryChangeEventName,
  type CareInventoryCategory,
} from "@/components/inventory/inventory";
import PetDetailsPanel from "@/pages/petsPage/components/petDetailsPanel/PetDetailsPanel";
import type { PetElementsRow, PetStatsRow } from "@/pages/petsPage/petTypes";
import PetSkillsPanel from "@/components/Skills/PetSkillsInventory";
import "./petFarmFood.css";

type CareAction = "feed" | "clean" | "play" | "pet";

type PetRecord = Record<string, any>;

type TeamCardPet = {
  id: string;
  name?: string | null;
  nickname?: string | null;
  element?: string | null;
  line?: string | null;
  level?: number | null;
  isActive?: boolean | null;
  slotIndex?: number | null;
  previewUrl?: string | null;
};

type StarterMerchantState = {
  show?: boolean;
  href?: string;
  title?: string;
  body?: string;
  ctaLabel?: string;
};

type CareCurrentResponse = {
  pet: PetRecord | null;
  stats: PetStatsRow | null;
  elements: PetElementsRow | null;
  team?: TeamCardPet[];
  starter_merchant?: StarterMerchantState | null;
};

const STAT_ORDER = ["hp", "atk", "def", "spd", "magi", "mana"] as const;

const STAT_LABELS: Record<(typeof STAT_ORDER)[number], string> = {
  hp: "HP",
  atk: "Attack",
  def: "Defense",
  spd: "Speed",
  magi: "Magi",
  mana: "Mana",
};

const ELEMENT_ORDER = [
  "null",
  "water",
  "fire",
  "earth",
  "air",
  "ice",
  "storm",
  "light",
  "shadow",
] as const;

type StatKey = (typeof STAT_ORDER)[number];
type ElementKey = (typeof ELEMENT_ORDER)[number];
type ElementThemeKey = ElementKey | "void" | "voidborne" | "neutral" | "silver";

function getPetLabel(pet: PetRecord | null) {
  return pet?.nickname?.trim?.() || pet?.name?.trim?.() || "Your Delta";
}

function getElementThemeKey(
  petOrElement?: PetRecord | string | null,
): ElementThemeKey {
  const raw =
    typeof petOrElement === "string"
      ? petOrElement
      : petOrElement?.element || petOrElement?.line || "null";

  const normalized = normalizeElement(raw);

  if (!normalized) return "neutral";
  if (normalized === "null") return "voidborne";

  return normalized as ElementThemeKey;
}

function getElementValue(elements: PetElementsRow | null, key: string) {
  if (!elements) return 0;

  if (key === "null") {
    return safeNum((elements as any).null_element ?? (elements as any).null);
  }

  return safeNum((elements as any)[key]);
}

function getTeamDisplayName(teamPet: TeamCardPet) {
  return teamPet.nickname?.trim() || teamPet.name?.trim() || "Unnamed Delta";
}

function getTeamElementKey(teamPet: TeamCardPet): ElementThemeKey {
  return getElementThemeKey(teamPet.element || teamPet.line);
}

function buildArcId(value: string) {
  return `pet-team-arc-${String(value).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function getPetPageDescription(pet: PetRecord | null) {
  if (!pet) return "No Delta data available yet.";

  const displayName = getPetLabel(pet);

  const fallbackNames = [
    pet.species_name,
    pet.speciesName,
    pet.species,
    pet.name,
  ]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  if (pet.description?.trim?.()) {
    let description = pet.description.trim();

    if (displayName && displayName !== "Your Delta") {
      for (const fallbackName of fallbackNames) {
        if (!fallbackName || fallbackName === displayName) continue;

        const escapedFallbackName = fallbackName.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        );

        description = description.replace(
          new RegExp(`^${escapedFallbackName}\\b`, "i"),
          displayName,
        );
      }
    }

    return description;
  }

  const normalizedElement = normalizeElement(pet.element || pet.line);
  const element = titleCase(
    normalizedElement === "null" ? "Voidborne" : normalizedElement,
  );
  const stage = titleCase(pet.stage || "unknown stage");
  const trait = titleCase(
    pet.personality_name ||
      pet.personality ||
      pet.personality_key ||
      "mysterious",
  );

  return `${displayName} is a ${trait} ${element} Delta in the ${stage} stage. Its bond is still forming, but the spark is there.`;
}

function getPetGrowthTraits(pet: PetRecord | null, stats: PetStatsRow | null) {
  const rawStrong =
    pet?.growth_strong_stats ??
    pet?.growthStrongStats ??
    pet?.strong_stats ??
    [];

  const rawWeak =
    pet?.growth_weak_stat ??
    pet?.growth_weak_stats ??
    pet?.growthWeakStat ??
    pet?.weak_stat ??
    null;

  const strongStats = Array.isArray(rawStrong)
    ? rawStrong.filter((key): key is StatKey =>
        STAT_ORDER.includes(key as StatKey),
      )
    : [];

  const weakStat = Array.isArray(rawWeak)
    ? (rawWeak.find((key) => STAT_ORDER.includes(key as StatKey)) ?? null)
    : STAT_ORDER.includes(rawWeak as StatKey)
      ? (rawWeak as StatKey)
      : null;

  if (strongStats.length || weakStat) {
    return { strongStats, weakStat };
  }

  if (!stats) return { strongStats: [], weakStat: null };

  const sortedStats = [...STAT_ORDER].sort(
    (a, b) => safeNum((stats as any)[b]) - safeNum((stats as any)[a]),
  );

  return {
    strongStats: sortedStats.slice(0, 2),
    weakStat: sortedStats.at(-1) ?? null,
  };
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
    <svg
      className={`petRepoTeamTextRing petRepoTeamTextRing--${elementKey}`}
      viewBox="0 0 220 220"
      aria-hidden="true"
    >
      <defs>
        <path id={pathId} d="M 35 118 A 75 75 0 1 1 185 118" fill="none" />
      </defs>
      <text>
        <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
          {label}
        </textPath>
      </text>
    </svg>
  );
}

function SectionPill({ title }: { title: string }) {
  return <h3 className="petRepoSectionPill">{title}</h3>;
}

export function PetFarmFood() {
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
  const [starterMerchant, setStarterMerchant] =
    useState<StarterMerchantState | null>(null);
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
  const hasLoggedRunawayLockRef = useRef(false);

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

      if (showSpinner) setLoadingPage(true);
      setLoadErr(null);

      try {
        const json = await apiFetch<CareCurrentResponse>("/api/care/current");

        const nextPet = json.pet ?? null;
        const nextStats = json.stats ?? null;
        const nextElements = json.elements ?? null;
        const nextTeam = json.team ?? [];

        setPet(nextPet);
        setStats(nextStats);
        setElements(nextElements);
        setTeam(nextTeam);
        setStarterMerchant(json.starter_merchant ?? null);
        setNicknameDraft(nextPet?.nickname?.trim() || "");
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
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load pet page.";

        setLoadErr(message);
        setPet(null);
        setStarterMerchant(null);
        setStats(null);
        setElements(null);
        setTeam([]);
        setPersonalityName(null);
        setShowNicknameEditor(false);
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

    const handleWindowFocus = () => void loadPetPage(false);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadPetPage(false);
      }
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadPetPage(false);
      }
    }, 60_000);

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
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
        const json = await apiFetch<{ message?: string }>(
          `/api/care/${action}`,
          { method: "POST" },
        );

        const defaultMessageMap: Record<CareAction, string> = {
          feed: "Your Delta has been fed.",
          clean: "Your Delta is all cleaned up.",
          play: "Your Delta had a fun play session.",
          pet: "Your Delta looks happy.",
        };

        setActionMsg(json?.message || defaultMessageMap[action]);
        await loadPetPage(false);
        syncCareInventoryCounts();
      } catch (error) {
        if (inventoryCategory) {
          addCareItem(inventoryCategory, 1);
          syncCareInventoryCounts();
        }

        setActionMsg(
          error instanceof Error
            ? error.message
            : `Failed to ${action} your pet.`,
        );
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
        await apiFetch("/api/care/place", {
          method: "POST",
          json: { petId },
        });

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
      await apiFetch(`/api/pets/${pet.id}/nickname`, {
        method: "PATCH",
        json: { nickname: trimmed },
      });

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
  const clean = clampPercent(pet?.clean);
  const happy = clampPercent(pet?.happy);
  const comfort = Math.max(0, Math.min(50, safeNum(pet?.comfort, 50)));
  const rest = Math.max(0, Math.min(50, safeNum(pet?.rest, 50)));
  const energy = clampPercent(pet?.energy ?? 100);
  const bond = clampPercent(pet?.bond);

  const totalStats = useMemo(
    () => ({
      hp: safeNum(stats?.hp),
      atk: safeNum(stats?.atk),
      def: safeNum(stats?.def),
      spd: safeNum(stats?.spd),
      magi: safeNum(stats?.magi),
      mana: safeNum(stats?.mana),
    }),
    [stats],
  );

  const activeElementKey = normalizeElement(pet?.element || pet?.line);
  const petElementTheme = getElementThemeKey(pet);

  const elementRows = useMemo(
    () =>
      ELEMENT_ORDER.map((key) => ({
        key,
        label: key === "null" ? "Voidborne" : titleCase(key),
        value: getElementValue(elements, key),
        active: key === activeElementKey,
      })),
    [elements, activeElementKey],
  );

  const petDescription = useMemo(() => getPetPageDescription(pet), [pet]);
  const growthTraits = useMemo(
    () => getPetGrowthTraits(pet, stats),
    [pet, stats],
  );

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

  const isRunawayLock =
    !loadErr && !loadingPage && !pet && Boolean(starterMerchant?.show);

  const runawayEmergencyModal = isRunawayLock
    ? createPortal(
        <div className="petRepoRunawayModalBackdrop">
          <div
            className="petRepoRunawayModalWindow"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pet-runaway-title"
          >
            <div className="petRepoRunawayModalHeader">
              <p className="petRepoRunawayModalEyebrow">Emergency</p>
              <h2 id="pet-runaway-title" className="petRepoRunawayModalTitle">
                {starterMerchant?.title || "Pet Ran Away"}
              </h2>
              <p className="petRepoRunawayModalCopy">{starterMerchant?.body}</p>
            </div>

            <div className="petRepoRunawayModalActions">
              <a
                className="petRepoRunawayModalPrimary"
                href={starterMerchant?.href || "/cities/kithna"}
              >
                {starterMerchant?.ctaLabel || "Visit the Kithna Merchant"}
              </a>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  useEffect(() => {
    if (!isRunawayLock) {
      hasLoggedRunawayLockRef.current = false;
      return;
    }

    if (!hasLoggedRunawayLockRef.current) {
      console.log("[PetPage] Runaway lock active → blocking full UI", {
        starterMerchant,
      });
      hasLoggedRunawayLockRef.current = true;
    }
  }, [isRunawayLock, starterMerchant]);

  if (authLoading || (!hasLoadedOnceRef.current && loadingPage)) {
    return (
      <div className="petRepoPage">
        {runawayEmergencyModal}
        <div className="petRepoStateCard">Loading Delta Room…</div>
      </div>
    );
  }

  if (isRunawayLock) {
    return <div className="petRepoPage">{runawayEmergencyModal}</div>;
  }

  return (
    <div className="petRepoPage">
      {loadErr ? (
        <div className="petRepoStateCard petRepoStateCardError">
          <h2>Pet page load error</h2>
          <p>{loadErr}</p>
        </div>
      ) : null}

      {!loadErr && !loadingPage && !pet && !starterMerchant?.show ? (
        <div className="petRepoStateCard">
          <h2>No active pet found</h2>
          <p>Put one of your Deltas into the main team, then come back here.</p>
        </div>
      ) : null}

      {!loadErr && pet ? (
        <section className="petRepoStage">
          <header
            className={`petRepoHeroCard petRepoHeroCard--element-${petElementTheme}`}
          >
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

          <PetDetailsPanel
            pet={pet}
            petDescription={petDescription}
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
            starterMerchant={starterMerchant}
            setNicknameDraft={setNicknameDraft}
            setShowNicknameEditor={setShowNicknameEditor}
            saveNickname={saveNickname}
            runCareAction={runCareAction}
          />

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
                    className={`petRepoTeamOrbWrap petRepoTeamOrbWrapButton ${
                      teamPet.isActive ? "is-active" : ""
                    }`}
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

          <section className="petRepoBottomGrid">
            <article className="petRepoPanel petRepoPanel--infoShell petRepoPanel--bottomStats">
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
                        <div key={statKey} className={rowClassNames.join(" ")}>
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
                        <div key={row.key} className={rowClassNames.join(" ")}>
                          <span>{row.label}</span>
                          <span>{row.value}</span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            </article>

            <PetSkillsPanel pet={pet} stats={totalStats} />
          </section>
        </section>
      ) : null}
    </div>
  );
}
