import "../styles/hatchery.css";
import {
  msUntil,
  formatDuration,
  useServerCountdown,
} from "../../../Pets_Design/auth/Timers";
import type { HatcheryEggVM } from "../../../../../types";

export function EggInfoPanel(props: {
  slot: HatcheryEggVM | null;
  serverNowIso: string;
}) {
  const { slot, serverNowIso } = props;

  if (!slot || slot.locked || !slot.egg || !slot.pet) {
    return (
      <div className="eggInfo eggInfo--empty">
        <div className="eggInfo__title">Egg Info</div>
        <div className="eggInfo__sub">Select an egg to view stats.</div>
      </div>
    );
  }

  const hatchIso = slot.hatchEndsAtIso;

  const cd = useServerCountdown(
    hatchIso ? { serverNowIso, endsAtIso: hatchIso } : null,
  );

  const msLeft = cd.remainingMs ?? 0;
  const isReady = !!cd.done;

  const base = slot.base;
  const iv = slot.iv;

  const total = {
    hp: base.hp + iv.hp,
    atk: base.atk + iv.atk,
    magic: base.magic + iv.magic,
    def: base.def + iv.def,
    spd: base.spd + iv.spd,
    mana: base.mana + iv.mana,
  };

  return (
    <div className="eggInfo">
      <div className="eggInfo__title">Egg Info</div>
      <div className="eggInfo__sub">Level 0 (Base + IV)</div>

      <div className="eggInfo__row">
        <span>Shell Element</span>
        <span className="eggInfo__value">{slot.shellElement}</span>
      </div>

      <div className="eggInfo__row">
        <span>Pet Line</span>
        <span className="eggInfo__value">{slot.pet.line ?? "null"}</span>
      </div>

      <div className="eggInfo__row">
        <span>Gender</span>
        <span className="eggInfo__value">{slot.gender}</span>
      </div>

      <div className="eggInfo__row">
        <span>Elements</span>
        <span className="eggInfo__value">
          {slot.elementsForDisplay.join(", ")}
        </span>
      </div>

      <div className="eggInfo__divider" />

      <div className="eggInfo__sub" style={{ opacity: 0.85 }}>
        Total
      </div>
      <div className="eggInfo__row">
        <span>HP</span>
        <span className="eggInfo__value">{total.hp}</span>
      </div>
      <div className="eggInfo__row">
        <span>ATK</span>
        <span className="eggInfo__value">{total.atk}</span>
      </div>
      <div className="eggInfo__row">
        <span>MAGIC</span>
        <span className="eggInfo__value">{total.magic}</span>
      </div>
      <div className="eggInfo__row">
        <span>DEF</span>
        <span className="eggInfo__value">{total.def}</span>
      </div>
      <div className="eggInfo__row">
        <span>SPD</span>
        <span className="eggInfo__value">{total.spd}</span>
      </div>
      <div className="eggInfo__row">
        <span>MANA</span>
        <span className="eggInfo__value">{total.mana}</span>
      </div>

      <div className="eggInfo__divider" />

      <div className="eggInfo__sub" style={{ opacity: 0.85 }}>
        Breakdown
      </div>
      <div className="eggInfo__row">
        <span>Base</span>
        <span className="eggInfo__value">
          HP {base.hp} • ATK {base.atk} • MAG {base.magic} • DEF {base.def} •
          SPD {base.spd} • MANA {base.mana}
        </span>
      </div>
      <div className="eggInfo__row">
        <span>IV</span>
        <span className="eggInfo__value">
          HP {iv.hp} • ATK {iv.atk} • MAG {iv.magic} • DEF {iv.def} • SPD{" "}
          {iv.spd} • MANA {iv.mana}
        </span>
      </div>
      <div className="eggInfo__row">
        <span>IV Total</span>
        <span className="eggInfo__value">{slot.ivTotal} / 20</span>
      </div>

      <div className="eggInfo__divider" />

      <div className="eggInfo__row">
        <span>Hatch Time</span>
        <span className="eggInfo__value">
          {!hatchIso ? "—" : isReady ? "READY!" : formatDuration(msLeft)}
        </span>
      </div>
    </div>
  );
}
