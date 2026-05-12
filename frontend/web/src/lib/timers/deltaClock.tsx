import "./deltaClock.css";
import { useDeltaTime } from "./useDeltaTime";

type DeltaClockProps = {
  label?: string;
  showDay?: boolean;
};

export function DeltaClock(props: DeltaClockProps = {}) {
  const { label = "ALIUNE TIME" } = props;
  const deltaTime = useDeltaTime();

  return (
    <div
      className={`deltaClock deltaClock--${deltaTime.phase}`}
      role="timer"
      aria-live="polite"
      aria-label={`${label}: ${deltaTime.digital12} ${deltaTime.phaseLabel}`}
    >
      <div className="deltaClock__primaryRow">
        <span className="deltaClock__mark">△</span>

        <div className="deltaClock__textStack">
          <span className="deltaClock__time">{deltaTime.digital12}</span>
          <span className="deltaClock__phase">
            {deltaTime.phaseLabel.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}

export default DeltaClock;
