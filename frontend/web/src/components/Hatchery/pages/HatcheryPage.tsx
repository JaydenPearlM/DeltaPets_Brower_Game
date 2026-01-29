import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../app/providers/useAuth";
import {
  formatDuration,
  useServerCountdown,
} from "../../../Pets_Design/auth/Timers";
import "./HatcheryPage.css";

type HatchSlot = {
  index: number;
  locked: boolean;
  egg?: { id: string; name: string; hatch_ends_at: string };
};

export default function HatcheryPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

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

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [authLoading, user, navigate]);

  const baseNowMs = useMemo(() => Date.now(), []);
  const slots: HatchSlot[] = useMemo(() => {
    const egg1Ends = new Date(baseNowMs + 2 * 60_000).toISOString();
    const egg2Ends = new Date(baseNowMs + 7 * 60_000).toISOString();

    const arr: HatchSlot[] = [];
    for (let i = 1; i <= 10; i++) {
      if (i === 1)
        arr.push({
          index: i,
          locked: false,
          egg: { id: "egg_1", name: "Warm Egg", hatch_ends_at: egg1Ends },
        });
      else if (i === 2)
        arr.push({
          index: i,
          locked: false,
          egg: { id: "egg_2", name: "Breezy Egg", hatch_ends_at: egg2Ends },
        });
      else arr.push({ index: i, locked: true });
    }
    return arr;
  }, [baseNowMs]);

  const [selectedSlot, setSelectedSlot] = useState(1);
  const selected = slots.find((s) => s.index === selectedSlot) ?? slots[0];
  const selectedEgg = selected.egg ?? null;

  const selectedCd = useServerCountdown(
    selectedEgg ? { serverNowIso, endsAtIso: selectedEgg.hatch_ends_at } : null,
  );

  if (authLoading) return null;

  return (
    <div className="hatchery">
      <div className="hatcheryTop">
        <h1>Hatchery</h1>
        <button type="button" onClick={() => navigate("/pet")}>
          Back to Pet
        </button>
      </div>

      <div className="hatcheryLayout">
        <div className="hatcheryGrid">
          {slots.map((slot) => {
            const isSelected = slot.index === selectedSlot;

            const cd = useServerCountdown(
              slot.egg
                ? { serverNowIso, endsAtIso: slot.egg.hatch_ends_at }
                : null,
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
                key={slot.index}
                type="button"
                className={`slot ${isSelected ? "selected" : ""} ${slot.locked ? "locked" : ""}`}
                onClick={() => {
                  if (!slot.locked) setSelectedSlot(slot.index);
                }}
                disabled={slot.locked}
              >
                <div className="slotHeader">
                  <div>Egg {slot.index}</div>
                  <div className="slotTimer">{label}</div>
                </div>

                <div className="slotBody">
                  <div className="eggPlaceholder" />
                  <div>
                    <div className="slotTitle">
                      {slot.locked
                        ? "Locked Slot"
                        : (slot.egg?.name ?? "No egg")}
                    </div>
                    <div className="slotHint">
                      {slot.locked ? "Unlock later" : "Click to view"}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <aside className="hatcheryPanel">
          <div className="panelTitle">Selected</div>

          <div className="panelCard">
            {!selectedEgg ? (
              <div className="panelSub">No egg selected.</div>
            ) : (
              <>
                <div className="panelRow">
                  <div className="eggLarge" />
                  <div>
                    <div className="panelEggName">{selectedEgg.name}</div>
                    <div className="panelSub">
                      {selectedCd.done
                        ? "Ready to hatch"
                        : `Hatches in ${formatDuration(selectedCd.remainingMs ?? 0)}`}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="hatchBtn"
                  disabled={!selectedCd.done}
                  onClick={() => alert("HATCH! (wire backend later)")}
                >
                  Hatch
                </button>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
