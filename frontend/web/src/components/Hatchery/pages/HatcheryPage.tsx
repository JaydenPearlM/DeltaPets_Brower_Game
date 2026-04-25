import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../app/providers/useAuth";
import { apiFetch } from "@/lib/api/baseClient";

import { formatDuration } from "../../../lib/timers/time";
import { useNow } from "../../../lib/timers/useNow";
import { useServerCountdown } from "../../../lib/timers/useServerCountdown";

import goldEggPng from "../../../Pets_Creation/assets/eggs/goldEgg.png";
import { PetStoragePanel } from "./storage/PetStoragePanel";
import "./HatcheryPage.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const MYSTERY_EGG = {
  id: "mystery_egg",
  name: "Mystery Egg",
  sprite: goldEggPng,
};

// How often to poll when the tab is visible (ms)
const POLL_INTERVAL_MS = 30_000;

// ─── Types ────────────────────────────────────────────────────────────────────

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

const STAT_ROWS = [
  { key: "hp", label: "HP" },
  { key: "atk", label: "ATK" },
  { key: "magi", label: "MAGI" },
  { key: "def", label: "DEF" },
  { key: "spd", label: "SPD" },
  { key: "mana", label: "MANA" },
] as const;

type EggStatKey = (typeof STAT_ROWS)[number]["key"];

type HatcherySlotResponse = {
  id: string;
  slot_index: number;
  unlocked: boolean;
  pet: {
    id: string;
    name?: string | null;
    stage?: string | null;
    line?: string | null;
    growth_strong_stats?: EggStatKey[] | null;
    growth_weak_stat?: EggStatKey | null;
  } | null;
  hatch: {
    ready: boolean;
    hatch_ends_at: string | null;
    hatch_remaining_ms: number;
  } | null;
};

type HatcheryShelfSlotResponse = {
  id: string;
  slot_index: number;
  unlocked: boolean;
  item_key: string | null;
};

type HatcheryResponse = {
  server_now: string;
  slots?: HatcherySlotResponse[];
  shelf_slots?: HatcheryShelfSlotResponse[];
  pet: {
    id: string;
    name?: string | null;
    stage?: string | null;
    line?: string | null;
    growth_strong_stats?: EggStatKey[] | null;
    growth_weak_stat?: EggStatKey | null;
  } | null;
  hatch: {
    ready: boolean;
    hatch_ends_at: string | null;
    hatch_remaining_ms: number;
  } | null;
  stats: PetStatsRow | null;
  elements: PetElementsRow | null;
};

type HatchActionResponse = {
  server_now: string;
  pet: {
    id: string;
    name?: string | null;
    stage?: string | null;
    line?: string | null;
    is_active?: boolean | null;
    location?: string | null;
  } | null;
  awarded_points?: number;
  iv?: unknown;
  points?: unknown;
  gender?: string | null;
  personality_key?: string | null;
  party_slot_assigned?: number | null;
  post_hatch_destination?: string | null;
  storage_result?: "party" | "storage" | null;
  is_mystery_starter_hatch?: boolean;
};

type HatchEgg = {
  id: string;
  name: string;
  hatch_ends_at: string;
  line?: string;
  growth_strong_stats?: EggStatKey[] | null;
  growth_weak_stat?: EggStatKey | null;
};

type HatchSlot = {
  index: number;
  locked: boolean;
  egg?: HatchEgg;
};

type ShelfSlot = {
  id: string;
  index: number;
  locked: boolean;
  itemKey: string | null;
};

