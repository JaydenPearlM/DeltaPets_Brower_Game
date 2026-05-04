import { useMemo, useState } from "react";
import {
  CORE_SKILLS,
  PROGRESSION_SKILLS,
  type PetSkill,
  type SkillId,
} from "./skillsRegistry";
import PetSkillsInventory from "./PetSkillsInventory";
import SkillTree from "./skilltree";
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

type SkillLane = "left" | "right";

const ACTIVE_SKILL_SLOT_COUNT = 10;

const CORE_BACKUP_SKILL_IDS: SkillId[] = ["basic-strike", "guard", "mend"];

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
    if (Number.isFinite(directValue)) return Math.max(0, directValue);

    const upperValue = toNumber(stats[key.toUpperCase()], NaN);
    if (Number.isFinite(upperValue)) return Math.max(0, upperValue);
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

function isCoreBackupSkill(skillId: SkillId) {
  return CORE_BACKUP_SKILL_IDS.includes(skillId);
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
  const [isSkillInventoryOpen, setIsSkillInventoryOpen] = useState(false);

  const [equippedSkillIds, setEquippedSkillIds] = useState<SkillId[]>([
    "weak-element-strike",
  ]);

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

  const allUnlockedSkills = useMemo(() => {
    return Object.values(skillsById).filter((skill): skill is DisplaySkill =>
      Boolean(skill?.unlocked),
    );
  }, [skillsById]);

  const equippedSkills = useMemo(() => {
    return equippedSkillIds
      .map((skillId) => skillsById[skillId])
      .filter((skill): skill is DisplaySkill => Boolean(skill?.unlocked));
  }, [equippedSkillIds, skillsById]);

  const inventorySkills = useMemo(() => {
    return allUnlockedSkills.filter((skill) => {
      if (isCoreBackupSkill(skill.id)) return false;
      return !equippedSkillIds.includes(skill.id);
    });
  }, [allUnlockedSkills, equippedSkillIds]);

  function equipSkill(skillId: SkillId) {
    if (isCoreBackupSkill(skillId)) return;

    setEquippedSkillIds((currentIds) => {
      if (currentIds.includes(skillId)) return currentIds;
      if (currentIds.length >= ACTIVE_SKILL_SLOT_COUNT) return currentIds;
      return [...currentIds, skillId];
    });
  }

  function unequipSkill(skillId: SkillId) {
    if (isCoreBackupSkill(skillId)) return;

    setEquippedSkillIds((currentIds) =>
      currentIds.filter((currentSkillId) => currentSkillId !== skillId),
    );
  }

  return (
    <section className="skillsPanel">
      <header className="skillsPanelHeader">
        <div className="skillsHeaderTopRow">
          <h2 className="skillsTitle">Skills Chamber</h2>

          <div className="skillCenterActionRow">
            <button
              type="button"
              className="skillChamberActionButton"
              onClick={() => setIsSkillInventoryOpen(true)}
            >
              Skill Inventory
            </button>

            <button
              type="button"
              className="skillChamberActionButton"
              onClick={() => setIsSkillTreeOpen(true)}
            >
              Skill Trees
            </button>
          </div>
        </div>

        <p className="skillsSubtitle">
          Skill growth follows level, stats, element, and evolution stage.
        </p>
      </header>

      <section className="skillInventoryPanel" aria-label="Battle skills">
        <div className="skillInventoryHeader">
          <div>
            <h3>Battle Skill</h3>
          </div>
        </div>

        <div className="skillSlotGrid">
          {Array.from({ length: ACTIVE_SKILL_SLOT_COUNT }).map((_, index) => {
            const skill = equippedSkills[index];

            return (
              <article
                className={`skillSlotCard ${skill ? "is-filled" : "is-empty"}`}
                key={`active-skill-slot-${index}`}
              >
                {skill ? (
                  <>
                    <span>Slot {index + 1}</span>
                    <h4>{skill.displayName}</h4>
                    <p>{skill.formula}</p>

                    <button
                      type="button"
                      onClick={() => unequipSkill(skill.id)}
                    >
                      Move
                    </button>
                  </>
                ) : (
                  <h4>Slot {index + 1} Locked</h4>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <div className="skillsLadder">
        <div className="skillsLadderGrid">
          <div className="skillsLadderColumn skillsLadderColumn--left">
            {(["basic-strike", "guard", "mend"] as SkillId[]).map((skillId) => {
              const skill = skillsById[skillId];

              return skill ? (
                <SkillButton
                  key={skill.id}
                  skill={skill}
                  lane="left"
                  onClick={() => setActiveSkill(skill)}
                />
              ) : null;
            })}

            <article className="skillInfoCard" aria-label="Skill system notes">
              <h4 className="skillInfoTitle">
                <span className="skillInfoAccent">How Skills Grow:</span>
              </h4>

              <p className="skillInfoText">
                Every Kith has 10 Battle Skill slots.
              </p>

              <section className="skillInfoSection">
                <p className="skillInfoHeader">
                  <span className="skillInfoAccent">Basic:</span>
                </p>

                <p>Basic Strike, Guard, and Mend are unlocked from birth.</p>

                <p>They scale with level plus the matching stat.</p>
              </section>

              <section className="skillInfoSection">
                <p className="skillInfoHeader">
                  <span className="skillInfoAccent">Evolution:</span>
                </p>

                <p>
                  Weak Elemental, Lowform, Highform, Legion, and Mythical
                  Legendary unlock as your Kith evolves.
                </p>
              </section>

              <p className="skillInfoFooter">
                <span className="skillInfoAccent">
                  Bigger stages gain stronger skills.
                </span>
              </p>
            </article>
          </div>

          <div className="skillsLadderColumn skillsLadderColumn--right">
            {[
              "weak-element-strike",
              "lowform-skill",
              "highform-skill",
              "legion-skill",
              "mythic-legendary-skill",
            ].map((skillId) => {
              const skill = skillsById[skillId as SkillId];

              return skill ? (
                <SkillButton
                  key={skill.id}
                  skill={skill}
                  lane="right"
                  onClick={() => setActiveSkill(skill)}
                />
              ) : null;
            })}
          </div>
        </div>
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

            {isCoreBackupSkill(activeSkill.id) ? (
              <p className="coreSkillPopupNote">
                This is a core backup skill. Every Kith keeps this skill
                forever.
              </p>
            ) : null}

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

      {isSkillInventoryOpen ? (
        <PetSkillsInventory
          inventorySkills={inventorySkills}
          equippedSkillIds={equippedSkillIds}
          slotCap={ACTIVE_SKILL_SLOT_COUNT}
          onEquip={equipSkill}
          mode="modal"
          onClose={() => setIsSkillInventoryOpen(false)}
        />
      ) : null}

      {isSkillTreeOpen ? (
        <div
          className="skillPopupBackdrop"
          role="presentation"
          onMouseDown={() => setIsSkillTreeOpen(false)}
        >
          <SkillTree pet={pet} onClose={() => setIsSkillTreeOpen(false)} />
        </div>
      ) : null}
    </section>
  );
}
