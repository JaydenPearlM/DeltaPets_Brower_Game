import { useMemo, useState } from "react";
import {
  CORE_SKILLS,
  PROGRESSION_SKILLS,
  type PetSkill,
  type SkillId,
} from "./skillsRegistry";
import "./PetSkillsPanel.css";

type PetSkillsPanelProps = {
  pet?: Record<string, any> | null;
  stats?: Record<string, number> | null;
};

type DisplaySkill = PetSkill & {
  displayName: string;
  value: number | null;
  formula: string;
  unlocked: boolean;
  lockText?: string;
};

type SkillLane = "left" | "center" | "right";

const STAGE_ORDER = [
  "egg",
  "hatchling",
  "lowform",
  "highform",
  "legion",
  "mythic_legendary",
];

const PROGRESSION_UNLOCKS: Partial<
  Record<SkillId, { level?: number; stage?: string; lockText: string }>
> = {
  "weak-element-strike": {
    level: 2,
    lockText: "Unlocks at level 2 after hatching.",
  },
  "lowform-skill": {
    stage: "lowform",
    lockText: "Unlocks at Lowform.",
  },
  "highform-skill": {
    stage: "highform",
    lockText: "Unlocks at Highform.",
  },
  "legion-skill": {
    stage: "legion",
    lockText: "Unlocks at Legion.",
  },
  "mythic-legendary-skill": {
    stage: "mythic_legendary",
    lockText: "Unlocks at Mythical Legendary.",
  },
};

const SKILL_LADDER_ROWS: Array<Partial<Record<SkillLane, SkillId>>> = [
  {
    left: "basic-strike",
    right: "weak-element-strike",
  },
  {
    left: "guard",
    right: "lowform-skill",
  },
  {
    left: "mend",
    right: "highform-skill",
  },
  {
    center: "legion-skill",
  },
  {
    center: "mythic-legendary-skill",
  },
];

const SKILL_TREE_PREVIEW = [
  {
    title: "Combat Tree",
    text: "Basic Strike, elemental pressure, counters, and heavier damage paths.",
  },
  {
    title: "Defense Tree",
    text: "Guard upgrades, shields, resilience, damage reduction, and survival tools.",
  },
  {
    title: "Magic Tree",
    text: "Mend upgrades, mana flow, elemental skills, barriers, and spell scaling.",
  },
  {
    title: "Breeder Tree",
    text: "Bond growth, care bonuses, hatch traits, training boosts, and support overlap.",
  },
];

function toNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function getPetLevel(pet?: Record<string, any> | null) {
  return Math.max(1, toNumber(pet?.level, 1));
}

function getStatValue(
  stats: Record<string, number> | null | undefined,
  keys: string[],
) {
  if (!stats) return 0;

  for (const key of keys) {
    const directValue = toNumber(stats[key], NaN);

    if (Number.isFinite(directValue)) {
      return Math.max(0, directValue);
    }

    const uppercaseValue = toNumber(stats[key.toUpperCase()], NaN);

    if (Number.isFinite(uppercaseValue)) {
      return Math.max(0, uppercaseValue);
    }
  }

  return 0;
}

function getPetStage(pet?: Record<string, any> | null) {
  return String(pet?.stage || pet?.growth_stage || "hatchling").toLowerCase();
}

function getStageIndex(stage: string) {
  const index = STAGE_ORDER.indexOf(stage);
  return index >= 0 ? index : 1;
}

function isAtLeastStage(currentStage: string, requiredStage: string) {
  return getStageIndex(currentStage) >= getStageIndex(requiredStage);
}

function getElementLabel(pet?: Record<string, any> | null) {
  const rawElement = String(pet?.element || pet?.element_type || "Elemental");
  return rawElement.charAt(0).toUpperCase() + rawElement.slice(1);
}

function getProgressionUnlocked(
  skillId: SkillId,
  pet?: Record<string, any> | null,
) {
  const level = getPetLevel(pet);
  const stage = getPetStage(pet);
  const unlock = PROGRESSION_UNLOCKS[skillId];

  if (!unlock) return true;

  const meetsLevel = unlock.level ? level >= unlock.level : true;
  const meetsStage = unlock.stage ? isAtLeastStage(stage, unlock.stage) : true;

  return meetsLevel && meetsStage;
}

