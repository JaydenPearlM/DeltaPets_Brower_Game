// frontend/web/src/Pets_Creation/registry/Stats/mainStats/petMainstats.tsx
import { useMemo, useState } from "react";
import "./petMainstats.css";

type TrainingElements = {
  null_element: number;
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
    line: string;
    stage?: string;
    level: number;
    gender?: "male" | "female" | "null_gender";
    hp_max: number;
    hp_cur: number;
    hp_stat: number;
    atk: number;
    def: number;
    spd: number;
    magi?: number;
    mana: number;
    personality_id?: string | null;
    personality_key?: string | null;
    personalityKey?: string | null;
    personality_type?: string | null;
    personalityType?: string | null;
    training?: Partial<TrainingElements>;
  } | null;
};

const ELEMENT_ORDER: (keyof TrainingElements)[] = [
  "null_element",
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
  if (g === "null_gender") return "Neutral";
  return g.charAt(0).toUpperCase() + g.slice(1);
}

function prettyElement(line?: string) {
  if (!line) return "Voidborne";
  if (line === "null_element" || line === "null") return "Voidborne";
  return line.charAt(0).toUpperCase() + line.slice(1);
}

function prettyStage(stage?: string) {
  if (!stage) return "Hatchling";
  return stage
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/g)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function prettyPersonality(p?: string | null) {
  if (!p) return "Unknown";
  return String(p)
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/g)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function PetMainStats({ pet }: PetMainStatsProps) {
  const [showTraining, setShowTraining] = useState(false);

  const personality = useMemo(() => {
    if (!pet) return null;
    return (
      pet.personality_key ??
      pet.personalityKey ??
      pet.personality_type ??
      pet.personalityType ??
      pet.personality_id ??
      null
    );
  }, [pet]);

  const training = useMemo<TrainingElements>(() => {
    const base: TrainingElements = {
      null_element: 0,
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
      const v = pet.training[k];
      if (typeof v === "number") base[k] = v;
    }

    return base;
  }, [pet]);

  const baseTotal = useMemo(() => {
    if (!pet) return 0;
    const hp = Number(pet.hp_stat ?? 0);
    const atk = Number(pet.atk ?? 0);
    const def = Number(pet.def ?? 0);
    const spd = Number(pet.spd ?? 0);
    const magi = Number(pet.magi ?? 0);
    const mana = Number(pet.mana ?? 0);

    return hp + atk + def + spd + magi + mana;
  }, [pet]);

  const hatchlingHp = useMemo(() => {
    if (!pet) return 0;
    return Number(pet.hp_stat ?? 0) * 2;
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

              <div className="pet-mainstats__sub">
                <span>Level {pet.level}</span>
                <span className="pet-mainstats__dot">•</span>
                <span>Gender: {prettyGender(pet.gender)}</span>
                <span className="pet-mainstats__dot">•</span>
                <span>Element: {prettyElement(pet.line)}</span>
                <span className="pet-mainstats__dot">•</span>
                <span>Stage: {prettyStage(pet.stage)}</span>
                <span className="pet-mainstats__dot">•</span>
                <span>Hatchling HP: {hatchlingHp}</span>
                <span className="pet-mainstats__dot">•</span>
                <span>Trait: {prettyPersonality(personality)}</span>
                <button
                  type="button"
                  className="pet-mainstats__miniBtn"
                  onClick={() => setShowTraining((v: boolean) => !v)}
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
            <div className="pet-mainstats__card pet-mainstats__card--main">
              <h3 className="pet-mainstats__cardTitle">Main Stats</h3>

              <div className="pet-mainstats__rows">
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

                <div className="pet-mainstats__row pet-mainstats__row--tight">
                  <span>MANA</span>
                  <span className="pet-mainstats__value">
                    {Number(pet.mana ?? 0)}
                  </span>
                </div>

                <div className="pet-mainstats__row pet-mainstats__row--tight">
                  <span>HP Max</span>
                  <span className="pet-mainstats__value">
                    {Number(pet.hp_max ?? 0)}
                  </span>
                </div>

                <div className="pet-mainstats__row pet-mainstats__row--tight">
                  <span>HP Current</span>
                  <span className="pet-mainstats__value">
                    {Number(pet.hp_cur ?? 0)}
                  </span>
                </div>

                <div className="pet-mainstats__row pet-mainstats__row--total">
                  <span>Total</span>
                  <span className="pet-mainstats__value">{baseTotal}</span>
                </div>
              </div>
            </div>

            {showTraining ? (
              <aside className="pet-mainstats__flyout is-open">
                <div className="pet-mainstats__flyoutInner">
                  <div className="pet-mainstats__flyoutHeader">
                    <h3
                      className="pet-mainstats__cardTitle"
                      style={{ margin: 0 }}
                    >
                      Training Elements
                    </h3>
                  </div>

                  <div className="pet-mainstats__elements">
                    {ELEMENT_ORDER.map((k) => (
                      <div key={k} className="pet-mainstats__elementRow">
                        <span className="pet-mainstats__elementName">
                          {k === "null_element"
                            ? "Voidborne"
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
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
