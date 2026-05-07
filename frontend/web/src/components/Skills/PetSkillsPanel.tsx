import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import PetSkillsInventory, { type DisplaySkill } from "./PetSkillsInventory";
import SkillTree from "./skilltree";
import {
  ALL_SKILLS,
  CORE_SKILLS,
  PROGRESSION_SKILLS,
  type SkillId,
} from "./skillsRegistry";
import "./PetSkillsPanel.css";

type PetSkillsPanelProps = {
  pet?: Record<string, any> | null;
  stats?: {
    hp?: number | null;
    atk?: number | null;
    def?: number | null;
    spd?: number | null;
    magi?: number | null;
    mana?: number | null;
  } | null;
};

type SkillLane = "left" | "right" | "center";

type EquippedSkill = DisplaySkill & {
  lane: SkillLane;
};

const SLOT_CAP = 10;

const DEFAULT_STATS = {
  hp: 0,
  atk: 0,
  def: 0,
  spd: 0,
  magi: 0,
  mana: 0,
};

const SKILL_ORDER: SkillId[] = [
  "basic-strike",
  "guard",
  "mend",
  "weak-element-strike",
  "lowform-skill",
  "highform-skill",
  "legion-skill",
  "mythic-legendary-skill",
];

const SKILL_LANES: Record<SkillId, SkillLane> = {
  "basic-strike": "left",
  guard: "left",
  mend: "left",
  "weak-element-strike": "right",
  "lowform-skill": "right",
  "highform-skill": "right",
  "legion-skill": "right",
  "mythic-legendary-skill": "center",
};

const STAGE_RANKS: Record<string, number> = {
  egg: 0,
  hatchling: 1,
  lowform: 2,
  highform: 3,
  legion: 4,
  mythic_legendary: 5,
  mythical_legendary: 5,
};

function safeNumber(value: unknown, fallback = 0) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : fallback;
}

function getPetLevel(pet?: Record<string, any> | null) {
  return Math.max(1, safeNumber(pet?.level, 1));
}

function getPetStageRank(pet?: Record<string, any> | null) {
  const stage = String(pet?.stage ?? "hatchling").toLowerCase();
  return STAGE_RANKS[stage] ?? 1;
}

