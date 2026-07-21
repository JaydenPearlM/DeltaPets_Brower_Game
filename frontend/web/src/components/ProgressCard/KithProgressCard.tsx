import "./KithProgressCard.css";

type ElementRow = {
  key: string;
  label: string;
  value: number;
  active: boolean;
};

type KithProgressCardProps = {
  name?: string;
  level?: number;
  xp?: number;
  xpToNext?: number;
  wins?: number;
  losses?: number;
  hatchCount?: number;
  corruptedEggsHatched?: number;
  hatchedAt?: string | null;
  favoriteCareAction?: string | null;
  elementRows?: ElementRow[];
};

const ELEMENT_COLORS: Record<string, string> = {
  null: "var(--element-voidborne)",
  water: "var(--element-water)",
  fire: "var(--element-fire)",
  earth: "var(--element-earth)",
  air: "var(--element-air)",
  ice: "var(--element-ice)",
  storm: "var(--element-storm)",
  light: "var(--element-light)",
  shadow: "var(--element-shadow)",
};

function getDaysSinceHatch(hatchedAt: string | null | undefined): string {
  if (!hatchedAt) return "--";
  const diff = Date.now() - new Date(hatchedAt).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export function KithProgressCard({
  name = "Kith",
  level = 1,
  xp = 0,
  xpToNext = 100,
  wins = 0,
  losses = 0,
  hatchCount = 0,
  corruptedEggsHatched = 0,
  hatchedAt = null,
  favoriteCareAction = null,
  elementRows = [],
}: KithProgressCardProps) {
  const safeXpToNext = Math.max(1, xpToNext);
  const xpPercent = Math.min(100, Math.max(0, (xp / safeXpToNext) * 100));

  return (
    <section className="kithProgressCard">
      <header className="kithProgressCard__header">
        <p className="kithProgressCard__eyebrow">Progress</p>
        <h2 className="kithProgressCard__title">{name}</h2>
      </header>

      <div className="kithProgressCard__levelRow">
        <span>Level {level}</span>
        <span>
          {xp}/{safeXpToNext} XP
        </span>
      </div>

      <div className="kithProgressCard__xpBar" aria-label="Experience progress">
        <div
          className="kithProgressCard__xpFill"
          style={{ width: `${xpPercent}%` }}
        />
      </div>

      <dl className="kithProgressCard__stats">
        <div>
          <dt>Wins</dt>
          <dd>{wins}</dd>
        </div>
        <div>
          <dt>Losses</dt>
          <dd>{losses}</dd>
        </div>
        <div>
          <dt>Eggs Hatched</dt>
          <dd>{hatchCount}</dd>
        </div>
        <div>
          <dt>Corrupted Eggs</dt>
          <dd>{corruptedEggsHatched}</dd>
        </div>
      </dl>

      <div className="kithProgressCard__section">
        <p className="kithProgressCard__sectionLabel">Growth Stats</p>
        <div className="kithProgressCard__growthRow">
          <div className="kithProgressCard__statItem">
            <span className="kithProgressCard__statLabel">
              Days Since Hatch
            </span>
            <span className="kithProgressCard__statValue">
              {getDaysSinceHatch(hatchedAt)}
            </span>
          </div>
          <div className="kithProgressCard__statItem">
            <span className="kithProgressCard__statLabel">Favorite Care</span>
            <span className="kithProgressCard__statValue">
              {favoriteCareAction ?? "--"}
            </span>
          </div>
        </div>
      </div>

      {elementRows.length > 0 && (
        <div className="kithProgressCard__section">
          <p className="kithProgressCard__sectionLabel">Evolution Marks</p>
          <div className="kithProgressCard__deltaGrid">
            {elementRows.map((el) => {
              const color = ELEMENT_COLORS[el.key] ?? "var(--dp-text-muted)";
              const unlocked = el.value > 0;
              return (
                <div
                  key={el.key}
                  className={`kithProgressCard__deltaItem${unlocked ? " kithProgressCard__deltaItem--unlocked" : ""}`}
                  title={`${el.label}: ${el.value}`}
                >
                  <span
                    className="kithProgressCard__deltaSymbol"
                    style={{ color }}
                  >
                    △
                  </span>
                  <span className="kithProgressCard__deltaLabel">
                    {el.label}
                  </span>
                  <span className="kithProgressCard__deltaCount">
                    {el.value}
                  </span>
                </div>
              );
            })}
            <div
              className="kithProgressCard__deltaItem kithProgressCard__deltaItem--mystic"
              title="Mystic Legendary"
            >
              <span className="kithProgressCard__deltaSymbol kithProgressCard__deltaSymbol--rainbow">
                △
              </span>
              <span className="kithProgressCard__deltaLabel">Mystic</span>
              <span className="kithProgressCard__deltaCount">--</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
