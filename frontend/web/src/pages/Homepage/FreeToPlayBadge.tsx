import "./FreeToPlayBadge.css";

export function FreeToPlayBadge() {
  return (
    <div className="dp-free-to-play" aria-label="Free to Play">
      <span className="dp-free-to-play__edge dp-free-to-play__edge--left" />

      <span className="dp-free-to-play__word dp-free-to-play__word--free">
        FREE
      </span>

      <span className="dp-free-to-play__delta" aria-hidden="true">
        <svg viewBox="0 0 120 108" className="dp-free-to-play__delta-svg">
          <defs>
            <linearGradient
              id="dp-free-to-play-rainbow"
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <stop offset="0%" stopColor="var(--dp-brand-yellow-bright)" />
              <stop offset="17%" stopColor="var(--dp-brand-orange)" />
              <stop offset="34%" stopColor="var(--dp-brand-red)" />
              <stop offset="52%" stopColor="var(--dp-skill-purple)" />
              <stop offset="70%" stopColor="var(--dp-cyber-blue)" />
              <stop offset="86%" stopColor="var(--dp-cyber-cyan)" />
              <stop offset="100%" stopColor="var(--accent-green-neon)" />
            </linearGradient>
          </defs>

          <path
            d="M60 9 L111 99 H9 Z"
            fill="none"
            stroke="url(#dp-free-to-play-rainbow)"
            strokeWidth="7"
            strokeLinejoin="round"
          />
        </svg>

        <span className="dp-free-to-play__to">TO</span>
      </span>

      <span className="dp-free-to-play__word dp-free-to-play__word--play">
        PLAY
      </span>

      <span className="dp-free-to-play__edge dp-free-to-play__edge--right" />
    </div>
  );
}

export default FreeToPlayBadge;