type EggGrowthTraits = {
  strongStats: EggStatKey[];
  weakStat: EggStatKey | null;
  flavorText: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_STATS: PetStatsRow = {
  pet_id: "",
  hp: 0,
  atk: 0,
  magi: 0,
  def: 0,
  spd: 0,
  mana: 0,
  base_total: 0,
};

const STAT_KEYS: EggStatKey[] = STAT_ROWS.map((row) => row.key);

const STAT_STYLE_WORDS: Record<EggStatKey, string> = {
  hp: "vitality",
  atk: "ferocity",
  magi: "mystic power",
  def: "resilience",
  spd: "speed",
  mana: "arcane flow",
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function formatTraitList(words: string[]) {
  if (words.length === 0) return "";
  if (words.length === 1) return words[0];
  if (words.length === 2) return `${words[0]} and ${words[1]}`;
  return `${words.slice(0, -1).join(", ")}, and ${words[words.length - 1]}`;
}

function buildEggFlavorText(
  strongStats: EggStatKey[],
  weakStat: EggStatKey | null,
): string {
  const strongWords = strongStats.map((stat) => STAT_STYLE_WORDS[stat]);
  const strongText = formatTraitList(strongWords);
  const weakWord = weakStat ? STAT_STYLE_WORDS[weakStat] : null;

  if (strongStats.length === 2 && weakWord) {
    return `This egg carries strong signs of ${strongText}, but something in its shell feels slightly fragile. Its inner aura is bright, though its ${weakWord} may take longer to fully awaken.`;
  }

  if (strongStats.length === 2) {
    return `This egg gives off a powerful aura. Its shell hums with ${strongText}, and the life inside feels unusually promising for future growth.`;
  }

  if (strongStats.length === 1 && weakWord) {
    return `This egg shows a natural gift for ${strongText}, though its energy is not perfectly balanced. Beneath the shell, its ${weakWord} feels quieter and less developed than the rest.`;
  }

  if (strongStats.length === 1) {
    return `This egg has a steady and focused aura. The life within seems especially attuned to ${strongText}, giving it a clear natural strength even before hatch.`;
  }

  if (weakWord) {
    return `This egg feels a little unstable. Nothing about it seems especially empowered yet, and its ${weakWord} appears softer and less certain than the rest of its growing aura.`;
  }

  return `This egg feels calm and ordinary. Its aura is balanced, with no especially strong or weak pull showing through the shell just yet.`;
}

function getEggGrowthTraits(egg: HatchEgg | null): EggGrowthTraits {
  if (!egg) {
    return {
      strongStats: [],
      weakStat: null,
      flavorText: "Select an egg to inspect its aura.",
    };
  }

  const strongStats = Array.isArray(egg.growth_strong_stats)
    ? egg.growth_strong_stats.filter((stat): stat is EggStatKey =>
        STAT_KEYS.includes(stat),
      )
    : [];

  const weakStat =
    typeof egg.growth_weak_stat === "string" &&
    STAT_KEYS.includes(egg.growth_weak_stat as EggStatKey)
      ? (egg.growth_weak_stat as EggStatKey)
      : null;

  return {
    strongStats,
    weakStat,
    flavorText: buildEggFlavorText(strongStats, weakStat),
  };
}

// ─── API calls — now use apiFetch from baseClient ─────────────────────────────
// getAccessToken + fetchJsonAuthed removed. apiFetch handles auth automatically.

async function fetchHatchery(): Promise<HatcheryResponse> {
  return apiFetch<HatcheryResponse>("/api/pets/hatchery");
}

async function hatchEgg(): Promise<HatchActionResponse> {
  return apiFetch<HatchActionResponse>("/api/pets/hatch", { method: "POST" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EggSlotButton(props: {
  slot: HatchSlot;
  isSelected: boolean;
  serverNowIso: string;
  onSelect: () => void;
  onHatch: () => void;
  isHatching: boolean;
}) {
  const { slot, isSelected, serverNowIso, onSelect, onHatch, isHatching } =
    props;

  const cd = useServerCountdown(
    slot.egg ? { serverNowIso, endsAtIso: slot.egg.hatch_ends_at } : null,
  );

  const timerLabel = slot.locked
    ? "LOCKED"
    : slot.egg
      ? cd.done
        ? "READY"
        : formatDuration(cd.remainingMs ?? 0)
      : "EMPTY";

  const canHatch = Boolean(slot.egg && cd.done && !slot.locked && !isHatching);

  return (
    <div
      className={[
        "eggSlotCard",
        isSelected ? "selected" : "",
        slot.locked ? "locked" : "",
        slot.egg ? "hasEgg" : "",
        slot.egg?.line ? `eggElement-${slot.egg.line}` : "",
      ].join(" ")}
    >
      <button
        type="button"
        className="eggSlot"
        onClick={() => {
          if (!slot.locked) onSelect();
        }}
        disabled={slot.locked}
        title={slot.egg ? slot.egg.name : `Egg ${slot.index}`}
      >
        <div className="eggSlotLeft">
          {slot.egg ? (
            <img
              className="eggIconImg"
              src={MYSTERY_EGG.sprite}
              alt={MYSTERY_EGG.name}
            />
          ) : (
            <div className="eggIcon" />
          )}
        </div>

        <div className="eggSlotMain">
          <div className="eggSlotTop">
            <div className="eggSlotTitle">Egg {slot.index}</div>
            <div className="eggSlotTimer">{timerLabel}</div>
          </div>
        </div>
      </button>

      <button
        type="button"
        className="primaryBtn rackHatchBtn"
        disabled={!canHatch}
        onClick={onHatch}
      >
        {isHatching && canHatch ? "Hatching..." : "Hatch Egg"}
      </button>
    </div>
  );
}

function ItemSlotButton(props: { slot: ShelfSlot }) {
  const { slot } = props;

  return (
    <div
      className={[
        "itemSlot",
        "itemSlotStatic",
        slot.locked ? "locked" : "unlocked",
      ].join(" ")}
    >
      <div className="itemSlotInner">
        <div className="itemSlotIndex">Shelf {slot.index}</div>
        <div className="itemSlotEmpty">
          {slot.locked ? "Locked" : slot.itemKey ? slot.itemKey : "Empty shelf"}
        </div>
      </div>
    </div>
  );
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function HatcheryPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<HatcheryResponse | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [isHatching, setIsHatching] = useState(false);

  const [serverNowBaseMs, setServerNowBaseMs] = useState<number | null>(null);
  const [fetchedAtLocalMs, setFetchedAtLocalMs] = useState<number | null>(null);
  const localNowMs = useNow(1000);

  // ─── Server clock sync ─────────────────────────────────────────────────────

  const serverNowIso = useMemo(() => {
    if (serverNowBaseMs == null || fetchedAtLocalMs == null) {
      return new Date().toISOString();
    }

    const driftedMs = serverNowBaseMs + (localNowMs - fetchedAtLocalMs);
    return new Date(driftedMs).toISOString();
  }, [serverNowBaseMs, fetchedAtLocalMs, localNowMs]);

  function syncServerClock(serverNow: string) {
    const serverMs = Date.parse(serverNow);

    if (Number.isFinite(serverMs)) {
      setServerNowBaseMs(serverMs);
      setFetchedAtLocalMs(Date.now());
      return;
    }

    setServerNowBaseMs(Date.now());
    setFetchedAtLocalMs(Date.now());
  }

  // ─── Auth guard ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/", { replace: true });
    }
  }, [authLoading, user, navigate]);

  // ─── Data loading + visibility-aware polling ───────────────────────────────
  //
  // BEFORE: setInterval fired every 30s unconditionally. The visibility check
  // was INSIDE load(), so the timer still ticked on hidden tabs and wasted
  // a closure execution every 30s even when doing nothing.
  //
  // AFTER:
  // - Interval only calls load() when the tab IS visible
  // - Switching back to the tab triggers an immediate refresh
  // - alive flag prevents state updates after unmount
  // - intervalId is tracked so cleanup is guaranteed even if auth changes

  useEffect(() => {
    if (authLoading || !user) return;

    let alive = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function load() {
      if (!alive) return;

      setLoadErr(null);

      try {
        const next = await fetchHatchery();
        if (!alive) return;

        setData(next);
        syncServerClock(next.server_now);
      } catch (e: any) {
        if (!alive) return;
        setLoadErr(e?.message ?? String(e));
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        // Tab came back into focus — refresh immediately so
        // countdown timers and egg states are never stale
        void load();
      }
    }

    // Initial load
    void load();

    // Poll only while tab is visible
    intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        void load();
      }
    }, POLL_INTERVAL_MS);

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      alive = false;

      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }

      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [authLoading, user]);

  // ─── Derived slot state ────────────────────────────────────────────────────

  const slots: HatchSlot[] = useMemo(() => {
    if (data?.slots && data.slots.length > 0) {
      return data.slots.map((slot) => ({
        index: slot.slot_index,
        locked: !slot.unlocked,
        egg:
          slot.pet && slot.pet.stage === "egg" && slot.hatch?.hatch_ends_at
            ? {
                id: slot.pet.id,
                name: slot.pet.name?.trim() || "Mystery Egg",
                hatch_ends_at: slot.hatch.hatch_ends_at,
                line: slot.pet.line ?? undefined,
                growth_strong_stats: slot.pet.growth_strong_stats ?? [],
                growth_weak_stat: slot.pet.growth_weak_stat ?? null,
              }
            : undefined,
      }));
    }

    const pet = data?.pet;
    const hatchEndsAt = data?.hatch?.hatch_ends_at ?? null;

    const slot1Egg =
      pet && pet.stage === "egg" && hatchEndsAt
        ? {
            id: pet.id,
            name: pet.name?.trim() || "Mystery Egg",
            hatch_ends_at: hatchEndsAt,
            line: pet.line ?? undefined,
            growth_strong_stats: pet.growth_strong_stats ?? [],
            growth_weak_stat: pet.growth_weak_stat ?? null,
          }
        : undefined;

    return Array.from({ length: 10 }, (_, idx) => ({
      index: idx + 1,
      locked: idx !== 0,
      egg: idx === 0 ? slot1Egg : undefined,
    }));
  }, [data]);

  const shelfSlots: ShelfSlot[] = useMemo(() => {
    if (data?.shelf_slots && data.shelf_slots.length > 0) {
      return data.shelf_slots.map((slot) => ({
        id: slot.id,
        index: slot.slot_index,
        locked: !slot.unlocked,
        itemKey: slot.item_key,
      }));
    }

    return Array.from({ length: 10 }, (_, idx) => ({
      id: `fallback-shelf-${idx + 1}`,
      index: idx + 1,
      locked: idx !== 0,
      itemKey: null,
    }));
  }, [data]);

  const [selectedSlot, setSelectedSlot] = useState<number | null>(1);

  useEffect(() => {
    if (slots.length === 0) {
      setSelectedSlot(1);
      return;
    }

    const currentStillExists = slots.some(
      (slot) => slot.index === selectedSlot,
    );

    if (!currentStillExists) {
      setSelectedSlot(1);
    }
  }, [slots, selectedSlot]);

  const selected =
    selectedSlot == null
      ? null
      : (slots.find((slot) => slot.index === selectedSlot) ?? null);

  const selectedEgg = selected?.egg ?? null;

  const selectedCd = useServerCountdown(
    selectedEgg ? { serverNowIso, endsAtIso: selectedEgg.hatch_ends_at } : null,
  );

  const countdownText = selectedEgg
    ? selectedCd.done
      ? "Ready to hatch"
      : `Hatches in ${formatDuration(selectedCd.remainingMs ?? 0)}`
    : "";

  const displayedStats = useMemo(() => {
    if (!selectedEgg) return EMPTY_STATS;
    return data?.stats ?? EMPTY_STATS;
  }, [selectedEgg, data?.stats]);

  const selectedEggTraits = useMemo(() => {
    return getEggGrowthTraits(selectedEgg);
  }, [selectedEgg]);

  // ─── Hatch flow ────────────────────────────────────────────────────────────

  async function refreshAfterHatch() {
    const next = await fetchHatchery();
    setData(next);
    setSelectedSlot(1);
    syncServerClock(next.server_now);
  }

  async function completeHatchFlow() {
    const hatchResult = await hatchEgg();
    syncServerClock(hatchResult.server_now);

    if (hatchResult.post_hatch_destination) {
      navigate(hatchResult.post_hatch_destination, { replace: true });
      return;
    }

    await refreshAfterHatch();
  }

  async function onHatchFromSlot(slot: HatchSlot) {
    if (!slot.egg || slot.locked || isHatching) return;

    const endsAtMs = Date.parse(slot.egg.hatch_ends_at);
    const nowMs = Date.parse(serverNowIso);

    if (!Number.isFinite(endsAtMs) || nowMs < endsAtMs) return;

    setSelectedSlot(slot.index);
    setIsHatching(true);

    try {
      await completeHatchFlow();
    } catch (e: any) {
      alert(e?.message ?? String(e));
    } finally {
      setIsHatching(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (authLoading) return null;

  return (
    <div className="hatcheryPage">
      <div className="hatcheryWorkbenchLayout">
        <div className="hatcheryLeftColumn">
          <section className="selectedEggPanel selectedEggPanelMain">
            <div className="panelHeader">
              <div>
                <div className="panelTitle">Selected Egg</div>
                <div className="panelSubtext">
                  Incubator chamber for the egg currently on your rack.
                </div>
              </div>
            </div>

            <div className="selectedEggPreviewArea">
              <div className="incubatorGlass" />

              {!selectedEgg ? (
                <div className="selectedPreviewEmpty" />
              ) : (
                <div className="selectedPreviewFilled">
                  <div className="selectedEggHalo" />

                  <img
                    className="eggBigImg"
                    src={MYSTERY_EGG.sprite}
                    alt={MYSTERY_EGG.name}
                  />

                  <div className="selectedText">
                    <div className="selectedPreviewEyebrow">Incubator Live</div>
                    <div className="selectedSub">{countdownText}</div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <div className="hatcheryBottomRow">
            <div className="hatcheryBottomRowInner">
              <section className="selectedEggStatsInset statsPanelBottom">
                <div className="panelTitle panelTitleSmall">
                  Selected Egg Stats
                </div>

                <div className="statsIntro">
                  {selectedEgg ? (
                    <span className="muted">Base Stats as an Egg</span>
                  ) : (
                    <span className="muted">Select an egg.</span>
                  )}
                </div>

                <div className="statsGrid compactStatsGrid">
                  {STAT_ROWS.map((row) => {
                    const isStrong = selectedEggTraits.strongStats.includes(
                      row.key,
                    );
                    const isWeak = selectedEggTraits.weakStat === row.key;

                    return (
                      <div
                        className={[
                          "statRow",
                          isStrong ? "statRowStrong" : "",
                          isWeak ? "statRowWeak" : "",
                        ].join(" ")}
                        key={row.key}
                      >
                        <div className="statLabel">{row.label}</div>
                        <div className="statValue">
                          {displayedStats[row.key]}
                        </div>
                      </div>
                    );
                  })}

                  <div className="statRow statRowTotal">
                    <div className="statLabel">TOTAL</div>
                    <div className="statValue">{displayedStats.base_total}</div>
                  </div>
                </div>

                <div className="eggTraitFlavorText">
                  {selectedEggTraits.flavorText}
                </div>
              </section>

              <aside className="incubationInsetPanel shelfPanelBottom">
                <div className="incubationInsetHeader">
                  <div className="panelTitle panelTitleSmall">
                    Incubation Shelf
                  </div>
                  <div className="panelSubtext">Hatch Items!</div>
                </div>

                <div className="itemsGrid">
                  {shelfSlots.map((slot) => (
                    <ItemSlotButton key={slot.id} slot={slot} />
                  ))}
                </div>
              </aside>
            </div>
          </div>
        </div>

        <section className="rackPanel rackPanelSide">
          <div className="panelHeader">
            <div>
              <div className="panelTitle">Egg Rack</div>
              <div className="panelSubtext">
                Put your egg on the rack and see what happens!
              </div>
            </div>
          </div>

          <div className="panelBody eggRackBody">
            <div className="eggGrid eggGridCompact">
              {slots.map((slot) => (
                <EggSlotButton
                  key={slot.index}
                  slot={slot}
                  isSelected={slot.index === selectedSlot}
                  serverNowIso={serverNowIso}
                  isHatching={isHatching}
                  onSelect={() => setSelectedSlot(slot.index)}
                  onHatch={() => void onHatchFromSlot(slot)}
                />
              ))}
            </div>

            {loadErr ? (
              <div className="muted hatcheryError">Error: {loadErr}</div>
            ) : null}
          </div>
        </section>

        <PetStoragePanel userId={user?.id} />
      </div>
    </div>
  );
}
