import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../app/providers/useAuth";
import { supabase } from "../../../lib/supabase/client";

import { formatDuration } from "../../../lib/timers/time";
import { useNow } from "../../../lib/timers/useNow";
import { useServerCountdown } from "../../../lib/timers/useServerCountdown";

import goldEggPng from "../../../Pets_Creation/assets/eggs/goldEgg.png";
import "./HatcheryPage.css";

const MYSTERY_EGG = {
  id: "mystery_egg",
  name: "Mystery Egg",
  sprite: goldEggPng,
};

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

type HatcheryResponse = {
  server_now: string;
  pet: {
    id: string;
    name?: string | null;
    stage?: string | null;
    line?: string | null;
  } | null;
  hatch: {
    ready: boolean;
    hatch_ends_at: string | null;
    hatch_remaining_ms: number;
  } | null;
  stats: PetStatsRow | null;
  elements: PetElementsRow | null;
};

type HatchEgg = {
  id: string;
  name: string;
  hatch_ends_at: string;
  line?: string;
};

type HatchSlot = {
  index: number;
  locked: boolean;
  egg?: HatchEgg;
};

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

const STAT_ROWS = [
  { key: "hp", label: "HP" },
  { key: "atk", label: "ATK" },
  { key: "magi", label: "MAGI" },
  { key: "def", label: "DEF" },
  { key: "spd", label: "SPD" },
  { key: "mana", label: "MANA" },
] as const;

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);

  const token = data.session?.access_token;
  if (!token) throw new Error("Missing access token. Are you logged in?");

  return token;
}

async function fetchJsonAuthed<T>(
  url: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });

  const data = (await res.json().catch(() => ({}))) as any;

  if (!res.ok) {
    throw new Error(data?.error ?? `Request failed (${res.status})`);
  }

  return data as T;
}

async function fetchHatchery(): Promise<HatcheryResponse> {
  const token = await getAccessToken();
  return fetchJsonAuthed<HatcheryResponse>("/api/pets/hatchery", token);
}

async function hatchEgg(): Promise<void> {
  const token = await getAccessToken();
  await fetchJsonAuthed("/api/pets/hatch", token, { method: "POST" });
}

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

function ItemSlotButton(props: { index: number; unlocked: boolean }) {
  const { index, unlocked } = props;

  return (
    <div
      className={[
        "itemSlot",
        "itemSlotStatic",
        unlocked ? "unlocked" : "locked",
      ].join(" ")}
    >
      <div className="itemSlotInner">
        <div className="itemSlotIndex">Shelf {index + 1}</div>
        <div className="itemSlotEmpty">
          {unlocked ? "Empty shelf" : "Locked"}
        </div>
      </div>
    </div>
  );
}

