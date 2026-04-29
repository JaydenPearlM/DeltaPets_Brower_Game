/**
 * PetSkillsInventory
 *
 * Standalone skill inventory component extracted from PetSkillsPanel.
 *
 * Two usage modes:
 *   1. modal  — rendered as a backdrop + dialog (original Skills Chamber button)
 *   2. inline — rendered flat, no backdrop (used inside the main Inventory page)
 */

import type { SkillId, PetSkill } from "./skillsRegistry";
import "./PetSkillsInventory.css";

export type DisplaySkill = PetSkill & {
  displayName: string;
  value: number | null;
  formula: string;
  unlocked: boolean;
  lockText?: string;
};

type PetSkillsInventoryProps = {
  inventorySkills: DisplaySkill[];
  equippedSkillIds: SkillId[];
  slotCap?: number;
  onEquip: (id: SkillId) => void;
  mode?: "modal" | "inline";
  onClose?: () => void;
};

export default function PetSkillsInventory({
  inventorySkills,
  equippedSkillIds,
  slotCap = 10,
  onEquip,
  mode = "modal",
  onClose,
}: PetSkillsInventoryProps) {
  const slotsFull = equippedSkillIds.length >= slotCap;

  const content = (
    <section
      className={
        mode === "modal"
          ? "skillInventoryModal"
          : "skillInventoryModal skillInventoryModal--inline"
      }
      role={mode === "modal" ? "dialog" : undefined}
      aria-modal={mode === "modal" ? "true" : undefined}
      aria-label="Pet Skill Inventory"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {mode === "modal" && onClose ? (
        <button type="button" className="skillPopupClose" onClick={onClose}>
          Close
        </button>
      ) : null}

      <h3 className="skillInventoryTitle">Pet Skill Inventory</h3>

      <p className="skillPopupDescription">
        Purchased and unlocked battle skills live here.
      </p>

      {slotsFull ? (
        <p className="skillInventorySlotWarning">
          All {slotCap} battle skill slots are filled. Move a skill to free a
          slot.
        </p>
      ) : (
        <p className="skillInventorySlotCount">
          {equippedSkillIds.length} / {slotCap} slots
        </p>
      )}

      {inventorySkills.length > 0 ? (
        <div className="skillInventoryGrid">
          {inventorySkills.map((skill) => (
            <article className="skillInventoryCard" key={skill.id}>
              <div className="skillInventoryCardInfo">
                <h4 className="skillInventoryCardName">{skill.displayName}</h4>
                <p className="skillInventoryCardDesc">{skill.description}</p>

                {skill.formula ? (
                  <p className="skillInventoryCardFormula">{skill.formula}</p>
                ) : null}
              </div>

              <div className="skillInventoryActions">
                <button
                  type="button"
                  className="skillInventoryEquipBtn"
                  onClick={() => onEquip(skill.id)}
                  disabled={slotsFull}
                  title={
                    slotsFull
                      ? "All slots are full"
                      : `Equip ${skill.displayName}`
                  }
                >
                  Equip
                </button>

                <button
                  type="button"
                  className="skillInventorySellBtn"
                  disabled
                  title="Selling coming later"
                >
                  Sell Later
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="skillInventoryEmpty">No Battle Skills.</p>
      )}
    </section>
  );

  if (mode === "inline") {
    return content;
  }

  return (
    <div
      className="skillPopupBackdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      {content}
    </div>
  );
}
