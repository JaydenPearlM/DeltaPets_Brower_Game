import "./SpinningDelta.css";

type SpinningDeltaProps = {
  size?: number;
  className?: string;
};

export function SpinningDelta({
  size = 44, // bigger by default
  className = "",
}: SpinningDeltaProps) {
  return (
    <div
      className={["dp-deltaSpinWrap", className].filter(Boolean).join(" ")}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
        className="dp-deltaSpin"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="dpRainbowStroke" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ff4d4d" />
            <stop offset="20%" stopColor="#ffd666" />
            <stop offset="40%" stopColor="#39ff14" />
            <stop offset="60%" stopColor="#3b82f6" />
            <stop offset="80%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ff4d4d" />
          </linearGradient>
        </defs>

        <polygon
          points="50,8 92,92 8,92"
          fill="none"
          stroke="url(#dpRainbowStroke)"
          strokeWidth="8"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
