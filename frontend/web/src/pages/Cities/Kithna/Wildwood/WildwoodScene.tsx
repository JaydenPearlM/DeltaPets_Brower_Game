import type { WildwoodRoomView } from "@shared/battle/wildwoodTypes";

const scenes = {
  entrance: "",
  brush: "Dense Woods",
  clearing: "Mushroom Clearing",
  creek: "Forest Creek",
  ancient: "Ancient Woodland",
  corrupted: "Corrupted Clearing",
} as const;

export type WildwoodSceneId = keyof typeof scenes;

// Decorative only: stable room scenery, with no changes to exploration state.
function sceneFor(
  step: number,
  room?: WildwoodRoomView | null,
): WildwoodSceneId {
  if (step === 0) return "entrance";
  if (room?.corrupted) return "corrupted";
  const locations = ["brush", "clearing", "creek", "ancient"] as const;
  return locations[
    (Math.max(1, room?.sequence ?? step) - 1) % locations.length
  ];
}

export default function WildwoodScene({
  room,
  step = room?.sequence ?? 0,
  sceneId,
  panoramic = false,
}: {
  room?: WildwoodRoomView | null;
  step?: number;
  sceneId?: WildwoodSceneId;
  panoramic?: boolean;
}) {
  const scene = step === 0 ? "entrance" : (sceneId ?? sceneFor(step, room));
  const clearing = scene === "clearing" || scene === "corrupted";

  return (
    <figure className={`ww-scene ww-scene--${scene}`}>
      <svg
        className="ww-scene__art"
        viewBox="0 0 800 450"
        preserveAspectRatio={panoramic ? "xMidYMid slice" : "xMidYMid meet"}
        aria-hidden="true"
        focusable="false"
      >
        <path fill="var(--ww-sky)" d="M0 0H800V450H0Z" />
        <circle cx="440" cy="104" r="65" fill="var(--ww-light)" opacity=".22" />
        <circle cx="440" cy="104" r="38" fill="var(--ww-light)" opacity=".38" />
        <path
          fill="var(--ww-far)"
          d="M0 235Q100 160 220 218T440 200T800 215V450H0Z"
        />
        {[25, 115, 205, 290, 510, 610, 715, 790].map((x, i) => (
          <g
            key={x}
            transform={`translate(${x} ${(i % 2) * 25})`}
            fill="var(--ww-far)"
          >
            <path d="M-9 255L-5 65H6L12 255Z" />
            <path d="M0 15L-50 130H-32L-65 192H65L32 130H50Z" />
          </g>
        ))}
        <path
          fill="var(--ww-ground)"
          d="M0 288Q180 230 400 263Q625 230 800 285V450H0Z"
        />
        {clearing ? (
          <ellipse cx="410" cy="325" rx="240" ry="65" fill="var(--ww-path)" />
        ) : (
          <path
            fill="var(--ww-path)"
            d={
              scene === "brush"
                ? "M418 245Q310 295 410 330T425 450H315Q470 365 350 330T418 245Z"
                : "M410 246Q320 295 380 325T540 450H215Q410 365 330 330T410 246Z"
            }
          />
        )}
        {[
          [-15, 10, 1.25],
          [130, 35, 0.85],
          [680, 20, 0.95],
          [810, -10, 1.3],
        ].map(([x, y, scale]) => (
          <g
            key={x}
            transform={`translate(${x} ${y}) scale(${scale})`}
            stroke="var(--ww-outline)"
            strokeWidth="5"
            strokeLinejoin="round"
          >
            <path
              fill="var(--ww-bark)"
              d="M-17 340L-10 120H15L23 340L43 354L5 348L-40 356Z"
            />
            <path
              fill="var(--ww-leaf)"
              d="M0-65C-70-30-104 20-68 60C-130 85-105 145-65 149C-100 207-37 230 0 205C48 237 109 206 75 157C130 134 105 69 66 63C99 13 58-36 0-65Z"
            />
            <path
              d="M-53 142Q0 164 58 139M-42 67Q0 87 39 63"
              fill="none"
              stroke="var(--ww-light)"
              opacity=".22"
            />
          </g>
        ))}
        {scene === "entrance" && (
          <g stroke="var(--ww-outline)" strokeWidth="4" strokeLinejoin="round">
            <path fill="var(--ww-bark)" d="M232 279H242V356H232Z" />
            <path fill="#b9a56f" d="M204 274H263L279 288L263 301H204Z" />
            <path d="M219 287H257M249 282L257 287L249 292" fill="none" />
          </g>
        )}
        {scene === "entrance" && (
          <g>
            {[
              [190, 370],
              [246, 330],
              [545, 350],
              [610, 320],
            ].map(([x, y], i) => (
              <g key={x} transform={`translate(${x} ${y})`}>
                <path d="M0 0V18M0 12L-7 7" stroke="#447849" strokeWidth="3" />
                <path
                  d="M0-10C12-16 17-2 7 3C15 15 0 19-4 8C-18 12-20-4-8-5C-12-17-1-20 0-10Z"
                  fill={i % 2 ? "#ffcb79" : "#efa6c5"}
                />
                <circle r="4" fill="#fff2a6" />
              </g>
            ))}
          </g>
        )}
        {scene === "clearing" && (
          <g stroke="var(--ww-outline)" strokeWidth="3">
            <path d="M490 330L590 343L580 361L480 350Z" fill="#796f52" />
            {[275, 320, 470].map((x, i) => (
              <g key={x} transform={`translate(${x} ${325 + i * 10})`}>
                <path d="M-4 0H4L7 23H-7Z" fill="#efdfb1" />
                <path d="M-22 0Q0-38 22 0Z" fill="#d99379" />
                <circle cy="-8" r="3" fill="#fff1c7" stroke="none" />
              </g>
            ))}
          </g>
        )}
        {scene === "creek" && (
          <g>
            <path
              d="M420 250Q320 298 465 325T530 450H290Q540 365 400 332T420 250Z"
              fill="#74bfc7"
            />
            <path
              d="M402 287L431 289M428 337L470 340M373 409L445 413"
              stroke="#d4f0d9"
              strokeWidth="4"
              fill="none"
            />
          </g>
        )}
        {scene === "ancient" && (
          <g
            fill="#8b9d91"
            stroke="var(--ww-outline)"
            strokeWidth="4"
            strokeLinejoin="round"
          >
            <path d="M335 327L341 240H365L371 327ZM447 327L450 240H475L483 327Z" />
            <path d="M332 237L351 217H463L482 237L477 250H337Z" />
            <path
              d="M345 252L350 281M453 242L469 242M339 317L366 317"
              stroke="#69976c"
              strokeWidth="9"
            />
          </g>
        )}
        {scene === "corrupted" && (
          <g
            fill="#b96da6"
            stroke="#482b59"
            strokeWidth="4"
            strokeLinejoin="round"
          >
            <path d="M310 335L285 290L309 300L320 260L337 303L329 339Z" />
            <path d="M510 312L500 281L519 290L539 251L537 302L523 321Z" />
            <path
              d="M350 352L389 331L414 345L463 318"
              fill="none"
              stroke="#d887ab"
            />
          </g>
        )}
        <g fill="var(--ww-leaf)" stroke="var(--ww-outline)" strokeWidth="4">
          <path d="M0 450V375Q35 338 63 377Q85 334 122 376Q168 347 190 404L220 450Z" />
          <path d="M800 450V370Q763 337 733 378Q693 340 666 389Q619 360 593 416L565 450Z" />
        </g>
        <g fill="var(--ww-light)">
          {[
            [180, 245],
            [565, 220],
            [470, 289],
            [260, 355],
            [590, 352],
          ].map(([x, y]) => (
            <path key={x} d={`M${x} ${y - 5}l2 3 3 2-3 2-2 3-2-3-3-2 3-2Z`} />
          ))}
        </g>
        <g fill="#7eaaa0" stroke="var(--ww-outline)" strokeWidth="3">
          <path d="M179 349L191 331L214 329L230 348Z" />
          <path d="M551 376L564 356L590 362L600 377Z" />
        </g>
      </svg>
      {scene !== "entrance" && (
        <figcaption className="ww-scene__caption">
          <span>Wildwood · Temporary placeholder</span>
          <strong>{scenes[scene]}</strong>
        </figcaption>
      )}
    </figure>
  );
}
