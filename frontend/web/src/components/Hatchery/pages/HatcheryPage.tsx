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

type HatchItem = {
  id: string;
  name: string;
  effect: string;
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
}) {
  const { slot, isSelected, serverNowIso, onSelect } = props;

  const cd = useServerCountdown(
    slot.egg ? { serverNowIso, endsAtIso: slot.egg.hatch_ends_at } : null,
  );

  const label = slot.locked
    ? "LOCKED"
    : slot.egg
      ? cd.done
        ? "HATCH"
        : formatDuration(cd.remainingMs ?? 0)
      : "EMPTY";

  return (
    <button
      type="button"
      className={[
        "eggSlot",
        isSelected ? "selected" : "",
        slot.locked ? "locked" : "",
      ].join(" ")}
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
          <div className="eggSlotTimer">{label}</div>
        </div>

        <div className="eggName">
          {slot.locked ? "Locked" : slot.egg ? slot.egg.name : "No egg"}
        </div>

        <div className="eggMiniStats muted">
          {slot.locked ? "—" : slot.egg ? "Click to inspect" : "Empty slot"}
        </div>
      </div>
    </button>
  );
}

function ItemSlotButton(props: {
  index: number;
  item: HatchItem | null;
  onClick: () => void;
}) {
  const { index, item, onClick } = props;

  return (
    <button type="button" className="itemSlot" onClick={onClick}>
      <div className="itemSlotInner">
        <div className="itemSlotIndex">Shelf {index + 1}</div>

        {item ? (
          <div className="itemSlotContent">
            <div className="itemName">{item.name}</div>
            <div className="itemEffect">{item.effect}</div>
          </div>
        ) : (
          <div className="itemSlotEmpty">
            {index === 0 ? "Available shelf" : "Locked"}
          </div>
        )}
      </div>
    </button>
  );
}

function PetStoragePanel() {
  return (
    <aside className="storagePanel">
      <div className="panelHeader">
        <div className="panelTitle">Pet Storage</div>
      </div>

      <div className="panelBody storagePanelBody">
        <div className="storagePlaceholder">
          <div className="storagePlaceholderTitle">Stored Pets Box</div>
          <div className="storagePlaceholderText">
            This side can hold your stored pets, future party management, or
            quick pet selection.
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

    load();
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

  const [itemSlots, setItemSlots] = useState<Array<HatchItem | null>>(() => {
    const arr = new Array(6).fill(null) as Array<HatchItem | null>;
    arr[0] = {
      id: "item_1",
      name: "Heat Lamp",
      effect: "+10% hatch speed (later)",
    };
    return arr;
  });

  function handleClickItemSlot(idx: number) {
    setItemSlots((prev) => {
      const next = [...prev];

      if (idx !== 0 && !next[idx]) return prev;

      next[idx] = next[idx]
        ? null
        : {
            id: `item_demo_${idx}`,
            name: "Basic Incense",
            effect: "+3% hatch speed (later)",
          };

      return next;
    });
  }

  async function onHatchSelected() {
    if (!selectedEgg) return;

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
    }
  }

  if (authLoading) return null;

  return (
    <div className="hatcheryPage">
      <div className="hatcheryTwoColumnLayout">
        <main className="hatcheryMainColumn">
          <section className="selectedEggPanel">
            <div className="panelHeader">
              <div className="panelTitle">Selected Egg</div>
            </div>

            <div className="selectedEggTopStrip">
              <div className="selectedEggPreviewArea">
                {!selectedEgg ? (
                  <div className="selectedPreviewEmpty">
                    <div className="selectedPreviewEmptyTitle">
                      No egg selected.
                    </div>
                    <div className="selectedPreviewEmptyText">
                      Click an egg from the rack below to inspect it and view
                      its stats.
                    </div>
                  </div>
                ) : (
                  <div className="selectedPreviewFilled">
                    <img
                      className="eggBigImg"
                      src={MYSTERY_EGG.sprite}
                      alt={MYSTERY_EGG.name}
                    />

                    <div className="selectedText">
                      <div className="selectedName">{selectedEgg.name}</div>
                      <div className="selectedSub">{countdownText}</div>
                    </div>
                  </div>
                )}
              </div>

              <section className="selectedEggStatsInset">
                <div className="panelTitle panelTitleSmall">
                  Selected Egg Stats
                </div>

                <div className="statsIntro">
                  {selectedEgg ? (
                    <span className="muted">
                      Viewing stats for <strong>{selectedEgg.name}</strong>.
                    </span>
                  ) : (
                    <span className="muted">
                      Select an egg to see stats. Values stay at 0 until one is
                      clicked.
                    </span>
                  )}
                </div>

                <div className="statsGrid compactStatsGrid">
                  <div className="statRow">
                    <div className="statLabel">HP</div>
                    <div className="statValue">{displayedStats.hp}</div>
                  </div>
                  <div className="statRow">
                    <div className="statLabel">ATK</div>
                    <div className="statValue">{displayedStats.atk}</div>
                  </div>
                  <div className="statRow">
                    <div className="statLabel">MAGI</div>
                    <div className="statValue">{displayedStats.magi}</div>
                  </div>
                  <div className="statRow">
                    <div className="statLabel">DEF</div>
                    <div className="statValue">{displayedStats.def}</div>
                  </div>
                  <div className="statRow">
                    <div className="statLabel">SPD</div>
                    <div className="statValue">{displayedStats.spd}</div>
                  </div>
                  <div className="statRow">
                    <div className="statLabel">MANA</div>
                    <div className="statValue">{displayedStats.mana}</div>
                  </div>
                  <div className="statRow statRowTotal">
                    <div className="statLabel">TOTAL</div>
                    <div className="statValue">{displayedStats.base_total}</div>
                  </div>
                </div>

                {selectedEgg ? (
                  <button
                    type="button"
                    className="primaryBtn hatchActionBtn"
                    disabled={!selectedCd.done}
                    onClick={onHatchSelected}
                  >
                    Hatch
                  </button>
                ) : null}
              </section>

              <aside className="incubationInsetPanel">
                <div className="incubationInsetHeader">
                  <div className="panelTitle panelTitleSmall">
                    Incubation Shelf
                  </div>

                  <button
                    type="button"
                    className="smallBtn"
                    onClick={() => navigate("/pet")}
                  >
                    Back to Pet
                  </button>
                </div>

                <div className="itemsGrid">
                  {itemSlots.map((item, idx) => (
                    <ItemSlotButton
                      key={idx}
                      index={idx}
                      item={item}
                      onClick={() => handleClickItemSlot(idx)}
                    />
                  ))}
                </div>

                <div className="muted itemsHint">
                  Hatchery items will live here later. Shelf 1 is open first,
                  and the others unlock over time.
                </div>
              </aside>
            </div>
          </section>

          <section className="rackPanel">
            <div className="panelHeader">
              <div className="panelTitle">Egg Rack</div>
            </div>

            <div className="panelBody">
              <div className="eggGrid">
                {slots.map((slot) => (
                  <EggSlotButton
                    key={slot.index}
                    slot={slot}
                    isSelected={slot.index === selectedSlot}
                    serverNowIso={serverNowIso}
                    onSelect={() => setSelectedSlot(slot.index)}
                  />
                ))}
              </div>

              {loadErr ? (
                <div className="muted hatcheryError">Error: {loadErr}</div>
              ) : null}
            </div>
          </section>
        </main>

        <PetStoragePanel />
      </div>
    </div>
  );
}