function PetStoragePanel() {
  return (
    <aside className="storagePanel">
      <div className="panelHeader">
        <div>
          <div className="panelTitle">Pet Storage</div>
          <div className="panelSubtext">
            Stored pets, quick swap tools, and future party management.
          </div>
        </div>
      </div>

      <div className="panelBody storagePanelBody">
        <div className="storagePlaceholder">
          <div className="storagePlaceholderTitle">Stored Pets Box</div>
          <div className="storagePlaceholderText">
            This side will hold your stored pets, sorting tools, and later
            bring-out / put-away controls.
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function HatcheryPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<HatcheryResponse | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [isHatching, setIsHatching] = useState(false);

  const [serverNowBaseMs, setServerNowBaseMs] = useState<number | null>(null);
  const [fetchedAtLocalMs, setFetchedAtLocalMs] = useState<number | null>(null);
  const localNowMs = useNow(1000);

  const serverNowIso = useMemo(() => {
    if (serverNowBaseMs == null || fetchedAtLocalMs == null) {
      return new Date().toISOString();
    }

    const driftedMs = serverNowBaseMs + (localNowMs - fetchedAtLocalMs);
    return new Date(driftedMs).toISOString();
  }, [serverNowBaseMs, fetchedAtLocalMs, localNowMs]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/", { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (authLoading || !user) return;

    let alive = true;

    async function load() {
      setLoadErr(null);

      try {
        const next = await fetchHatchery();
        if (!alive) return;

        setData(next);

        const serverMs = Date.parse(next.server_now);
        if (Number.isFinite(serverMs)) {
          setServerNowBaseMs(serverMs);
          setFetchedAtLocalMs(Date.now());
        } else {
          setServerNowBaseMs(Date.now());
          setFetchedAtLocalMs(Date.now());
        }
      } catch (e: any) {
        if (!alive) return;
        setLoadErr(e?.message ?? String(e));
      }
    }

    void load();
    const id = window.setInterval(load, 15_000);

    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [authLoading, user]);

  const slots: HatchSlot[] = useMemo(() => {
    const pet = data?.pet;
    const hatchEndsAt = data?.hatch?.hatch_ends_at ?? null;

    const slot1Egg =
      pet && pet.stage === "egg" && hatchEndsAt
        ? ({
            id: pet.id,
            name: pet.name?.trim() || "Mystery Egg",
            hatch_ends_at: hatchEndsAt,
            line: pet.line ?? undefined,
          } satisfies HatchEgg)
        : undefined;

    const arr: HatchSlot[] = [];
    arr.push({ index: 1, locked: false, egg: slot1Egg });
    arr.push({ index: 2, locked: false });

    for (let i = 3; i <= 10; i += 1) {
      arr.push({ index: i, locked: true });
    }

    return arr;
  }, [data]);

  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

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

  async function onHatchSelected() {
    if (!selectedEgg || isHatching) return;

    try {
      setIsHatching(true);
      await hatchEgg();

      try {
        const next = await fetchHatchery();
        setData(next);
        setSelectedSlot(null);
      } catch {
        // no-op
      }

      navigate("/pet", { replace: true });
    } catch (e: any) {
      alert(e?.message ?? String(e));
    } finally {
      setIsHatching(false);
    }
  }

  async function onHatchFromSlot(slot: HatchSlot) {
    if (!slot.egg || slot.locked || isHatching) return;

    const endsAtMs = Date.parse(slot.egg.hatch_ends_at);
    const nowMs = Date.parse(serverNowIso);

    if (!Number.isFinite(endsAtMs) || nowMs < endsAtMs) return;

    setSelectedSlot(slot.index);
    setIsHatching(true);

    try {
      await hatchEgg();

      try {
        const next = await fetchHatchery();
        setData(next);
        setSelectedSlot(null);
      } catch {
        // no-op
      }

      navigate("/pet", { replace: true });
    } catch (e: any) {
      alert(e?.message ?? String(e));
    } finally {
      setIsHatching(false);
    }
  }

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

              <button
                type="button"
                className="smallBtn"
                onClick={() => navigate("/pet")}
              >
                Back to Pet
              </button>
            </div>

            <div className="selectedEggPreviewArea">
              <div className="incubatorGlass" />

              {!selectedEgg ? (
                <div className="selectedPreviewEmpty"></div>
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
                    <div className="selectedName">{selectedEgg.name}</div>
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
                    <span className="muted">
                      Viewing stats for <strong>{selectedEgg.name}</strong>.
                    </span>
                  ) : (
                    <span className="muted">Select an egg.</span>
                  )}
                </div>

                <div className="statsGrid compactStatsGrid">
                  {STAT_ROWS.map((row) => (
                    <div className="statRow" key={row.key}>
                      <div className="statLabel">{row.label}</div>
                      <div className="statValue">{displayedStats[row.key]}</div>
                    </div>
                  ))}

                  <div className="statRow statRowTotal">
                    <div className="statLabel">TOTAL</div>
                    <div className="statValue">{displayedStats.base_total}</div>
                  </div>
                </div>

                {selectedEgg ? (
                  <button
                    type="button"
                    className="primaryBtn hatchActionBtn"
                    disabled={!selectedCd.done || isHatching}
                    onClick={onHatchSelected}
                  >
                    {isHatching ? "Hatching..." : "Hatch Egg"}
                  </button>
                ) : null}
              </section>

              <aside className="incubationInsetPanel shelfPanelBottom">
                <div className="incubationInsetHeader">
                  <div className="panelTitle panelTitleSmall">
                    Incubation Shelf
                  </div>
                  <div className="panelSubtext">
                    Hatchery items will go here later.
                  </div>
                </div>

                <div className="itemsGrid">
                  {Array.from({ length: 10 }, (_, idx) => (
                    <ItemSlotButton
                      key={idx}
                      index={idx}
                      unlocked={idx === 0}
                    />
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
                Compact hatch slots and timers.
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

        <PetStoragePanel />
      </div>
    </div>
  );
}
