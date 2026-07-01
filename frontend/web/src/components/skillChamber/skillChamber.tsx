import { type CSSProperties, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import PetSkillsInventory, {
  type DisplaySkill,
} from "../Skills/PetSkillsInventory";
import {
  ALL_SKILLS,
  PROGRESSION_SKILLS,
  type SkillId,
} from "../Skills/skillsRegistry";
import "./skillChamber.css";

type SkillChamberProps = {
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

type ChamberDisplaySkill = DisplaySkill & {
  formulaExpression?: string;
  isStarterCommand?: boolean;
  statLabel?: string;
  statValue?: number;
  unlockLine?: string;
};

type SkillCommandStyle = CSSProperties & {
  "--skill-command-bg"?: string;
  "--skill-command-border"?: string;
  "--skill-command-text"?: string;
  "--skill-command-value"?: string;
};

const SLOT_CAP = 4;
const INVENTORY_CAP = 10;

const DEFAULT_STATS = {
  hp: 0,
  atk: 0,
  def: 0,
  spd: 0,
  magi: 0,
  mana: 0,
};

const COMMAND_SKILL_IDS: SkillId[] = ["basic-strike", "guard", "mend"];

const LOADOUT_SKILL_IDS: SkillId[] = [
  "species-skill",
  "lowform-skill",
  "highform-skill",
  "legion-skill",
  "mythic-legendary-skill",
];

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

const SKILL_LANES: Record<SkillId, SkillLane> = {
  "basic-strike": "left",
  guard: "left",
  mend: "left",
  "species-skill": "right",
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

const ELEMENT_COMMAND_COLORS: Record<
  string,
  Pick<
    SkillCommandStyle,
    | "--skill-command-bg"
    | "--skill-command-border"
    | "--skill-command-text"
    | "--skill-command-value"
  >
> = {
  air: {
    "--skill-command-bg":
      "linear-gradient(180deg, #ffffff 0%, #eef9ff 48%, #ccecff 100%)",
    "--skill-command-border": "#d7f4ff",
    "--skill-command-text": "#24344a",
    "--skill-command-value": "#24344a",
  },
  fire: {
    "--skill-command-bg":
      "linear-gradient(180deg, #ff9a78 0%, #ff4d2f 52%, #a82312 100%)",
    "--skill-command-border": "#ffb19d",
    "--skill-command-text": "#ffffff",
    "--skill-command-value": "#ffffff",
  },
  water: {
    "--skill-command-bg":
      "linear-gradient(180deg, #87ddff 0%, #2f9cff 52%, #1556b8 100%)",
    "--skill-command-border": "#9ad7ff",
    "--skill-command-text": "#ffffff",
    "--skill-command-value": "#ffffff",
  },
  earth: {
    "--skill-command-bg":
      "linear-gradient(180deg, #c8f29a 0%, #7ac35a 52%, #3a7a27 100%)",
    "--skill-command-border": "#c9f3ad",
    "--skill-command-text": "#17300e",
    "--skill-command-value": "#17300e",
  },
  ice: {
    "--skill-command-bg":
      "linear-gradient(180deg, #ffffff 0%, #bdf3ff 48%, #64cae8 100%)",
    "--skill-command-border": "#ffffff",
    "--skill-command-text": "#17445a",
    "--skill-command-value": "#17445a",
  },
  storm: {
    "--skill-command-bg":
      "linear-gradient(180deg, #c9bbff 0%, #7e61ff 52%, #3a248f 100%)",
    "--skill-command-border": "#d3c9ff",
    "--skill-command-text": "#ffffff",
    "--skill-command-value": "#ffffff",
  },
  light: {
    "--skill-command-bg":
      "linear-gradient(180deg, #fffbd1 0%, #fff06f 48%, #d8a812 100%)",
    "--skill-command-border": "#fff8be",
    "--skill-command-text": "#3f3100",
    "--skill-command-value": "#3f3100",
  },
  shadow: {
    "--skill-command-bg":
      "linear-gradient(180deg, #9b5acc 0%, #522174 52%, #241033 100%)",
    "--skill-command-border": "#c58cff",
    "--skill-command-text": "#ffffff",
    "--skill-command-value": "#ffffff",
  },
  voidborne: {
    "--skill-command-bg":
      "linear-gradient(180deg, #53587f 0%, #1f203a 52%, #0b0c18 100%)",
    "--skill-command-border": "#aab2ff",
    "--skill-command-text": "#ffffff",
    "--skill-command-value": "#ffffff",
  },
  null_element: {
    "--skill-command-bg":
      "linear-gradient(180deg, #53587f 0%, #1f203a 52%, #0b0c18 100%)",
    "--skill-command-border": "#aab2ff",
    "--skill-command-text": "#ffffff",
    "--skill-command-value": "#ffffff",
  },
};

function getSkillLane(skillId: string): SkillLane {
  return SKILL_LANES[skillId as SkillId] ?? "left";
}

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

function getPetElementKey(pet?: Record<string, any> | null) {
  return String(pet?.line ?? pet?.element ?? "air")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function getCommandButtonStyle(
  skillId: SkillId,
  pet?: Record<string, any> | null,
): SkillCommandStyle | undefined {
  if (skillId !== "basic-strike") return undefined;

  const elementKey = getPetElementKey(pet);
  return ELEMENT_COMMAND_COLORS[elementKey] ?? ELEMENT_COMMAND_COLORS.air;
}

function getPetName(pet?: Record<string, any> | null) {
  return String(
    pet?.nickname?.trim?.() ||
      pet?.species_name?.trim?.() ||
      pet?.speciesName?.trim?.() ||
      pet?.name?.trim?.() ||
      pet?.species?.replace?.(/_/g, " ") ||
      "Wistpip",
  );
}

function getSkillDescription(skillId: SkillId, fallback: string) {
  if (skillId === "basic-strike") {
    return "A level 1 elemental starter attack shaped by elements.";
  }

  return fallback;
}

function getDisplayName(skillId: SkillId, pet?: Record<string, any> | null) {
  const elementLabel = getPetElementLabel(pet);

  switch (skillId) {
    case "basic-strike":
      return `${elementLabel} Strike`;
    case "species-skill":
      return "Hatchling Species Skill";
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
      return { unlocked: level >= 1, lockText: "Unlocks at Level 1" };
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
  stats?: SkillChamberProps["stats"],
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
        formula: `ATK + ${atk} + level`,
        formulaExpression: `ATK + ${atk} + level`,
        statLabel: "ATK",
        statValue: atk,
      };
    case "guard":
      return {
        value: level + def,
        formula: `DEF + ${def} + level`,
        formulaExpression: `DEF + ${def} + level`,
        statLabel: "DEF",
        statValue: def,
      };
    case "mend":
      return {
        value: level + magi,
        formula: `MAGI + ${magi} + level`,
        formulaExpression: `MAGI + ${magi} + level`,
        statLabel: "MAGI",
        statValue: magi,
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

function buildDisplaySkills(
  pet?: Record<string, any> | null,
  stats?: SkillChamberProps["stats"],
): ChamberDisplaySkill[] {
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
      description: getSkillDescription(
        skillId,
        skill?.description ?? "Battle skill.",
      ),
      displayName: getDisplayName(skillId, pet),
      value: math.value,
      formula: math.formula,
      formulaExpression: math.formulaExpression ?? math.formula,
      isStarterCommand:
        skillId === "basic-strike" || skillId === "guard" || skillId === "mend",
      statLabel: math.statLabel,
      statValue: math.statValue,
      unlockLine:
        skillId === "basic-strike" || skillId === "guard" || skillId === "mend"
          ? "Unlocks at Level 1"
          : unlock.lockText,
      unlocked: unlock.unlocked,
      lockText: unlock.lockText,
    };
  });
}

export default function SkillChamber({
  pet = null,
  stats = null,
}: SkillChamberProps) {
  const [selectedSkill, setSelectedSkill] =
    useState<ChamberDisplaySkill | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const [equippedSkillIds, setEquippedSkillIds] = useState<SkillId[]>([]);

  const displaySkills = useMemo(
    () => buildDisplaySkills(pet, stats),
    [pet, stats],
  );

  const unlockedSkillIds = useMemo(() => {
    return displaySkills
      .filter((skill) => skill.unlocked)
      .map((skill) => skill.id as SkillId);
  }, [displaySkills]);

  const equippedSkills = useMemo<
    (ChamberDisplaySkill & EquippedSkill)[]
  >(() => {
    return equippedSkillIds
      .map((skillId) => displaySkills.find((skill) => skill.id === skillId))
      .filter((skill): skill is ChamberDisplaySkill => Boolean(skill))
      .map((skill) => ({ ...skill, lane: getSkillLane(skill.id) }));
  }, [displaySkills, equippedSkillIds]);

  const inventorySkills = useMemo(() => {
    return displaySkills.filter((skill) => {
      return (
        LOADOUT_SKILL_IDS.includes(skill.id as SkillId) &&
        skill.unlocked &&
        !equippedSkillIds.includes(skill.id as SkillId)
      );
    });
  }, [displaySkills, equippedSkillIds]);

  const commandSkills = useMemo(() => {
    return COMMAND_SKILL_IDS.map((skillId) => {
      return displaySkills.find((skill) => skill.id === skillId);
    }).filter((skill): skill is ChamberDisplaySkill => Boolean(skill));
  }, [displaySkills]);

  const petName = getPetName(pet);
  const petLevel = getPetLevel(pet);

  function equipSkill(skillId: SkillId) {
    if (!LOADOUT_SKILL_IDS.includes(skillId)) return;
    if (equippedSkillIds.includes(skillId)) return;
    if (!unlockedSkillIds.includes(skillId)) return;
    if (equippedSkillIds.length >= SLOT_CAP) return;

    setEquippedSkillIds((currentSkillIds) => [...currentSkillIds, skillId]);
  }

  function unequipSkill(skillId: SkillId) {
    setEquippedSkillIds((currentSkillIds) => {
      return currentSkillIds.filter(
        (currentSkillId) => currentSkillId !== skillId,
      );
    });
  }

  return (
    <section
      className="skillsPanel dp-standard-panel"
      aria-label="Skills Chamber"
    >
      <header className="skillsPanelHeader">
        <div className="skillsHeaderTopRow">
          <div className="skillsPanelHeaderCopy">
            <h2 className="skillsTitle">Skills Chamber</h2>
          </div>
        </div>
      </header>

      <div className="skillChamberControlsRow">
        <div className="skillChamberCommandGrid" aria-label="Starter commands">
          {commandSkills.map((skill) => {
            return (
              <button
                type="button"
                key={skill.id}
                className={`skillChamberCommand skillChamberCommand--${skill.id}`}
                style={getCommandButtonStyle(skill.id as SkillId, pet)}
                onClick={() => setSelectedSkill(skill)}
              >
                <span>{skill.displayName}</span>
              </button>
            );
          })}
        </div>

        <div className="skillCenterActionRow">
          <button
            type="button"
            className="btn btn-gold"
            onClick={() => setShowInventory(true)}
          >
            Skill Inventory
          </button>
        </div>
      </div>

      <section className="skillInventoryPanel" aria-label="Battle skills">
        <div className="skillChamberStatusRow">
          <div className="skillChamberPetBadge">
            <strong
              className={
                petName.toLowerCase() === "novawhisp"
                  ? "is-novawhisp"
                  : undefined
              }
            >
              {petName.toUpperCase()}
            </strong>
            <span>LV {petLevel}</span>
          </div>

          <div className="skillChamberBars" aria-label="Pet battle vitals">
            <div className="skillChamberBarLine">
              <span>HP</span>
              <div className="skillChamberBarTrack">
                <i className="skillChamberBarFill skillChamberBarFill--hp" />
              </div>
            </div>

            <div className="skillChamberBarLine">
              <span>MP</span>
              <div className="skillChamberBarTrack">
                <i className="skillChamberBarFill skillChamberBarFill--mp" />
              </div>
            </div>
          </div>
        </div>

        <div className="skillChamberCommandPanel">
          <div
            className="skillChamberCommandOrb"
            style={getCommandButtonStyle("basic-strike", pet)}
            aria-label="Pet battle image slot"
          />

          <div
            className="skillChamberBattleSlots"
            aria-label="Learned skill slots"
          >
            {Array.from({ length: SLOT_CAP }).map((_, index) => {
              const skill = equippedSkills[index];

              return (
                <button
                  type="button"
                  className={[
                    "skillChamberBattleSlot",
                    skill ? "is-filled" : "is-empty",
                  ].join(" ")}
                  key={skill?.id ?? `slot-${index + 1}`}
                  onClick={() => {
                    if (skill) setSelectedSkill(skill);
                  }}
                >
                  <strong>{skill?.displayName ?? "Empty"}</strong>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {selectedSkill &&
        createPortal(
          <div
            className="skillPopupBackdrop"
            role="presentation"
            onMouseDown={() => setSelectedSkill(null)}
          >
            <section
              className="skillPopup dpPopupWindow dp-blue-grid-panel"
              role="dialog"
              aria-modal="true"
              aria-label={selectedSkill.displayName}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <h3>{selectedSkill.displayName}</h3>
              <p className="skillPopupDescription">
                {selectedSkill.description}
              </p>

              <div className="skillFormulaBox">
                <div className="skillFormulaRow">
                  <span>Unlock</span>
                  <strong>
                    {selectedSkill.unlockLine ?? selectedSkill.lockText}
                  </strong>
                </div>

                {selectedSkill.unlocked ? (
                  <>
                    <div className="skillFormulaRow">
                      <span>Level</span>
                      <strong>{petLevel}</strong>
                    </div>

                    {selectedSkill.statLabel ? (
                      <div className="skillFormulaRow">
                        <span>{selectedSkill.statLabel}</span>
                        <strong>
                          {selectedSkill.statLabel} +{" "}
                          {selectedSkill.statValue ?? 0}
                        </strong>
                      </div>
                    ) : null}

                    <div className="skillFormulaRow skillFormulaRow--power">
                      <span>Power</span>
                      <strong>{selectedSkill.value ?? "—"}</strong>
                    </div>
                  </>
                ) : (
                  <div className="skillFormulaRow skillFormulaRow--power">
                    <span>Requirement</span>
                    <strong>{selectedSkill.lockText}</strong>
                  </div>
                )}
              </div>

              <div className="skillPopupActions">
                <button
                  type="button"
                  className="skillPopupClose dp-btn--close"
                  onClick={() => setSelectedSkill(null)}
                >
                  Close
                </button>
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
          <PetSkillsInventory
            inventorySkills={inventorySkills}
            equippedSkillIds={equippedSkillIds}
            slotCap={INVENTORY_CAP}
            onEquip={equipSkill}
            mode="modal"
            onClose={() => setShowInventory(false)}
          />,
          document.body,
        )}
    </section>
  );
}