function getPetElementLabel(pet?: Record<string, any> | null) {
  const element = String(pet?.line ?? pet?.element ?? "Element").replace(
    /_/g,
    " ",
  );
  return element
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getDisplayName(skillId: SkillId, pet?: Record<string, any> | null) {
  const elementLabel = getPetElementLabel(pet);

  switch (skillId) {
    case "weak-element-strike":
      return `${elementLabel} Strike`;
    case "lowform-skill":
      return `${elementLabel} Lowform Skill`;
    case "highform-skill":
      return `${elementLabel} Highform Skill`;
    case "legion-skill":
      return `${elementLabel} Legion Skill`;
    case "mythic-legendary-skill":
      return `${elementLabel} Mythical Legendary Skill`;
    default:
      return ALL_SKILLS.find((skill) => skill.id === skillId)?.name ?? skillId;
  }
}

function getSkillUnlock(skillId: SkillId, pet?: Record<string, any> | null) {
  const level = getPetLevel(pet);
  const stageRank = getPetStageRank(pet);

  switch (skillId) {
    case "basic-strike":
    case "guard":
    case "mend":
      return { unlocked: level >= 2, lockText: "Unlocks at Level 2" };
    case "weak-element-strike":
      return { unlocked: level >= 2, lockText: "Unlocks at Level 2" };
    case "lowform-skill":
      return { unlocked: stageRank >= 2, lockText: "Unlocks at Lowform" };
    case "highform-skill":
      return { unlocked: stageRank >= 3, lockText: "Unlocks at Highform" };
    case "legion-skill":
      return { unlocked: stageRank >= 4, lockText: "Unlocks at Legion" };
    case "mythic-legendary-skill":
      return {
        unlocked: stageRank >= 5,
        lockText: "Unlocks at Mythical Legendary",
      };
    default:
      return { unlocked: false, lockText: "Locked" };
  }
}

function getSkillMath(
  skillId: SkillId,
  pet?: Record<string, any> | null,
  stats?: PetSkillsPanelProps["stats"],
) {
  const petStats = { ...DEFAULT_STATS, ...(stats ?? {}) };
  const level = getPetLevel(pet);
  const atk = safeNumber(petStats.atk);
  const def = safeNumber(petStats.def);
  const magi = safeNumber(petStats.magi);
  const spd = safeNumber(petStats.spd);

  switch (skillId) {
    case "basic-strike":
      return {
        value: level + atk,
        formula: `Level ${level} + ATK ${atk}`,
      };
    case "guard":
      return {
        value: level + def,
        formula: `Level ${level} + DEF ${def}`,
      };
    case "mend":
      return {
        value: level + magi,
        formula: `Level ${level} + MAGI ${magi}`,
      };
    case "weak-element-strike":
      return {
        value: level + Math.ceil((atk + magi) / 2),
        formula: `Level ${level} + half ATK/MAGI`,
      };
    case "lowform-skill":
      return {
        value: level + atk + 2,
        formula: `Level ${level} + ATK ${atk} + 2`,
      };
    case "highform-skill":
      return {
        value: level + atk + spd + 3,
        formula: `Level ${level} + ATK ${atk} + SPD ${spd} + 3`,
      };
    case "legion-skill":
      return {
        value: level + atk + def + 5,
        formula: `Level ${level} + ATK ${atk} + DEF ${def} + 5`,
      };
    case "mythic-legendary-skill":
      return {
        value: level + atk + def + magi + spd + 8,
        formula: `Level ${level} + core stats + 8`,
      };
    default:
      return { value: null, formula: "" };
  }
}

function buildDisplaySkills(
  pet?: Record<string, any> | null,
  stats?: PetSkillsPanelProps["stats"],
): DisplaySkill[] {
  return SKILL_ORDER.map((skillId) => {
    const skill = ALL_SKILLS.find((entry) => entry.id === skillId);
    const unlock = getSkillUnlock(skillId, pet);
    const math = getSkillMath(skillId, pet, stats);

    return {
      ...(skill ?? {
        id: skillId,
        name: skillId,
        tree: "combat" as const,
        description: "Battle skill.",
      }),
      displayName: getDisplayName(skillId, pet),
      value: math.value,
      formula: math.formula,
      unlocked: unlock.unlocked,
      lockText: unlock.lockText,
    };
  });
}

export default function PetSkillsPanel({
  pet = null,
  stats = null,
}: PetSkillsPanelProps) {
  const [selectedSkill, setSelectedSkill] = useState<DisplaySkill | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const [showTree, setShowTree] = useState(false);
  const [equippedSkillIds, setEquippedSkillIds] = useState<SkillId[]>([
    "basic-strike",
    "guard",
    "mend",
  ]);

  const displaySkills = useMemo(
    () => buildDisplaySkills(pet, stats),
    [pet, stats],
  );

  const unlockedSkillIds = useMemo(() => {
    return displaySkills
      .filter((skill) => skill.unlocked)
      .map((skill) => skill.id);
  }, [displaySkills]);

  const equippedSkills = useMemo<EquippedSkill[]>(() => {
    return equippedSkillIds
      .map((skillId) => displaySkills.find((skill) => skill.id === skillId))
      .filter((skill): skill is DisplaySkill => Boolean(skill))
      .map((skill) => ({ ...skill, lane: SKILL_LANES[skill.id] ?? "left" }));
  }, [displaySkills, equippedSkillIds]);

  const inventorySkills = useMemo(() => {
    return displaySkills.filter((skill) => {
      return skill.unlocked && !equippedSkillIds.includes(skill.id);
    });
  }, [displaySkills, equippedSkillIds]);

  function equipSkill(skillId: SkillId) {
    if (equippedSkillIds.includes(skillId)) return;
    if (!unlockedSkillIds.includes(skillId)) return;
    if (equippedSkillIds.length >= SLOT_CAP) return;

    setEquippedSkillIds((currentSkillIds) => [...currentSkillIds, skillId]);
  }

  function unequipSkill(skillId: SkillId) {
    if (CORE_SKILLS.some((skill) => skill.id === skillId)) return;

    setEquippedSkillIds((currentSkillIds) => {
      return currentSkillIds.filter(
        (currentSkillId) => currentSkillId !== skillId,
      );
    });
  }

  function renderSkillCard(skill: DisplaySkill, lane: SkillLane) {
    const cardClassName = [
      "skillTrapezoid",
      `skillTrapezoid--${skill.id}`,
      `skillTrapezoid--lane-${lane}`,
      skill.unlocked ? "is-unlocked" : "is-locked",
    ].join(" ");

    return (
      <button
        type="button"
        key={skill.id}
        className={cardClassName}
        onClick={() => setSelectedSkill(skill)}
      >
        <span className="skillTrapezoidBorder" aria-hidden="true" />
        <span className="skillName">{skill.displayName}</span>
        <span className="skillValue">
          {skill.unlocked ? (skill.value ?? "—") : "Locked"}
        </span>
        <span className="skillDescription">
          {skill.unlocked ? skill.description : skill.lockText}
        </span>
      </button>
    );
  }

  const leftColumnSkills = displaySkills.filter((skill) => {
    return SKILL_LANES[skill.id] === "left";
  });

  const rightColumnSkills = displaySkills.filter((skill) => {
    return SKILL_LANES[skill.id] === "right";
  });

  const mythicalSkill = displaySkills.find((skill) => {
    return skill.id === "mythic-legendary-skill";
  });

  return (
    <section className="skillsPanel" aria-label="Skills Chamber">
      <header className="skillsPanelHeader">
        <div className="skillsHeaderTopRow">
          <div className="skillsPanelHeaderCopy">
            <h2 className="skillsTitle">Skills Chamber</h2>
          </div>

          <div className="skillCenterActionRow">
            <button
              type="button"
              className="skillChamberActionButton skillChamberActionButton--gold"
              onClick={() => setShowInventory(true)}
            >
              Skill Inventory
            </button>

            <button
              type="button"
              className="skillChamberActionButton skillChamberActionButton--gold"
              onClick={() => setShowTree(true)}
            >
              Skill Trees
            </button>
          </div>
        </div>

        <p className="skillsSubtitle">
          Equip battle skills and preview the Kith talent paths.
        </p>
      </header>

      <section className="skillInventoryPanel" aria-label="Battle skills">
        <div className="skillInventoryHeader">
          <h3>Battle Skills</h3>
        </div>

        <div className="skillSlotGrid">
          {Array.from({ length: SLOT_CAP }).map((_, index) => {
            const skill = equippedSkills[index];

            if (!skill) {
              return (
                <article
                  className="skillSlotCard is-empty"
                  key={`slot-${index + 1}`}
                >
                  <h4>Locked</h4>
                </article>
              );
            }

            return (
              <article className="skillSlotCard is-filled" key={skill.id}>
                <h4>{skill.displayName}</h4>
                <button type="button" onClick={() => setSelectedSkill(skill)}>
                  Details
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="skillsLadder" aria-label="Skill ladder">
        <div className="skillExplanationBox">
          <p>
            Battle Skills are combat actions that unlock through level and
            evolution progress. Core skill scaling still uses your Kith stats
            behind the scenes.
          </p>
        </div>

        <div className="skillsLadderGrid">
          <div className="skillsLadderColumn">
            {leftColumnSkills.map((skill) => {
              return renderSkillCard(skill, SKILL_LANES[skill.id] ?? "left");
            })}
          </div>

          <div className="skillsLadderColumn">
            {rightColumnSkills.map((skill) => {
              return renderSkillCard(skill, SKILL_LANES[skill.id] ?? "right");
            })}
          </div>
        </div>

        {mythicalSkill?.unlocked ? (
          <div className="skillsMythicRow">
            {renderSkillCard(mythicalSkill, "center")}
          </div>
        ) : null}
      </section>

      {selectedSkill &&
        createPortal(
          <div
            className="skillPopupBackdrop"
            role="presentation"
            onMouseDown={() => setSelectedSkill(null)}
          >
            <section
              className="skillPopup"
              role="dialog"
              aria-modal="true"
              aria-label={selectedSkill.displayName}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="skillPopupClose"
                onClick={() => setSelectedSkill(null)}
              >
                Close
              </button>

              <p className="skillPopupEyebrow">Battle Skill</p>
              <h3>{selectedSkill.displayName}</h3>
              <p className="skillPopupDescription">
                {selectedSkill.description}
              </p>

              <div className="skillFormulaBox">
                <span>{selectedSkill.unlocked ? "Power" : "Requirement"}</span>
                <strong>
                  {selectedSkill.unlocked
                    ? `${selectedSkill.value ?? "—"} — ${selectedSkill.formula}`
                    : selectedSkill.lockText}
                </strong>
              </div>

              {PROGRESSION_SKILLS.some(
                (skill) => skill.id === selectedSkill.id,
              ) && equippedSkillIds.includes(selectedSkill.id) ? (
                <p className="coreSkillPopupNote">
                  This progression skill can be unequipped later when loadouts
                  are finalized.
                </p>
              ) : null}

              {PROGRESSION_SKILLS.some(
                (skill) => skill.id === selectedSkill.id,
              ) && equippedSkillIds.includes(selectedSkill.id) ? (
                <div className="skillInventoryActions">
                  <button
                    type="button"
                    onClick={() => unequipSkill(selectedSkill.id)}
                  >
                    Unequip
                  </button>
                </div>
              ) : null}
            </section>
          </div>,
          document.body,
        )}

      {showInventory &&
        createPortal(
          <PetSkillsInventory
            inventorySkills={inventorySkills}
            equippedSkillIds={equippedSkillIds}
            slotCap={SLOT_CAP}
            onEquip={equipSkill}
            onClose={() => setShowInventory(false)}
          />,
          document.body,
        )}

      {showTree &&
        createPortal(
          <div
            className="skillPopupBackdrop"
            role="presentation"
            onMouseDown={() => setShowTree(false)}
          >
            <SkillTree pet={pet} onClose={() => setShowTree(false)} />
          </div>,
          document.body,
        )}
    </section>
  );
}
