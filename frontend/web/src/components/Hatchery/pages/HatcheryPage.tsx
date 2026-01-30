// frontend/web/src/components/Hatchery/pages/HatcheryPage.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../app/providers/useAuth";
import {
  formatDuration,
  useServerCountdown,
} from "../../../Pets_Design/auth/Timers";
import "./HatcheryPage.css";

type EggStats = {
  hatchSpeedBonusPct: number;
  luckBonus: number;
  elementBias?: string;
};

type HatchEgg = {
  id: string;
  name: string;
  hatch_ends_at: string; // ISO
  stats: EggStats;
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
        <div className="eggIcon" />
      </div>

      <div className="eggSlotMain">
        <div className="eggSlotTop">
          <div className="eggSlotTitle">Egg {slot.index}</div>
          <div className="eggSlotTimer">{label}</div>
        </div>

        <div className="eggName">
          {slot.locked ? "Locked" : (slot.egg?.name ?? "No egg")}
        </div>

        {!slot.locked && slot.egg ? (
          <div className="eggMiniStats">
            <span>+{slot.egg.stats.hatchSpeedBonusPct}%</span>
            <span className="dot">•</span>
            <span>Luck +{slot.egg.stats.luckBonus}</span>
          </div>
        ) : (
          <div className="eggMiniStats muted">
            {slot.locked ? "—" : "Select"}
          </div>
        )}
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

function SelectedEggStatsPanel(props: { egg: HatchEgg | null }) {
  const { egg } = props;

  return (
    <div className="statsPanel">
      <div className="panelHeader">
        <div className="panelTitle">Selected Egg Stats</div>
      </div>

      <div className="panelBody">
        {!egg ? (
          <div className="muted">Select an egg to see stats.</div>
        ) : (
          <div className="statsGrid">
            <div className="statRow">
              <div className="statLabel">Hatch Speed Bonus</div>
              <div className="statValue">+{egg.stats.hatchSpeedBonusPct}%</div>
            </div>
            <div className="statRow">
              <div className="statLabel">Luck Bonus</div>
              <div className="statValue">+{egg.stats.luckBonus}</div>
            </div>
            <div className="statRow">
              <div className="statLabel">Element Bias</div>
              <div className="statValue">{egg.stats.elementBias ?? "None"}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HatcheryPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // server "now" tick (client-side for now)
  const [serverNowIso, setServerNowIso] = useState(() =>
    new Date().toISOString(),
  );
  useEffect(() => {
    const id = window.setInterval(
      () => setServerNowIso(new Date().toISOString()),
      1000,
    );
    return () => window.clearInterval(id);
  }, []);

  // auth gate
  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [authLoading, user, navigate]);

  // demo hatch slots
  const baseNowMs = useMemo(() => Date.now(), []);
  const slots: HatchSlot[] = useMemo(() => {
    const egg1Ends = new Date(baseNowMs + 2 * 60_000).toISOString();
    const egg2Ends = new Date(baseNowMs + 7 * 60_000).toISOString();

    const arr: HatchSlot[] = [];
    for (let i = 1; i <= 10; i++) {
      if (i === 1) {
        arr.push({
          index: i,
          locked: false,
          egg: {
            id: "egg_1",
            name: "Warm Egg",
            hatch_ends_at: egg1Ends,
            stats: {
              hatchSpeedBonusPct: 0,
              luckBonus: 1,
              elementBias: "light",
            },
          },
        });
      } else if (i === 2) {
        arr.push({
          index: i,
          locked: false,
          egg: {
            id: "egg_2",
            name: "Breezy Egg",
            hatch_ends_at: egg2Ends,
            stats: { hatchSpeedBonusPct: 5, luckBonus: 0, elementBias: "air" },
          },
        });
      } else {
        arr.push({ index: i, locked: true });
      }
    }
    return arr;
  }, [baseNowMs]);

  const [selectedSlot, setSelectedSlot] = useState<number>(1);
  const selected = slots.find((s) => s.index === selectedSlot) ?? slots[0];
  const selectedEgg = selected.egg ?? null;

  // Selected egg countdown (safe)
  const selectedCd = useServerCountdown(
    selectedEgg ? { serverNowIso, endsAtIso: selectedEgg.hatch_ends_at } : null,
  );

  // Right: 10 item slots (demo)
  const [itemSlots, setItemSlots] = useState<Array<HatchItem | null>>(() => {
    const arr = new Array(10).fill(null) as Array<HatchItem | null>;
    arr[0] = { id: "item_1", name: "Heat Lamp", effect: "+10% hatch speed" };
    arr[1] = { id: "item_2", name: "Lucky Charm", effect: "+2 luck" };
    return arr;
  });

  function handleClickItemSlot(idx: number) {
    // demo toggle
    setItemSlots((prev) => {
      const next = [...prev];
      if (next[idx]) next[idx] = null;
      else
        next[idx] = {
          id: `item_demo_${idx}`,
          name: "Basic Incense",
          effect: "+3% hatch speed",
        };
      return next;
    });
  }

  if (authLoading) return null;

  return (
    <div className="hatcheryPage">
      <div className="hatcheryLayout">
        {/* LEFT: compact egg slots */}
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
        </aside>

        {/* MIDDLE: selected egg + stats underneath */}
        <main className="midCol">
          <div className="selectedPanel">
            <div className="panelHeader">
              <div className="panelTitle">Selected Egg</div>
            </div>

            <div className="panelBody">
              {!selectedEgg ? (
                <div className="muted">No egg selected.</div>
              ) : (
                <>
                  <div className="selectedRow">
                    <div className="eggBig" />
                    <div className="selectedText">
                      <div className="selectedName">{selectedEgg.name}</div>
                      <div className="selectedSub">
                        {selectedCd.done
                          ? "Ready to hatch"
                          : `Hatches in ${formatDuration(selectedCd.remainingMs ?? 0)}`}
                      </div>
                      <div className="selectedMini">
                        Speed +{selectedEgg.stats.hatchSpeedBonusPct}% • Luck +
                        {selectedEgg.stats.luckBonus}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="primaryBtn"
                    disabled={!selectedCd.done}
                    onClick={() => alert("HATCH! (wire backend later)")}
                  >
                    Hatch
                  </button>
                </>
              )}
            </div>
          </div>

          <SelectedEggStatsPanel egg={selectedEgg} />
        </main>

        {/* RIGHT: items + back */}
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
