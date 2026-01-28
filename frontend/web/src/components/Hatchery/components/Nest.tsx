import "../styles/nest.css";
import {
  msUntil,
  formatDuration,
  useServerCountdown,
} from "../../../features/auth/Timers";
import type { HatcheryEgg } from "../../../features/auth/pets/elements";

export function Nest(props: {
  eggs: Array<HatcheryEgg | null>;
  selectedEggId: string | null;
  serverNowIso: string;
  onSelectEgg: (eggId: string) => void;
}) {
  const { eggs, selectedEggId, serverNowIso, onSelectEgg } = props;

  return (
    <div className="nest">
      <div className="nest__bowl">
        {eggs.map((egg, idx) => (
          <NestSlot
            key={egg?.id ?? `empty_${idx}`}
            egg={egg}
            isSelected={!!egg && egg.id === selectedEggId}
            serverNowIso={serverNowIso}
            onClick={() => egg && onSelectEgg(egg.id)}
          />
        ))}
      </div>

      <div className="nest__count">
        {eggs.filter(Boolean).length} / {eggs.length} Eggs
      </div>
    </div>
  );
}

function NestSlot(props: {
  egg: HatcheryEgg | null;
  isSelected: boolean;
  serverNowIso: string;
  onClick: () => void;
}) {
  const { egg, isSelected, serverNowIso, onClick } = props;

  if (!egg) {
    return <div className="eggSlot eggSlot--empty" />;
  }

  const remainingMs = msUntil(egg.hatch_ends_at, Date.now());
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
        {isReady ? "READY!" : formatDuration(msLeft)}
      </div>

      <div className={`egg egg--${egg.element}`}>
        <div className="egg__shine" />
      </div>
    </button>
  );
}
