import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/useAuth";
import { apiFetch } from "@/lib/api/baseClient";
import { useDeltaTime } from "@/lib/timers/useDeltaTime";
import {
  clampPercent,
  normalizeElement,
  safeNum,
  titleCase,
} from "@/lib/petUtils";
import PetDetailsPanel from "@/pages/petsPage/components/petDetailsPanel/PetDetailsPanel";
import LostKithRegistry from "@/pages/petsPage/components/LostKithRegistry/LostKithRegistry";
import type { PetElementsRow, PetStatsRow } from "@/pages/petsPage/petTypes";
import SkillsChamber from "@/components/skillChamber/skillChamber";
import StatsChamber from "@/components/StatsChamber/StatsChamber";
import MainTeam from "@/components/Main_Team/mainTeam";
import type {
  PartySlotView,
  StoragePet,
} from "@/components/Hatchery/pages/storage/usePetStorage";
import "./PetPage.css";
import SkillTree from "@/components/Skills/skilltree";
import DpPopupWindow from "./components/DpPopupWindow";
import { KithProgressCard } from "@/components/ProgressCard/KithProgressCard";
import {
  type CareInventoryCategory,
  addCareItem,
  consumeCareItem,
  ensureStarterCareInventory,
  getCareInventoryCounts,
  getInventoryChangeEventName,
} from "@/components/inventory/inventory";

type CareAction = "feed" | "clean" | "play" | "pet";

type PetRecord = Record<string, any>;

function getCareCooldownRemainingMs(pet: PetRecord | null, action: CareAction) {
  if (action === "feed" || action === "pet") return 0;

  const cooldownColumnByAction: Record<Exclude<CareAction, "pet">, string> = {
    feed: "cd_feed_ends_at",
    clean: "cd_clean_ends_at",
    play: "cd_play_ends_at",
  };

  const endsAt = pet?.[cooldownColumnByAction[action]];
  const endsMs = endsAt ? Date.parse(String(endsAt)) : NaN;

  return Number.isFinite(endsMs) ? Math.max(0, endsMs - Date.now()) : 0;
}

