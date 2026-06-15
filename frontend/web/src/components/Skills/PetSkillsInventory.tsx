import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import PetSkillsPanel, { type DisplaySkill } from "./PetSkillsPanel";
import {
  ALL_SKILLS,
  CORE_SKILLS,
  PROGRESSION_SKILLS,
  type SkillId,
} from "./skillsRegistry";
import "./PetSkillsPanel.css";

type PetSkillsInventoryProps = {
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

type BattleSkillSlot = {
  id: "slot-1" | "slot-2" | "slot-3" | "slot-4";
  label: string;
  skillId: SkillId | null;
  unlockText: string;
};

const SLOT_CAP = 4;

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
  "species-skill",
  "lowform-skill",
  "highform-skill",
  "legion-skill",
  "mythic-legendary-skill",
];

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

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getPetElementLabel(pet?: Record<string, any> | null) {
  const element = String(pet?.line ?? pet?.element ?? "Element");
  return titleCase(element);
}

function getPetSpeciesLabel(pet?: Record<string, any> | null) {
  const species = String(pet?.species ?? pet?.species_name ?? "Species");
  return titleCase(species);
}

function getPetName(pet?: Record<string, any> | null) {
  return String(
    pet?.nickname ?? pet?.name ?? pet?.species_name ?? pet?.species ?? "Kith",
  );
}