function buildDisplaySkill(
  skill: PetSkill,
  pet?: Record<string, any> | null,
  stats?: Record<string, number> | null,
): DisplaySkill {
  const level = getPetLevel(pet);
  const element = getElementLabel(pet);

  const attack = getStatValue(stats, ["attack", "atk"]);
  const defense = getStatValue(stats, ["defense", "def", "guard"]);
  const magi = getStatValue(stats, ["magi", "magic", "mend"]);

  console.log("[skills/debug]", {
    petId: pet?.id,
    petName: pet?.name || pet?.nickname || pet?.species,
    level,
    stats,
    attack,
    defense,
    magi,
    basicStrikeTotal: level + attack,
    guardTotal: level + defense,
    mendTotal: level + magi,
  });

  if (skill.id === "basic-strike") {
    const value = level + attack;

    return {
      ...skill,
      displayName: "Basic Strike",
      value,
      formula: `${level} + ${attack} = ${value} attack damage.`,
      unlocked: true,
    };
  }

  if (skill.id === "guard") {
    const value = level + defense;

    return {
      ...skill,
      displayName: "Guard",
      value,
      formula: `${level} + ${defense} = ${value} guard strength.`,
      unlocked: true,
    };
  }

  if (skill.id === "mend") {
    const value = level + magi;

    return {
      ...skill,
      displayName: "Mend",
      value,
      formula: `${level} + ${magi} = ${value} healing power.`,
      unlocked: true,
    };
  }

  const unlocked = getProgressionUnlocked(skill.id, pet);
  const unlock = PROGRESSION_UNLOCKS[skill.id];

  if (skill.id === "weak-element-strike") {
    const elementBonus = Math.max(1, Math.floor(magi / 2));
    const value = level + attack + elementBonus;

    return {
      ...skill,
      displayName: `Weak ${element} Strike`,
      value: unlocked ? value : null,
      formula: `${level} + ${attack} + ${elementBonus} = ${value} weak ${element.toLowerCase()} damage.`,
      unlocked,
      lockText: unlock?.lockText,
    };
  }

  if (skill.id === "lowform-skill") {
    const value = level + attack + defense;

    return {
      ...skill,
      displayName: "Lowform Skill",
      value: unlocked ? value : null,
      formula: `${level} + ${attack} + ${defense} = ${value} lowform skill power.`,
      unlocked,
      lockText: unlock?.lockText,
    };
  }

  if (skill.id === "highform-skill") {
    const value = level + attack + magi;

    return {
      ...skill,
      displayName: "Highform Skill",
      value: unlocked ? value : null,
      formula: `${level} + ${attack} + ${magi} = ${value} highform skill power.`,
      unlocked,
      lockText: unlock?.lockText,
    };
  }

  if (skill.id === "legion-skill") {
    const value = level + attack + defense + magi;

    return {
      ...skill,
      displayName: "Legion Skill",
      value: unlocked ? value : null,
      formula: `${level} + ${attack} + ${defense} + ${magi} = ${value} legion skill power.`,
      unlocked,
      lockText: unlock?.lockText,
    };
  }

  const value = level + attack + defense + magi + 5;

  return {
    ...skill,
    displayName: "Mythical Legendary Skill",
    value: unlocked ? value : null,
    formula: `${level} + ${attack} + ${defense} + ${magi} + 5 = ${value} mythical legendary power.`,
    unlocked,
    lockText: unlock?.lockText,
  };
}

function SkillButton({
  skill,
  lane,
  onClick,
}: {
  skill: DisplaySkill;
  lane: SkillLane;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`skillTrapezoid skillTrapezoid--${skill.id} skillTrapezoid--lane-${lane} ${
        !skill.unlocked ? "is-locked" : ""
      }`}
      onClick={onClick}
    >
      <span className="skillTrapezoidBorder" />

      <span className="skillName">{skill.displayName}</span>

      <strong className="skillValue">
        {skill.unlocked && skill.value !== null ? skill.value : "Locked"}
      </strong>

      <span className="skillDescription">
        {skill.unlocked ? skill.description : skill.lockText}
      </span>
    </button>
  );
}