type TeamCardPet = {
  id: string;
  name?: string | null;
  nickname?: string | null;
  species?: string | null;
  stage?: string | null;
  element?: string | null;
  elementKey?: string | null;
  line?: string | null;
  level?: number | null;
  energy?: number | null;
  bond?: number | null;
  isActive?: boolean | null;
  slotIndex?: number | null;
  previewUrl?: string | null;
  hp?: number | null;
  current_hp?: number | null;
  max_hp?: number | null;
  atk?: number | null;
  def?: number | null;
  magi?: number | null;
  mana?: number | null;
  spd?: number | null;
  personality?: string | null;
  personality_key?: string | null;
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

export default function PetPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { phase } = useDeltaTime();
  const [pet, setPet] = useState<PetRecord | null>(null);
  const [stats, setStats] = useState<PetStatsRow | null>(null);
  const [elements, setElements] = useState<PetElementsRow | null>(null);
  const [team, setTeam] = useState<TeamCardPet[]>([]);
  const [showSkillTree, setShowSkillTree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [personalityName, setPersonalityName] = useState<string | null>(null);
  const [starterMerchant, setStarterMerchant] =
    useState<StarterMerchantState | null>(null);
  const [showLostRegistry, setShowLostRegistry] = useState(false);
  const [claimingRescueEgg, setClaimingRescueEgg] = useState(false);
  const [rescueEggError, setRescueEggError] = useState<string | null>(null);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [showNicknameEditor, setShowNicknameEditor] = useState(false);
  const [careInventoryCounts, setCareInventoryCounts] = useState(() =>
    getCareInventoryCounts(),
  );

  const syncCareInventoryCounts = useCallback(() => {
    setCareInventoryCounts(getCareInventoryCounts());
  }, []);

  const hasLoadedOnceRef = useRef(false);
  const hasLoggedRunawayLockRef = useRef(false);
  const careActionPendingRef = useRef(false);

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
    }, 5 * 60_000);

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
      if (careActionPendingRef.current || busy || nicknameSaving) return;

      const cooldownRemainingMs = getCareCooldownRemainingMs(pet, action);

      if (cooldownRemainingMs > 0) {
        setActionMsg(
          `${titleCase(action)} is still cooling down for ${Math.ceil(
            cooldownRemainingMs / 1000,
          )}s.`,
        );
        return;
      }

      careActionPendingRef.current = true;

      const inventoryCategoryByAction: Partial<
        Record<CareAction, CareInventoryCategory>
      > = {
        feed: "food",
        clean: "soap",
        play: "toy",
        pet: "bed",
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
                : inventoryCategory === "toy"
                  ? "toy"
                  : "pillow";

          setActionMsg(`You need ${missingLabel} in your inventory first.`);
          syncCareInventoryCounts();
          careActionPendingRef.current = false;
          return;
        }

        syncCareInventoryCounts();
      }

      setBusy(true);
      setActionMsg(null);

      try {
        const json =
          action === "pet"
            ? await apiFetch<{ message?: string }>(`/api/care/${action}`, {
                method: "POST",
              })
            : await apiFetch<{ message?: string }>("/api/pets/actions/do", {
                method: "POST",
                json: { action },
              });

        const defaultMessageMap: Record<CareAction, string> = {
          feed: "Successful Food Intake.",
          clean: "Successful Bath.",
          play: "Successful play time.",
          pet: "They look happier.",
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
        careActionPendingRef.current = false;
        setBusy(false);
      }
    },
    [busy, loadPetPage, nicknameSaving, pet, syncCareInventoryCounts],
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
      const json = await apiFetch<{ message?: string; pet?: PetRecord }>(
        `/api/pets/${pet.id}/nickname`,
        {
          method: "PATCH",
          json: { nickname: trimmed },
        },
      );

      setActionMsg(json.message || `Nickname locked in as ${trimmed}.`);
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

  const claimRescueEgg = useCallback(async () => {
    if (claimingRescueEgg) return;

    setClaimingRescueEgg(true);
    setRescueEggError(null);

    try {
      await apiFetch("/api/pets/rescue-egg", { method: "POST" });
      navigate("/rescue-reveal");
    } catch (error) {
      setRescueEggError(
        error instanceof Error
          ? error.message
          : "Could not claim the rescue egg. Try again.",
      );
    } finally {
      setClaimingRescueEgg(false);
    }
  }, [claimingRescueEgg, navigate]);

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
  const kithTeamSlots = useMemo<PartySlotView[]>(() => {
    const teamBySlot = new Map<number, TeamCardPet>();

    for (const teamPet of team) {
      const slotIndex = Math.max(1, Math.min(4, safeNum(teamPet.slotIndex, 0)));

      if (slotIndex >= 1) {
        teamBySlot.set(slotIndex, teamPet);
      }
    }

    return Array.from({ length: 4 }, (_, index) => {
      const slotIndex = index + 1;
      const teamPet = teamBySlot.get(slotIndex) ?? team[index] ?? null;
      const storagePet: StoragePet | null = teamPet
        ? {
            id: teamPet.id,
            user_id: user?.id ?? "",
            name: teamPet.name ?? teamPet.nickname ?? teamPet.species ?? null,
            nickname: teamPet.nickname ?? null,
            species: teamPet.species ?? teamPet.name ?? null,
            energy: teamPet.energy ?? 100,
            bond: teamPet.bond ?? 0,
            stage: teamPet.stage ?? "hatchling",
            line: teamPet.elementKey ?? teamPet.line ?? teamPet.element ?? null,
            level: teamPet.level ?? 1,
            location: "active",
            is_active: teamPet.isActive ?? false,
            created_at: null,
            hatched_at: null,
            portrait_url: teamPet.previewUrl ?? null,
            current_hp: teamPet.current_hp ?? teamPet.hp ?? null,
            max_hp: teamPet.max_hp ?? teamPet.hp ?? null,
            hp: teamPet.hp ?? teamPet.max_hp ?? teamPet.current_hp ?? null,
            atk: teamPet.atk ?? null,
            def: teamPet.def ?? null,
            magi: teamPet.magi ?? null,
            mana: teamPet.mana ?? null,
            spd: teamPet.spd ?? null,
            personality_key:
              teamPet.personality_key ?? teamPet.personality ?? null,
          }
        : null;

      return {
        slotIndex,
        entryId: null,
        petId: teamPet?.id ?? null,
        pet: storagePet,
      };
    });
  }, [team, user?.id]);

  const selectedKithTeamSlot =
    kithTeamSlots.find((slot) => slot.pet?.is_active)?.slotIndex ?? null;

  const [viewingSlotIndex, setViewingSlotIndex] = useState<number | null>(null);

  const effectiveSlotIndex = viewingSlotIndex ?? selectedKithTeamSlot;

  const viewedPet =
    kithTeamSlots.find((slot) => slot.slotIndex === effectiveSlotIndex)?.pet ??
    null;

  const viewedPetLabel =
    viewedPet?.nickname?.trim() ||
    viewedPet?.name?.trim() ||
    viewedPet?.species?.trim() ||
    null;

  const petElementTheme = getElementThemeKey(viewedPet ?? pet);

  const selectKithTeamSlot = useCallback(
    (slotIndex: number) => {
      setViewingSlotIndex(slotIndex);
      const selectedSlot = kithTeamSlots.find(
        (slot) => slot.slotIndex === slotIndex,
      );

      if (selectedSlot?.petId) {
        void switchActivePet(selectedSlot.petId);
      }
    },
    [kithTeamSlots, switchActivePet],
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
              <button
                type="button"
                className="petRepoRunawayModalPrimary"
                disabled={claimingRescueEgg}
                onClick={claimRescueEgg}
              >
                {claimingRescueEgg
                  ? "Summoning egg..."
                  : starterMerchant?.ctaLabel || "Accept the Egg"}
              </button>
              {rescueEggError ? (
                <p className="petRepoRunawayModalError">{rescueEggError}</p>
              ) : null}
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
      if (import.meta.env.DEV) {
        console.log("[PetPage] Runaway lock active → blocking full UI", {
          starterMerchant,
        });
      }
      hasLoggedRunawayLockRef.current = true;
    }
  }, [isRunawayLock, starterMerchant]);

  if (authLoading || (!hasLoadedOnceRef.current && loadingPage)) {
    return (
      <div className="petRepoPage dpTimeRoomPage" data-phase={phase}>
        {runawayEmergencyModal}
        <div className="petRepoStateCard">Loading Delta Room…</div>
      </div>
    );
  }

  if (isRunawayLock) {
    return (
      <div className="petRepoPage dpTimeRoomPage" data-phase={phase}>
        {runawayEmergencyModal}
      </div>
    );
  }

  return (
    <div className="petRepoPage dpTimeRoomPage" data-phase={phase}>
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
            className={`petRepoHeroCard petRepoHeroCard--element-${petElementTheme} dp-blue-grid-panel`}
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

            <button
              type="button"
              className="lostKithRegistryOpenButton"
              onClick={() => setShowLostRegistry(true)}
            >
              Lost Kith Registry
            </button>
          </header>

          <LostKithRegistry
            open={showLostRegistry}
            onClose={() => setShowLostRegistry(false)}
            onRecovered={() => {
              setShowLostRegistry(false);
              void loadPetPage(false);
            }}
          />

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

          <MainTeam
            partySlots={kithTeamSlots}
            enableDragAndDrop={false}
            selectedPartySlot={selectedKithTeamSlot}
            workingPetId={busy || nicknameSaving ? pet.id : null}
            workingSlotIndex={null}
            dragOverSlotIndex={null}
            onSelectSlot={selectKithTeamSlot}
            onDragStartPet={() => undefined}
            onDragEndPet={() => undefined}
            onDragOverSlot={(event) => event.preventDefault()}
            onDragEnterSlot={() => undefined}
            onDragLeaveSlot={() => undefined}
            onDropOnSlot={(event) => event.preventDefault()}
            teamName="Kith Team"
          />

          <section className="petRepoBottomGrid">
            <StatsChamber
              pet={viewedPet ?? pet}
              petLabel={viewedPetLabel}
              totalStats={totalStats}
              elementRows={elementRows}
              petElementTheme={petElementTheme}
              growthTraits={growthTraits}
              onOpenSkillTree={() => setShowSkillTree(true)}
            />

            <SkillsChamber pet={pet} stats={totalStats} />

            <KithProgressCard
              name={getPetLabel(pet)}
              level={safeNum(pet.level, 1)}
              xp={safeNum(pet.experience ?? pet.xp, 0)}
              xpToNext={safeNum(
                pet.experience_to_next_level ??
                  pet.xp_to_next_level ??
                  pet.next_level_xp,
                100,
              )}
              wins={safeNum(pet.wins, 0)}
              losses={safeNum(pet.losses, 0)}
              hatchCount={safeNum(pet.hatch_count, 0)}
              corruptedEggsHatched={safeNum(pet.corrupted_eggs_hatched, 0)}
            />
          </section>

          {showSkillTree ? (
            <DpPopupWindow
              open
              onClose={() => setShowSkillTree(false)}
              label="Kith Talent System"
              size="wide"
              className="skillTreePopupShell"
            >
              <SkillTree pet={pet} onClose={() => setShowSkillTree(false)} />
            </DpPopupWindow>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
