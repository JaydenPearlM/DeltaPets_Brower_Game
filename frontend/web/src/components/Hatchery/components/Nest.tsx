import "../styles/nest.css";
import {
  msUntil,
  formatDuration,
  useServerCountdown,
} from "../../../Pets_Design/auth/Timers";
import type { HatcheryEggVM } from "./types";

export function Nest(props: {
  slots?: HatcheryEggVM[]; // <-- optional now
  selectedSlot?: number; // <-- optional now
  serverNowIso: string;
  onSelectSlot: (slotIndex: number) => void;
}) {
  const {
    slots = [], // <-- default prevents map crash
    selectedSlot = 0,
    serverNowIso,
    onSelectSlot,
  } = props;

  return (
    <div className="nest">
      <div className="nest__bowl">
        <div className="nest__grid">
          {slots.map((slot, idx) => (
            <NestSlot
              key={`${idx}_${slot.egg?.id ?? "empty"}`}
              slot={slot}
              isSelected={idx === selectedSlot}
              serverNowIso={serverNowIso}
              onClick={() => {
                if (slot.locked) return;
                onSelectSlot(idx);
              }}
            />
          ))}
        </div>
      </div>

      <div className="nest__count">
        {slots.filter((s) => !!s.egg).length} / {slots.length} Eggs
      </div>
    </div>
  );
}

function NestSlot(props: {
  slot: HatcheryEggVM;
  isSelected: boolean;
  serverNowIso: string;
  onClick: () => void;
}) {
  const { slot, isSelected, serverNowIso, onClick } = props;

  if (slot.locked) {
    return (
      <button
        type="button"
        className={`eggSlot eggSlot--locked ${
          isSelected ? "eggSlot--selected" : ""
        }`}
        disabled
        onClick={onClick}
        title="Locked slot"
      >
        <div className="eggSlot__lock">🔒</div>
        <div className="eggSlot__lockedText">Locked</div>
      </button>
    );
  }

  if (!slot.egg) {
    return <div className="eggSlot eggSlot--empty" />;
  }

  const hatchIso = slot.hatchEndsAtIso;
  const remainingMs = hatchIso ? msUntil(hatchIso, Date.now()) : 0;

  const { msLeft, isReady } = useServerCountdown({
    serverNowIso,
    remainingMs,
    tickMs: 250,
  });

  return (
    <button
      type="button"
      className={`eggSlot ${isSelected ? "eggSlot--selected" : ""}`}
      onClick={onClick}
      title="Select egg"
    >
      <div className="eggSlot__timer">
        {!hatchIso ? "—" : isReady ? "READY!" : formatDuration(msLeft)}
      </div>

      <div className={`egg egg--${slot.shellElement}`}>
        <div className="egg__shine" />
      </div>
    </button>
  );
}
