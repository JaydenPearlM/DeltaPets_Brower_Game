import "../styles/hatchery.css";
import {
  msUntil,
  formatDuration,
  useServerCountdown,
} from "../../../features/auth/Timers";
import type { HatcheryEgg } from "../../../features/auth/pets/elements";

export function EggInfoPanel(props: {
  egg: HatcheryEgg | null;
  serverNowIso: string;
}) {
  const { egg, serverNowIso } = props;

  if (!egg) {
    return (
      <div className="eggInfo eggInfo--empty">
        <div className="eggInfo__title">Egg Info</div>
        <div className="eggInfo__sub">Select an egg to view stats.</div>
      </div>
    );
  }

  const remainingMs = msUntil(egg.hatch_ends_at, Date.now());
  const { msLeft, isReady } = useServerCountdown({
    serverNowIso,
    remainingMs,
    tickMs: 250,
  });

  return (
    <div className="eggInfo">
      <div className="eggInfo__title">Egg Info</div>
      <div className="eggInfo__sub">Level 0 Stats</div>

      <div className="eggInfo__row">
        <span>Element</span>
        <span className="eggInfo__value">{egg.element}</span>
      </div>

      <div className="eggInfo__divider" />

      <div className="eggInfo__row">
        <span>Power</span>
        <span className="eggInfo__value">{egg.base_stats.power}</span>
      </div>
      <div className="eggInfo__row">
        <span>Defense</span>
        <span className="eggInfo__value">{egg.base_stats.defense}</span>
      </div>
      <div className="eggInfo__row">
        <span>Speed</span>
        <span className="eggInfo__value">{egg.base_stats.speed}</span>
      </div>
      <div className="eggInfo__row">
        <span>Luck</span>
        <span className="eggInfo__value">{egg.base_stats.luck}</span>
      </div>

      <div className="eggInfo__divider" />

      <div className="eggInfo__row">
        <span>Hatch Time</span>
        <span className="eggInfo__value">
          {isReady ? "READY!" : formatDuration(msLeft)}
        </span>
      </div>
    </div>
  );
}
