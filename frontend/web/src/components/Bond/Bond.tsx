import "./bond.css";

type BondTier = {
  label: string;
  description: string;
};

type BondProps = {
  bond: number;
  careStreak?: number;
  trainingStreak?: number;
  faintCount?: number;
};

function clampBond(value: number) {
  return Math.max(0, Math.min(100, value));
}

function getBondTier(bond: number): BondTier {
  if (bond < 20) {
    return {
      label: "Fractured",
      description: "Your pet feels distant and unsure.",
    };
  }

  if (bond < 40) {
    return {
      label: "Wary",
      description: "Your pet is starting to trust you, but still needs care.",
    };
  }

  if (bond < 60) {
    return {
      label: "Stable",
      description: "Your pet trusts your routine and responds well.",
    };
  }

  if (bond < 80) {
    return {
      label: "Trusted",
      description: "Your pet has a strong bond with you.",
    };
  }

  return {
    label: "Devoted",
    description: "Your pet is deeply bonded and fights harder beside you.",
  };
}

export default function Bond({
  bond,
  careStreak = 0,
  trainingStreak = 0,
  faintCount = 0,
}: BondProps) {
  const safeBond = clampBond(bond);
  const tier = getBondTier(safeBond);

  return (
    <section className="bondPanel" aria-label="Pet bond">
      <div className="bondHeader">
        <div>
          <p className="bondEyebrow">Bond</p>
          <h2>{tier.label}</h2>
        </div>
        <strong>{safeBond}/100</strong>
      </div>

      <div
        className="bondMeter"
        aria-label={`Bond level ${safeBond} out of 100`}
      >
        <span style={{ width: `${safeBond}%` }} />
      </div>

      <p className="bondDescription">{tier.description}</p>

      <div className="bondStats">
        <div>
          <span>Care Streak</span>
          <strong>{careStreak}</strong>
        </div>
        <div>
          <span>Training Streak</span>
          <strong>{trainingStreak}</strong>
        </div>
        <div>
          <span>Faints</span>
          <strong>{faintCount}</strong>
        </div>
      </div>
    </section>
  );
}
