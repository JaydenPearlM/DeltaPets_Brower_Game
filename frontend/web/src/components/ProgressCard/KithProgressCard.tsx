import "./KithProgressCard.css";

type KithProgressCardProps = {
  name?: string;
  level?: number;
  xp?: number;
  xpToNext?: number;
  wins?: number;
  losses?: number;
  hatchCount?: number;
  corruptedEggsHatched?: number;
};

export function KithProgressCard({
  name = "Kith",
  level = 1,
  xp = 0,
  xpToNext = 100,
  wins = 0,
  losses = 0,
  hatchCount = 0,
  corruptedEggsHatched = 0,
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
    </section>
  );
}
