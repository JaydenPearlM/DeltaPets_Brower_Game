import { useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Stats = {
  name: string; hpCur: number; hpMax: number;
  atk: number; def: number; magi: number; spd: number; mana?: number;
};

export default function WildwoodStats({ pet, children }: { pet: Stats; children: ReactNode }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className="ww-stat-info" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" className="ww-stat-trigger"
        aria-label={`${pet.name} stats, Speed ${pet.spd}`}
        aria-describedby={open ? id : undefined}
        onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
        {children}
      </button>
      {open && createPortal(
        <span id={id} role="tooltip" className="ww-stat-tooltip">
          <strong>{pet.name}</strong>
          <span>HP {pet.hpCur} / {pet.hpMax}</span>
          <span>ATK {pet.atk} · DEF {pet.def}</span>
          <span>MAGI {pet.magi} · SPD {pet.spd}</span>
          <span>Mana {pet.mana ?? "Unavailable"}</span>
        </span>, document.body)}
    </span>
  );
}
