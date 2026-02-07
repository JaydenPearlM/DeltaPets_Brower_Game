import React, { useMemo } from "react";
import "./petMainstats.css";

type TrainingElements = {
  null: number;
  water: number;
  fire: number;
  earth: number;
  air: number;
  ice: number;
  storm: number;
  light: number;
  shadow: number;
};

type PetMainStatsProps = {
  pet: {
    name: string | null;
    line: string; // element line (e.g. "fire", "water", "null_element", etc.)
    level: number;

    hp_max: number;
    hp_cur: number;
    atk: number;
    def: number;
    spd: number;
    magi?: number;

    training?: Partial<TrainingElements>;
  } | null;
};

const ELEMENT_ORDER: (keyof TrainingElements)[] = [
  "null",
  "water",
  "fire",
  "earth",
  "air",
  "ice",
  "storm",
  "light",
  "shadow",
];

function prettyLine(line: string) {
  return String(line ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PetMainStats({ pet }: PetMainStatsProps) {
  const training = useMemo<TrainingElements>(() => {
    const base: TrainingElements = {
      null: 0,
      water: 0,
      fire: 0,
      earth: 0,
      air: 0,
      ice: 0,
      storm: 0,
      light: 0,
      shadow: 0,
    };

    if (!pet?.training) return base;

    for (const k of ELEMENT_ORDER) {
      const v = pet.training?.[k];
      if (typeof v === "number") base[k] = v;
    }
    return base;
  }, [pet]);

  return (
    // ✅ Outer shell: flush to window edge + bordered like DailyCareCard
    <div className="pet-mainstats-shell">
      <section className="pet-mainstats">
        <div className="pet-mainstats__header">
          {!pet ? (
            <h2 className="pet-mainstats__title">Pet Stats</h2>
          ) : (
            <div>
              <h2 className="pet-mainstats__name">
                {pet.name ?? "Unnamed Delta"}
              </h2>
              <div className="pet-mainstats__sub">
                <span>Level {pet.level}</span>
                <span className="pet-mainstats__dot">•</span>
                <span>Element: {prettyLine(pet.line)}</span>
              </div>
            </div>
          )}
        </div>

        {!pet ? (
          <div className="pet-mainstats__empty">
            No pet found (server returned <code>null</code>).
          </div>
        ) : (
          <div className="pet-mainstats__grid">
            <div className="pet-mainstats__card">
              <h3 className="pet-mainstats__cardTitle">Main Stats</h3>

              <div className="pet-mainstats__rows">
                <div className="pet-mainstats__row">
                  <span>HP</span>
                  <span>
                    {pet.hp_cur}/{pet.hp_max}
                  </span>
                </div>

                <div className="pet-mainstats__row">
                  <span>ATK</span>
                  <span>{pet.atk}</span>
                </div>

                <div className="pet-mainstats__row">
                  <span>DEF</span>
                  <span>{pet.def}</span>
                </div>

                <div className="pet-mainstats__row">
                  <span>SPD</span>
                  <span>{pet.spd}</span>
                </div>

                {typeof pet.magi === "number" && (
                  <div className="pet-mainstats__row">
                    <span>MAGI</span>
                    <span>{pet.magi}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pet-mainstats__card">
              <h3 className="pet-mainstats__cardTitle">Training Elements</h3>

              <div className="pet-mainstats__elements">
                {ELEMENT_ORDER.map((k) => (
                  <div key={k} className="pet-mainstats__elementRow">
                    <span className="pet-mainstats__elementName">
                      {k === "null" ? "Null" : k[0].toUpperCase() + k.slice(1)}
                    </span>
                    <span className="pet-mainstats__elementVal">
                      {training[k]}
                    </span>
                  </div>
                ))}
              </div>

              {pet.level === 1 && (
                <div className="pet-mainstats__hint">
                  Training starts later — level 1 is all zeros.
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
