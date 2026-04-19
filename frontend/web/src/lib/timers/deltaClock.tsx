import "./deltaClock.css";
import { useDeltaTime } from "./useDeltaTime";

type DeltaClockProps = {
  label?: string;
  showDay?: boolean;
};

export function DeltaClock(props: DeltaClockProps = {}) {
  const { label = "ALIUNE TIME", showDay = false } = props;
  const deltaTime = useDeltaTime();

  return (
    <div
      className={`deltaClock deltaClock--${deltaTime.phase}`}
      role="timer"
      aria-live="polite"
      aria-label={`${label}: ${deltaTime.digital12} ${deltaTime.phaseLabel}`}
    >
      <div className="deltaClock__label">{label}</div>

      <div className="deltaClock__primaryRow">
        <span className="deltaClock__time">{deltaTime.digital12}</span>
        <span className="deltaClock__phase">
          {deltaTime.phaseLabel.toUpperCase()}
        </span>
      </div>

      <div className="deltaClock__secondaryRow">
        <span className="deltaClock__time24">{deltaTime.digital24} ΔT</span>
        {showDay ? (
          <span className="deltaClock__day">DAY {deltaTime.deltaDay}</span>
        ) : null}
      </div>
    </div>
  );
}

export default DeltaClock;
