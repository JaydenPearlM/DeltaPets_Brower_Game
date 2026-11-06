filename: frontend/web/src/components/skillChamber/skillChamber.tsx
linenumber: 1
old_code:
```
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
```
new_code:
```
import { type CSSProperties, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { DisplaySkill } from "../Skills/PetSkillsInventory";
import {
  ALL_SKILLS,
  type SkillId,
} from "../Skills/skillsRegistry";
```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/components/skillChamber/skillChamber.tsx
linenumber: 10
old_code:
```
import { getKithnaPortrait } from "@/kith/registry/kithnaPortraits";

type SkillChamberProps = {
  pet?: Record<string, any> | null;
  stats?: {
    hp?: number | null;
```
new_code:
```
import { getKithnaPortrait } from "@/kith/registry/kithnaPortraits";

export type ChamberPet = {
  id?: string;
  name?: string | null;
  nickname?: string | null;
  species_name?: string | null;
  speciesName?: string | null;
  species?: string | null;
  stage?: string | null;
  line?: string | null;
  element?: string | null;
  level?: number | null;
  portrait_url?: string | null;
  sprite_url?: string | null;
  image_url?: string | null;
};

export type AuthoritativeSkillRecords = {
  petId: string;
  learnedSkillIds: readonly SkillId[];
  equippedSkillIds: readonly SkillId[];
};

type SkillChamberProps = {
  pet?: ChamberPet | null;
  records?: AuthoritativeSkillRecords | null;
  compact?: boolean;
  stats?: {
    hp?: number | null;
```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/components/skillChamber/skillChamber.tsx
linenumber: 46
old_code:
```
};

type SkillLane = "left" | "right" | "center";

type EquippedSkill = DisplaySkill & {
  lane: SkillLane;
};

type ChamberDisplaySkill = DisplaySkill & {
  formulaExpression?: string;
```
new_code:
```
};

type ChamberDisplaySkill = DisplaySkill & {
  formulaExpression?: string;
```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/components/skillChamber/skillChamber.tsx
linenumber: 62
old_code:
```

const SLOT_CAP = 4;
const INVENTORY_CAP = 10;

const DEFAULT_STATS = {
```
new_code:
```

const SLOT_CAP = 4;

const DEFAULT_STATS = {
```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/components/skillChamber/skillChamber.tsx
linenumber: 73
old_code:
```

const COMMAND_SKILL_IDS: SkillId[] = ["basic-strike", "guard", "mend"];

const LOADOUT_SKILL_IDS: SkillId[] = [
  "species-skill",
  "lowform-skill",
  "highform-skill",
  "legion-skill",
  "mythic-legendary-skill",
];

const SKILL_ORDER: SkillId[] = [
```
new_code:
```

const COMMAND_SKILL_IDS: SkillId[] = ["basic-strike", "guard", "mend"];

const SKILL_ORDER: SkillId[] = [
```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/components/skillChamber/skillChamber.tsx
linenumber: 84
old_code:
```
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
```
new_code:
```
  "mythic-legendary-skill",
];

const STAGE_RANKS: Record<string, number> = {
```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/components/skillChamber/skillChamber.tsx
linenumber: 178
old_code:
```
};

function getSkillLane(skillId: string): SkillLane {
  return SKILL_LANES[skillId as SkillId] ?? "left";
}

function safeNumber(value: unknown, fallback = 0) {
  const nextValue = Number(value);
```
new_code:
```
};

function safeNumber(value: unknown, fallback = 0) {
  const nextValue = Number(value);
```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/components/skillChamber/skillChamber.tsx
linenumber: 183
old_code:
```
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
```
new_code:
```
}

function getPetLevel(pet?: ChamberPet | null) {
  return Math.max(1, safeNumber(pet?.level, 1));
}

function getPetStageRank(pet?: ChamberPet | null) {
  const stage = String(pet?.stage ?? "").toLowerCase();
  return STAGE_RANKS[stage] ?? 0;
}

function getPetElementLabel(pet?: ChamberPet | null) {
  const element = String(pet?.line ?? pet?.element ?? "Element").replace(
    /_/g,
```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/components/skillChamber/skillChamber.tsx
linenumber: 205
old_code:
```
}

function getPetElementKey(pet?: Record<string, any> | null) {
  return String(pet?.line ?? pet?.element ?? "air")
    .trim()
```
new_code:
```
}

function getPetElementKey(pet?: ChamberPet | null) {
  return String(pet?.line ?? pet?.element ?? "air")
    .trim()
```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/components/skillChamber/skillChamber.tsx
linenumber: 224
old_code:
```
function getCommandButtonStyle(
  skillId: SkillId,
  pet?: Record<string, any> | null,
): React.CSSProperties | undefined {
  if (skillId === "guard") return GUARD_STYLE;
```
new_code:
```
function getCommandButtonStyle(
  skillId: SkillId,
  pet?: ChamberPet | null,
): React.CSSProperties | undefined {
  if (skillId === "guard") return GUARD_STYLE;
```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/components/skillChamber/skillChamber.tsx
linenumber: 237
old_code:
```
}

function getPetName(pet?: Record<string, any> | null) {
  return String(
    pet?.nickname?.trim?.() ||
```
new_code:
```
}

function getPetName(pet?: ChamberPet | null) {
  return String(
    pet?.nickname?.trim?.() ||
```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/components/skillChamber/skillChamber.tsx
linenumber: 256
old_code:
```
}

function getDisplayName(skillId: SkillId, pet?: Record<string, any> | null) {
  const elementLabel = getPetElementLabel(pet);

```
new_code:
```
}

function getDisplayName(skillId: SkillId, pet?: ChamberPet | null) {
  const elementLabel = getPetElementLabel(pet);

```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/components/skillChamber/skillChamber.tsx
linenumber: 277
old_code:
```
}

function getSkillUnlock(skillId: SkillId, pet?: Record<string, any> | null) {
  const level = getPetLevel(pet);
  const stageRank = getPetStageRank(pet);
```
new_code:
```
}

function getSkillUnlock(skillId: SkillId, pet?: ChamberPet | null) {
  const level = getPetLevel(pet);
  const stageRank = getPetStageRank(pet);
```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/components/skillChamber/skillChamber.tsx
linenumber: 306
old_code:
```
function getSkillMath(
  skillId: SkillId,
  pet?: Record<string, any> | null,
  stats?: SkillChamberProps["stats"],
) {
```
new_code:
```
function getSkillMath(
  skillId: SkillId,
  pet?: ChamberPet | null,
  stats?: SkillChamberProps["stats"],
) {
```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/components/skillChamber/skillChamber.tsx
linenumber: 372
old_code:
```

function buildDisplaySkills(
  pet?: Record<string, any> | null,
  stats?: SkillChamberProps["stats"],
): ChamberDisplaySkill[] {
```
new_code:
```

function buildDisplaySkills(
  pet?: ChamberPet | null,
  stats?: SkillChamberProps["stats"],
): ChamberDisplaySkill[] {
```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/components/skillChamber/skillChamber.tsx
linenumber: 412
old_code:
```
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
```
new_code:
```
  pet = null,
  stats = null,
  records = null,
  compact = false,
}: SkillChamberProps) {
  const [selectedSkill, setSelectedSkill] =
    useState<ChamberDisplaySkill | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const confirmedRecords = pet?.id && records?.petId === pet.id ? records : null;
  const equippedSkillIds = confirmedRecords?.equippedSkillIds ?? [];
  const displaySkills = useMemo(
    () => buildDisplaySkills(pet, stats),
    [pet, stats],
  );
  const equippedSkills = equippedSkillIds
    .filter((id) => confirmedRecords?.learnedSkillIds.includes(id))
    .map((id) => displaySkills.find((skill) => skill.id === id))
    .filter((skill): skill is ChamberDisplaySkill => Boolean(skill));

  const commandSkills = useMemo(() => {
```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/components/skillChamber/skillChamber.tsx
linenumber: 446
old_code:
```
    pet?.image_url;

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
```
new_code:
```
    pet?.image_url;

  const catalog = (
    <div className="skillChamberCatalog">
      <p>{pet?.id ? `${petName} · Level ${petLevel}` : "No active Kith available."}</p>
      <p>{confirmedRecords ? "Read-only skill records." : "Learned and equipped skills are not available yet."}</p>
      <p>Catalog requirements describe eligibility, not learned skills or combat availability. Species effects remain unapproved.</p>
      {pet?.id && <details>
        <summary>Skill catalog</summary>
        <ul>
          {displaySkills.map((skill) => (
            <li key={skill.id}>
              <strong>{skill.displayName}</strong>
              <span>{skill.unlockLine} · {skill.unlocked ? "Requirement met" : (pet?.stage || !["lowform-skill", "highform-skill", "legion-skill", "mythic-legendary-skill"].includes(skill.id) ? "Requirement not met" : "Stage unavailable")}</span>
              <span>{confirmedRecords ? (confirmedRecords.learnedSkillIds.includes(skill.id) ? "Learned" : "Not learned") : "Learning status unavailable"}</span>
            </li>
          ))}
        </ul>
      </details>}
    </div>
  );
  if (compact) return (
    <section className="skillsPanel skillsPanel--compact dp-standard-panel" aria-label="Skills Chamber">
      <h2 className="skillsTitle">Skills Chamber</h2>
      {catalog}
    </section>
  );

  return (
```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/components/skillChamber/skillChamber.tsx
linenumber: 508
old_code:
```
            onClick={() => setShowInventory(true)}
          >
            Skill Inventory
          </button>
        </div>
      </div>

      <section className="skillInventoryPanel" aria-label="Battle skills">
        <div className="skillChamberStatusRow">
          <div className="skillChamberPetBadge">
```
new_code:
```
            onClick={() => setShowInventory(true)}
          >
            Skill Catalog
          </button>
        </div>
      </div>

      {catalog}
      <section className="skillInventoryPanel" aria-label="Skill record preview">
        <div className="skillChamberStatusRow">
          <div className="skillChamberPetBadge">
```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/components/skillChamber/skillChamber.tsx
linenumber: 563
old_code:
```
          <div
            className="skillChamberBattleSlots"
            aria-label="Learned skill slots"
          >
            {Array.from({ length: SLOT_CAP }).map((_, index) => {
```
new_code:
```
          <div
            className="skillChamberBattleSlots"
            aria-label="Equipped skill records"
          >
            {Array.from({ length: SLOT_CAP }).map((_, index) => {
```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/components/skillChamber/skillChamber.tsx
linenumber: 580
old_code:
```
                  }}
                >
                  <strong>{skill?.displayName ?? "Empty"}</strong>
                </button>
              );
```
new_code:
```
                  }}
                >
                  <strong>{skill?.displayName ?? (confirmedRecords ? "Empty" : "Unavailable")}</strong>
                </button>
              );
```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/components/skillChamber/skillChamber.tsx
linenumber: 609
old_code:
```
              <div className="skillFormulaBox">
                <div className="skillFormulaRow">
                  <span>Unlock</span>
                  <strong>
                    {selectedSkill.unlockLine ?? selectedSkill.lockText}
```
new_code:
```
              <div className="skillFormulaBox">
                <div className="skillFormulaRow">
                  <span>Catalog requirement</span>
                  <strong>
                    {selectedSkill.unlockLine ?? selectedSkill.lockText}
```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/components/skillChamber/skillChamber.tsx
linenumber: 657
old_code:
```
                        <div className="skillFormulaRow skillFormulaRow--power">
                          <span>Power</span>
                          <strong>{selectedSkill.value ?? "—"}</strong>
                        </div>
                      </>
```
new_code:
```
                        <div className="skillFormulaRow skillFormulaRow--power">
                          <span>Power</span>
                          <strong>{selectedSkill.value ?? "â€”"}</strong>
                        </div>
                      </>
```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/components/skillChamber/skillChamber.tsx
linenumber: 680
old_code:
```
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
```
new_code:
```
              </div>

            </section>
          </div>,
```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/components/skillChamber/skillChamber.tsx
linenumber: 687
old_code:
```
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
```
new_code:
```
      {showInventory &&
        createPortal(
          <div className="skillPopupBackdrop" onMouseDown={() => setShowInventory(false)}>
            <section className="skillPopup dpPopupWindow dp-blue-grid-panel" role="dialog" aria-modal="true" aria-label="Skill catalog" onMouseDown={(event) => event.stopPropagation()}>
              {catalog}
              <button type="button" className="skillPopupClose dp-btn--close" onClick={() => setShowInventory(false)}>Close</button>
            </section>
          </div>,
          document.body,
        )}
```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodPage.tsx
linenumber: 18
old_code:
```
import { kennithCatalog } from "@/lib/kithna/kennithCatalog";
import WildwoodScene from "./WildwoodScene";
import "./wildwood.css";

```
new_code:
```
import { kennithCatalog } from "@/lib/kithna/kennithCatalog";
import WildwoodScene from "./WildwoodScene";
import SkillsChamber from "@/components/skillChamber/skillChamber";
import "./wildwood.css";

```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodPage.tsx
linenumber: 286
old_code:
```

  const room = session?.room;
  const pathStep = Math.min(100, Math.max(0, room?.sequence ?? visitSteps));

```
new_code:
```

  const room = session?.room;
  const chamberPet = session?.team.find((pet) => pet.hpCur > 0);
  const pathStep = Math.min(100, Math.max(0, room?.sequence ?? visitSteps));

```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodPage.tsx
linenumber: 446
old_code:
```
              </div>

                <section
                  className="ww-explore-viewport"
```
new_code:
```
              </div>

              <div className="ww-middle-column">
                <SkillsChamber
                  key={chamberPet?.id ?? "no-kith"}
                  compact
                  pet={chamberPet ? {
                    id: chamberPet.id, name: chamberPet.name,
                    species: chamberPet.speciesId, level: chamberPet.level,
                    element: chamberPet.element,
                  } : null}
                />
                <section
                  className="ww-explore-viewport"
```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodPage.tsx
linenumber: 493
old_code:
```
                  </div>
                </section>

              <section
```
new_code:
```
                  </div>
                </section>
              </div>

              <section
```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/pages/Cities/Kithna/Wildwood/wildwood.css
linenumber: 322
old_code:
```
}

.ww-page .ww-exploration-layout > .ww-explore-viewport {
  display: flex;
  flex-direction: column;
```
new_code:
```
}

.ww-page .ww-middle-column > .ww-explore-viewport {
  display: flex;
  flex-direction: column;
```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/pages/Cities/Kithna/Wildwood/wildwood.css
linenumber: 338
old_code:
```
}

.ww-exploration-layout > .ww-explore-viewport,
.ww-exploration-layout > .ww-art-panel {
  background-image: var(--dp-standard-panel-blue-grid);
```
new_code:
```
}

.ww-middle-column > .ww-explore-viewport,
.ww-exploration-layout > .ww-art-panel {
  background-image: var(--dp-standard-panel-blue-grid);
```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/pages/Cities/Kithna/Wildwood/wildwood.css
linenumber: 892
old_code:
```
  }
}
```
new_code:
```
  }
}

.ww-middle-column { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.ww-middle-column .skillsPanel--compact { padding: 16px; margin: 0; min-width: 0; border-radius: 8px; border-width: 1px; }
.ww-middle-column .skillsPanel--compact::before { inset: 4px; border-radius: 5px; }
.ww-middle-column .skillsTitle { transform: none; white-space: normal; font-size: 1rem; line-height: 1.3; }
```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.

filename: frontend/web/src/components/skillChamber/skillChamber.css
linenumber: 1552
old_code:
```
  }
}
```
new_code:
```
  }
}

.skillChamberCatalog { min-width: 0; overflow-wrap: anywhere; font-size: 0.8rem; line-height: 1.45; }
.skillChamberCatalog ul { list-style: none; padding: 0; }
.skillChamberCatalog li { display: flex; flex-direction: column; gap: 4px; margin: 12px 0; }
.skillChamberCatalog summary { cursor: pointer; color: var(--dp-title-gold, #ffdf75); }
```
description: Shared read-only skill foundation and compact Wildwood placement; no gameplay mutation.