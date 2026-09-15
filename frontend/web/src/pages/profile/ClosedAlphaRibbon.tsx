export function ClosedAlphaRibbon() {
  return (
    <div
      className="dp-profile-alpha-ribbon-art"
      aria-label="Closed Alpha Tester ribbon"
      title="Closed Alpha Tester"
    >
      <svg
        className="dp-profile-alpha-ribbon-svg"
        viewBox="0 0 560 190"
        role="img"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="alphaRibbonBodyGradient"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor="#123f78" />
            <stop offset="52%" stopColor="#0b2e5b" />
            <stop offset="100%" stopColor="#071f42" />
          </linearGradient>

          <linearGradient
            id="alphaRibbonRainbowTriangle"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop offset="0%" stopColor="#ff4d6d" />
            <stop offset="16%" stopColor="#ff9f1c" />
            <stop offset="32%" stopColor="#ffe45e" />
            <stop offset="50%" stopColor="#4cd964" />
            <stop offset="68%" stopColor="#35c6ff" />
            <stop offset="84%" stopColor="#7b61ff" />
            <stop offset="100%" stopColor="#d96bff" />
          </linearGradient>

          <filter id="alphaTriangleGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <clipPath id="alphaRibbonClip">
            <path
              d="
                M92 84
                Q280 66 468 84
                V150
                Q280 166 92 150
                Z
              "
            />
          </clipPath>
        </defs>

        {/* Bright rainbow triangle outline behind ribbon */}
        <path
          d="M280 14 L386 172 H174 Z"
          fill="none"
          stroke="url(#alphaRibbonRainbowTriangle)"
          strokeWidth="8"
          strokeLinejoin="round"
          opacity="0.35"
          filter="url(#alphaTriangleGlow)"
        />

        <path
          d="M280 14 L386 172 H174 Z"
          fill="none"
          stroke="url(#alphaRibbonRainbowTriangle)"
          strokeWidth="6"
          strokeLinejoin="round"
          opacity="0.95"
        />

        <path
          d="M280 14 L386 172 H174 Z"
          fill="none"
          stroke="url(#alphaRibbonRainbowTriangle)"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* Left ribbon */}
        <path
          d="M18 92 H116 V146 H18 L36 120 Z"
          fill="#0a2346"
          stroke="#d9b248"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* Right ribbon */}
        <path
          d="M542 92 H444 V146 H542 L524 120 Z"
          fill="#0a2346"
          stroke="#d9b248"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* Side cyan accents */}
        <path
          d="M34 102 H95"
          fill="none"
          stroke="#2bd6ff"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.75"
        />

        <path
          d="M526 102 H465"
          fill="none"
          stroke="#2bd6ff"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.75"
        />

        {/* Main ribbon body */}
        <path
          d="
            M92 84
            Q280 66 468 84
            V150
            Q280 166 92 150
            Z
          "
          fill="url(#alphaRibbonBodyGradient)"
          stroke="#e0b94d"
          strokeWidth="4"
        />

        {/* Inner cyan line */}
        <path
          d="
            M106 95
            Q280 80 454 95
            V139
            Q280 153 106 139
            Z
          "
          fill="none"
          stroke="#2bd6ff"
          strokeWidth="2"
          opacity="0.7"
        />

        {/* Blue grid */}
        <g
          clipPath="url(#alphaRibbonClip)"
          stroke="#30d9ff"
          strokeWidth="1.2"
          opacity="0.23"
        >
          <line x1="135" y1="78" x2="135" y2="156" />
          <line x1="175" y1="76" x2="175" y2="158" />
          <line x1="215" y1="74" x2="215" y2="160" />
          <line x1="255" y1="72" x2="255" y2="162" />
          <line x1="295" y1="72" x2="295" y2="162" />
          <line x1="335" y1="74" x2="335" y2="160" />
          <line x1="375" y1="76" x2="375" y2="158" />
          <line x1="415" y1="78" x2="415" y2="156" />

          <line x1="95" y1="104" x2="465" y2="104" />
          <line x1="95" y1="121" x2="465" y2="121" />
          <line x1="95" y1="138" x2="465" y2="138" />
        </g>

        {/* Main text */}
        <text
          x="280"
          y="120"
          textAnchor="middle"
          fill="#f6dc73"
          fontSize="27"
          fontWeight="800"
          letterSpacing="0.8"
          stroke="#08192d"
          strokeWidth="4"
          paintOrder="stroke"
          strokeLinejoin="round"
        >
          Closed Alpha Tester
        </text>

        {/* Subtext */}
        <text
          x="280"
          y="139"
          textAnchor="middle"
          fill="#98e9ff"
          fontSize="11"
          fontWeight="700"
          letterSpacing="2"
        >
          ALIUNE EARLY ACCESS
        </text>
      </svg>
    </div>
  );
}

export default ClosedAlphaRibbon;