export default function PetSkillsPanel({ pet, stats }: PetSkillsPanelProps) {
  const [activeSkill, setActiveSkill] = useState<DisplaySkill | null>(null);
  const [isSkillTreeOpen, setIsSkillTreeOpen] = useState(false);

  const skillsById = useMemo(() => {
    const allSkills = [...CORE_SKILLS, ...PROGRESSION_SKILLS];

    return allSkills.reduce<Partial<Record<SkillId, DisplaySkill>>>(
      (acc, skill) => {
        acc[skill.id] = buildDisplaySkill(skill, pet, stats);
        return acc;
      },
      {},
    );
  }, [pet, stats]);

  return (
    <section className="skillsPanel">
      <header className="skillsPanelHeader">
        <div className="skillsPanelHeaderCopy">
          <h2 className="skillsTitle">Skills Chamber</h2>
          <p className="skillsSubtitle">
            Skill growth follows level, stats, element, and evolution stage.
          </p>
        </div>

        <button
          type="button"
          className="skillTreeOpenButton"
          onClick={() => setIsSkillTreeOpen(true)}
        >
          Skill Trees
        </button>
      </header>

      <div className="skillsLadder">
        {SKILL_LADDER_ROWS.map((row, rowIndex) => {
          if (row.center) {
            const skill = skillsById[row.center];

            return (
              <div className="skillsLadderRow" key={`skill-row-${rowIndex}`}>
                {skill ? (
                  <SkillButton
                    skill={skill}
                    lane="center"
                    onClick={() => setActiveSkill(skill)}
                  />
                ) : null}
              </div>
            );
          }

          return (
            <div className="skillsLadderRow" key={`skill-row-${rowIndex}`}>
              {(["left", "right"] as SkillLane[]).map((lane) => {
                const skillId = row[lane];
                const skill = skillId ? skillsById[skillId] : null;

                return skill ? (
                  <SkillButton
                    key={`${rowIndex}-${lane}-${skill.id}`}
                    skill={skill}
                    lane={lane}
                    onClick={() => setActiveSkill(skill)}
                  />
                ) : (
                  <span
                    key={`${rowIndex}-${lane}-empty`}
                    className={`skillEmptySlot skillEmptySlot--${lane}`}
                    aria-hidden="true"
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      {activeSkill ? (
        <div
          className="skillPopupBackdrop"
          role="presentation"
          onMouseDown={() => setActiveSkill(null)}
        >
          <section
            className={`skillPopup skillPopup--${activeSkill.id}`}
            role="dialog"
            aria-modal="true"
            aria-label={activeSkill.displayName}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="skillPopupClose"
              onClick={() => setActiveSkill(null)}
            >
              Close
            </button>

            <p className="skillPopupEyebrow">
              {activeSkill.unlocked ? "Unlocked Skill" : "Locked Skill"}
            </p>

            <h3>{activeSkill.displayName}</h3>

            <p className="skillPopupDescription">
              {activeSkill.unlocked
                ? activeSkill.description
                : activeSkill.lockText}
            </p>

            <div className="skillFormulaBox">
              <span>Current Scaling</span>
              <strong>
                {activeSkill.unlocked
                  ? activeSkill.formula
                  : "This skill is not unlocked yet."}
              </strong>
            </div>
          </section>
        </div>
      ) : null}

      {isSkillTreeOpen ? (
        <div
          className="skillPopupBackdrop"
          role="presentation"
          onMouseDown={() => setIsSkillTreeOpen(false)}
        >
          <section
            className="skillTreeModal"
            role="dialog"
            aria-modal="true"
            aria-label="Skill Trees"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="skillPopupClose"
              onClick={() => setIsSkillTreeOpen(false)}
            >
              Close
            </button>

            <p className="skillPopupEyebrow">Future Skill Tree System</p>
            <h3>Combat, Defense, Magic, and Breeder Trees</h3>

            <p className="skillPopupDescription">
              This will become the larger orb-style progression system. Some
              nodes can overlap between trees, so a pet can grow in a custom way
              without making the UI a spaghetti monster.
            </p>

            <div className="skillTreePreviewGrid">
              {SKILL_TREE_PREVIEW.map((tree) => (
                <article className="skillTreePreviewCard" key={tree.title}>
                  <h4>{tree.title}</h4>
                  <p>{tree.text}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
