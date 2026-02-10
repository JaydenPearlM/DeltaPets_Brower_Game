import React, { useMemo, useState } from "react";
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
    line: string; // kept internally (DO NOT display)
    level: number;

    gender?: "male" | "female" | "null_gender";

    // Real HP snapshot (health bar)
    hp_max: number;
    hp_cur: number;

    // ✅ HP STAT points used for Main Stats math (base+IV+alloc)
    hp_stat: number;

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

function prettyGender(g?: string) {
  if (!g) return "Unknown";
  if (g === "null_gender") return "Null";
  return g.charAt(0).toUpperCase() + g.slice(1);
}

export default function PetMainStats({ pet }: PetMainStatsProps) {
  const [showTraining, setShowTraining] = useState(false);

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

  // ✅ Total STAT points (HP stat + atk/def/spd/magi)
  // IMPORTANT: do NOT use hp_cur here — hp_cur is current HP (snapshot)
  const baseTotal = useMemo(() => {
    if (!pet) return 0;
    const hp = Number(pet.hp_stat ?? 0);
    const atk = Number(pet.atk ?? 0);
    const def = Number(pet.def ?? 0);
    const spd = Number(pet.spd ?? 0);
    const magi = Number(pet.magi ?? 0);
    return hp + atk + def + spd + magi;
  }, [pet]);

  return (
    <div className="pet-mainstats-shell">
      <section className="pet-mainstats pet-mainstats--compact">
        <div className="pet-mainstats__header">
          {!pet ? (
            <h2 className="pet-mainstats__title">Pet Stats</h2>
          ) : (
            <div>
              <h2 className="pet-mainstats__name">
                {pet.name ?? "Unnamed Delta"}
              </h2>

              {/* ✅ Level + Gender (NO element reveal) */}
              <div className="pet-mainstats__sub">
                <span>Level {pet.level}</span>
                <span className="pet-mainstats__dot">•</span>
                <span>Gender: {prettyGender(pet.gender)}</span>

                <button
                  type="button"
                  className="pet-mainstats__miniBtn"
                  onClick={() => setShowTraining((v) => !v)}
                >
                  {showTraining ? "Close Training" : "Training"}
                </button>
              </div>
            </div>
          )}
        </div>

        {!pet ? (
          <div className="pet-mainstats__empty">
            No pet found (server returned <code>null</code>).
          </div>
        ) : (
          <div className="pet-mainstats__layout">
            {/* Main stats card */}
            <div className="pet-mainstats__card pet-mainstats__card--main">
              <h3 className="pet-mainstats__cardTitle">Main Stats</h3>

              <div className="pet-mainstats__rows">
                {/* ✅ HP STAT points (base+IV+alloc) */}
                <div className="pet-mainstats__row pet-mainstats__row--tight">
                  <span>HP</span>
                  <span className="pet-mainstats__value">{pet.hp_stat}</span>
                </div>

                <div className="pet-mainstats__row pet-mainstats__row--tight">
                  <span>ATK</span>
                  <span className="pet-mainstats__value">{pet.atk}</span>
                </div>

                <div className="pet-mainstats__row pet-mainstats__row--tight">
                  <span>DEF</span>
                  <span className="pet-mainstats__value">{pet.def}</span>
                </div>

                <div className="pet-mainstats__row pet-mainstats__row--tight">
                  <span>SPD</span>
                  <span className="pet-mainstats__value">{pet.spd}</span>
                </div>

                {typeof pet.magi === "number" && (
                  <div className="pet-mainstats__row pet-mainstats__row--tight">
                    <span>MAGI</span>
                    <span className="pet-mainstats__value">{pet.magi}</span>
                  </div>
                )}

                {/* ✅ Total points (should be 17 at level 1) */}
                <div className="pet-mainstats__row pet-mainstats__row--total">
                  <span>Total</span>
                  <span className="pet-mainstats__value">{baseTotal}</span>
                </div>
              </div>
            </div>

            {/* Training flyout */}
            <aside
              className={`pet-mainstats__flyout ${showTraining ? "is-open" : ""}`}
            >
              <div className="pet-mainstats__flyoutInner">
                <div className="pet-mainstats__flyoutHeader">
                  <h3
                    className="pet-mainstats__cardTitle"
                    style={{ margin: 0 }}
                  >
                    Training Elements
                  </h3>
                </div>

                {pet.level <= 1 ? (
                  <div className="pet-mainstats__hint">
                    Training starts later — level 1 is all zeros.
                  </div>
                ) : null}

                <div className="pet-mainstats__elements">
                  {ELEMENT_ORDER.map((k) => (
                    <div key={k} className="pet-mainstats__elementRow">
                      <span className="pet-mainstats__elementName">
                        {k === "null"
                          ? "Null"
                          : k[0].toUpperCase() + k.slice(1)}
                      </span>
                      <span className="pet-mainstats__elementVal">
                        {training[k]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>
    </div>
  );
}
