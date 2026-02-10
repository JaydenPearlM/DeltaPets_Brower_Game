import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../app/providers/useAuth";
import { supabase } from "../../../lib/supabase/client";
import {
  formatDuration,
  useNow,
  useServerCountdown,
} from "../../../Pets_Design/auth/Timers";

import { MYSTERY_EGG } from "../../../assets/eggs/eggType";

import "./HatcheryPage.css";

console.log("Egg sprite URL:", MYSTERY_EGG.sprite);

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
  pet: any | null;
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
  name: string; // "Gold Egg"
  hatch_ends_at: string; // ISO
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
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data as T;
}

// ✅ Hatchery uses /api/pets/hatchery (NOT /active)
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
          {slot.locked ? "Locked" : (slot.egg?.name ?? "No egg")}
        </div>

        <div className="eggMiniStats muted">
          {slot.locked ? "—" : slot.egg ? "Select" : "Empty slot"}
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
        <div className="itemSlotIndex">{index + 1}</div>
        {item ? (
          <div className="itemSlotContent">
            <div className="itemName">{item.name}</div>
            <div className="itemEffect">{item.effect}</div>
          </div>
        ) : (
          <div className="itemSlotEmpty">Empty</div>
        )}
      </div>
    </button>
  );
}

function SelectedEggStatsPanel(props: {
  egg: HatchEgg | null;
  stats: PetStatsRow | null;
  elements: PetElementsRow | null;
}) {
  const { egg, stats, elements } = props;

  const elementPairs = useMemo(() => {
    if (!elements) return [];
    const keys: Array<keyof PetElementsRow> = [
      "water",
      "fire",
      "earth",
      "air",
      "ice",
      "storm",
      "light",
      "shadow",
    ];
    return keys
      .map((k) => [k, elements[k] as number] as const)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [elements]);

  return (
    <div className="statsPanel">
      <div className="panelHeader">
        <div className="panelTitle">Selected Egg Stats</div>
      </div>

      <div className="panelBody">
        {!egg ? (
          <div className="muted">Select an egg to see stats.</div>
        ) : !stats ? (
          <div className="muted">Stats not loaded yet.</div>
        ) : (
          <>
            <div className="statsGrid">
              <div className="statRow">
                <div className="statLabel">HP</div>
                <div className="statValue">{stats.hp}</div>
              </div>
              <div className="statRow">
                <div className="statLabel">ATK</div>
                <div className="statValue">{stats.atk}</div>
              </div>
              <div className="statRow">
                <div className="statLabel">MAGI</div>
                <div className="statValue">{stats.magi}</div>
              </div>
              <div className="statRow">
                <div className="statLabel">DEF</div>
                <div className="statValue">{stats.def}</div>
              </div>
              <div className="statRow">
                <div className="statLabel">SPD</div>
                <div className="statValue">{stats.spd}</div>
              </div>
              <div className="statRow">
                <div className="statLabel">MANA</div>
                <div className="statValue">{stats.mana}</div>
              </div>
              <div className="statRow">
                <div className="statLabel">Total</div>
                <div className="statValue">{stats.base_total}</div>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="muted" style={{ marginBottom: 6 }}>
                Elements
              </div>
              {elementPairs.length === 0 ? (
                <div className="muted">None</div>
              ) : (
                <div className="eggMiniStats">
                  {elementPairs.map(([k, v], idx) => (
                    <span key={String(k)}>
                      {String(k)} {v}
                      {idx < elementPairs.length - 1 ? (
                        <span className="dot">•</span>
                      ) : null}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function HatcheryPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<HatcheryResponse | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  // Server-time drift handling (your approach is good)
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
    if (!authLoading && !user) navigate("/", { replace: true });
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
          // If backend didn't send a usable server time, just fall back to local
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
            name: "Mystery Egg",
            hatch_ends_at: hatchEndsAt,
            line: pet.line ?? undefined,
          } satisfies HatchEgg)
        : undefined;

    const arr: HatchSlot[] = [];
    arr.push({ index: 1, locked: false, egg: slot1Egg });
    arr.push({ index: 2, locked: false });
    for (let i = 3; i <= 10; i++) arr.push({ index: i, locked: true });
    return arr;
  }, [data]);

  const [selectedSlot, setSelectedSlot] = useState<number>(1);
  const selected = slots.find((s) => s.index === selectedSlot) ?? slots[0];
  const selectedEgg = selected.egg ?? null;

  const selectedCd = useServerCountdown(
    selectedEgg ? { serverNowIso, endsAtIso: selectedEgg.hatch_ends_at } : null,
  );

  const [itemSlots, setItemSlots] = useState<Array<HatchItem | null>>(() => {
    const arr = new Array(10).fill(null) as Array<HatchItem | null>;
    arr[0] = {
      id: "item_1",
      name: "Heat Lamp",
      effect: "+10% hatch speed (later)",
    };
    arr[1] = { id: "item_2", name: "Lucky Charm", effect: "+2 luck (later)" };
    return arr;
  });

  function handleClickItemSlot(idx: number) {
    setItemSlots((prev) => {
      const next = [...prev];
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

      // Optional but nice: refresh hatchery state once after hatching
      try {
        const next = await fetchHatchery();
        setData(next);
      } catch {
        // ignore, since we're navigating anyway
      }

      navigate("/pet", { replace: true });
    } catch (e: any) {
      alert(e?.message ?? String(e));
    }
  }

  if (authLoading) return null;

  return (
    <div className="hatcheryPage">
      <div className="hatcheryLayout">
        <aside className="leftCol">
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
            <div className="muted" style={{ paddingTop: 10 }}>
              Error: {loadErr}
            </div>
          ) : null}
        </aside>

        <main className="midCol">
          <div className="selectedPanel">
            <div className="panelHeader">
              <div className="panelTitle">Selected Egg</div>
            </div>

            <div className="panelBody">
              {!selectedEgg ? (
                <div className="muted">
                  {selected.locked
                    ? "Slot locked."
                    : "No egg in this slot (yet)."}
                </div>
              ) : (
                <>
                  <div className="selectedRow">
                    <img
                      className="eggBigImg"
                      src={MYSTERY_EGG.sprite}
                      alt={MYSTERY_EGG.name}
                    />
                    <div className="selectedText">
                      <div className="selectedName">{selectedEgg.name}</div>
                      <div className="selectedSub">
                        {selectedCd.done
                          ? "Ready to hatch"
                          : `Hatches in ${formatDuration(selectedCd.remainingMs ?? 0)}`}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="primaryBtn"
                    disabled={!selectedCd.done}
                    onClick={onHatchSelected}
                  >
                    Hatch
                  </button>
                </>
              )}
            </div>
          </div>

          <SelectedEggStatsPanel
            egg={selectedEgg}
            stats={data?.stats ?? null}
            elements={data?.elements ?? null}
          />
        </main>

        <aside className="rightCol">
          <div className="itemsPanel">
            <div className="panelHeader">
              <div className="panelTitle">Egg Items</div>
              <button
                type="button"
                className="smallBtn"
                onClick={() => navigate("/pet")}
              >
                Back to Pet
              </button>
            </div>

            <div className="panelBody">
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
                Click a slot to toggle an item (demo).
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