function getDisplayName(skillId: SkillId, pet?: Record<string, any> | null) {
  const speciesLabel = getPetSpeciesLabel(pet);

  switch (skillId) {
    case "basic-strike":
      return "Storm Strike";
    case "species-skill":
      return `${speciesLabel} Skill`;
    case "lowform-skill":
      return "Lowform Species Skill";
    case "highform-skill":
      return "Highform Species Skill";
    case "legion-skill":
      return "Legion Species Skill";
    case "mythic-legendary-skill":
      return "Mythical Legendary Species Skill";
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
      return { unlocked: level >= 1, lockText: "Starter Skill" };
    case "species-skill":
      return { unlocked: level >= 5, lockText: "Unlocks at Level 5" };
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
  stats?: PetSkillsInventoryProps["stats"],
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
    case "species-skill":
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

function getSkillType(skillId: SkillId) {
  switch (skillId) {
    case "basic-strike":
      return "Attack";
    case "guard":
      return "Guard";
    case "mend":
      return "Heal";
    case "species-skill":
      return "Species";
    default:
      return "Evolution";
  }
}

function buildDisplaySkills(
  pet?: Record<string, any> | null,
  stats?: PetSkillsInventoryProps["stats"],
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

export default function PetSkillsInventory({
  pet = null,
  stats = null,
}: PetSkillsInventoryProps) {
  const [selectedSkill, setSelectedSkill] = useState<DisplaySkill | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const [equippedSkillIds, setEquippedSkillIds] = useState<SkillId[]>([
    "basic-strike",
    "guard",
    "mend",
    "species-skill",
  ]);

  const displaySkills = useMemo(
    () => buildDisplaySkills(pet, stats),
    [pet, stats],
  );

  const unlockedSkillIds = useMemo(() => {
    return displaySkills
      .filter((skill) => skill.unlocked)
      .map((skill) => skill.id as SkillId);
  }, [displaySkills]);

  const equippedSkills = useMemo(() => {
    return equippedSkillIds
      .map((skillId) => displaySkills.find((skill) => skill.id === skillId))
      .filter((skill): skill is DisplaySkill => Boolean(skill));
  }, [displaySkills, equippedSkillIds]);

  const inventorySkills = useMemo(() => {
    return displaySkills.filter((skill) => {
      return skill.unlocked && !equippedSkillIds.includes(skill.id as SkillId);
    });
  }, [displaySkills, equippedSkillIds]);

  const petStats = { ...DEFAULT_STATS, ...(stats ?? {}) };
  const petName = getPetName(pet);
  const petLevel = getPetLevel(pet);
  const petElement = getPetElementLabel(pet);

  const battleSlots: BattleSkillSlot[] = [
    {
      id: "slot-1",
      label: "Slot 1",
      skillId: "basic-strike",
      unlockText: "Starter Skill",
    },
    {
      id: "slot-2",
      label: "Slot 2",
      skillId: "guard",
      unlockText: "Starter Skill",
    },
    {
      id: "slot-3",
      label: "Slot 3",
      skillId: "mend",
      unlockText: "Starter Skill",
    },
    {
      id: "slot-4",
      label: "Slot 4",
      skillId: "species-skill",
      unlockText: "Unlocks at Level 5",
    },
  ];

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

  function getSlotSkill(slot: BattleSkillSlot) {
    if (!slot.skillId) return null;
    return equippedSkills.find((skill) => skill.id === slot.skillId) ?? null;
  }

  function renderSkillButton(slot: BattleSkillSlot) {
    const skill = getSlotSkill(slot);
    const isLocked = !skill || !skill.unlocked;

    return (
      <button
        type="button"
        key={slot.id}
        className={[
          "skillBattleAction",
          isLocked ? "is-locked" : "is-ready",
          skill ? `skillBattleAction--${skill.id}` : "",
        ].join(" ")}
        onClick={() => {
          if (skill) setSelectedSkill(skill);
        }}
      >
        <span className="skillBattleActionSlot">{slot.label}</span>
        <span className="skillBattleActionName">
          {skill ? skill.displayName : "Locked Slot"}
        </span>
        <span className="skillBattleActionMeta">
          {isLocked
            ? (skill?.lockText ?? slot.unlockText)
            : `${getSkillType(skill.id as SkillId)} • ${skill.value ?? "—"}`}
        </span>
      </button>
    );
  }

  return (
    <section className="skillsPanel" aria-label="Skills Chamber">
      <header className="skillsPanelHeader">
        <div className="skillsHeaderTopRow">
          <div className="skillsPanelHeaderCopy">
            <p className="skillsEyebrow">Battle Loadout</p>
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
          </div>
        </div>

        <p className="skillsSubtitle">
          Build the four battle actions your Kith can use in combat.
        </p>
      </header>

      <section className="skillBattleHud" aria-label="Battle interface preview">
        <div className="skillBattleHudTop">
          <div className="skillBattlePetPlate">
            <span className="skillBattlePetName">{petName}</span>
            <span className="skillBattlePetMeta">
              LV {petLevel} • {petElement}
            </span>
          </div>

          <div className="skillBattleBars" aria-label="Health and mana">
            <div className="skillBattleBarRow">
              <span>HP</span>
              <div className="skillBattleBarTrack">
                <span
                  className="skillBattleBarFill skillBattleBarFill--hp"
                  style={{ width: "100%" }}
                />
              </div>
              <strong>{safeNumber(petStats.hp)}</strong>
            </div>

            <div className="skillBattleBarRow">
              <span>MP</span>
              <div className="skillBattleBarTrack">
                <span
                  className="skillBattleBarFill skillBattleBarFill--mp"
                  style={{ width: "100%" }}
                />
              </div>
              <strong>{safeNumber(petStats.mana)}</strong>
            </div>
          </div>
        </div>

        <div className="skillBattleStage" aria-hidden="true">
          <div className="skillBattleEnemyMarker skillBattleEnemyMarker--one">
            Enemy
          </div>
          <div className="skillBattleEnemyMarker skillBattleEnemyMarker--two">
            Enemy
          </div>
          <div className="skillBattleAllyMarker skillBattleAllyMarker--one">
            Kith
          </div>
          <div className="skillBattleAllyMarker skillBattleAllyMarker--two">
            Ally
          </div>
        </div>

        <div className="skillBattleCommandDeck">
          <div className="skillBattleCommandCore">
            <span>Command</span>
          </div>

          <div className="skillBattleActions">
            {battleSlots.map(renderSkillButton)}
          </div>
        </div>
      </section>

      <section className="skillLoadoutNotes" aria-label="Skill unlock notes">
        <article>
          <h3>Starter Skills</h3>
          <p>Storm Strike, Guard, and Mend are available at level 1.</p>
        </article>

        <article>
          <h3>Species Skill</h3>
          <p>
            The fourth battle slot wakes up at level 5 for hatchling species
            identity.
          </p>
        </article>
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
              ) && equippedSkillIds.includes(selectedSkill.id as SkillId) ? (
                <p className="coreSkillPopupNote">
                  This progression skill can be unequipped later when loadouts
                  are finalized.
                </p>
              ) : null}

              {PROGRESSION_SKILLS.some(
                (skill) => skill.id === selectedSkill.id,
              ) && equippedSkillIds.includes(selectedSkill.id as SkillId) ? (
                <div className="skillInventoryActions">
                  <button
                    type="button"
                    onClick={() => unequipSkill(selectedSkill.id as SkillId)}
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
          <PetSkillsPanel
            inventorySkills={inventorySkills}
            equippedSkillIds={equippedSkillIds}
            slotCap={SLOT_CAP}
            onEquip={equipSkill}
            onClose={() => setShowInventory(false)}
          />,
          document.body,
        )}
    </section>
  );
}
