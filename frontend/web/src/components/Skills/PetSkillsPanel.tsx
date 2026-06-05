import type { PetSkill, SkillId } from "./skillsRegistry";
import "./PetSkillsInventory.css";

export type DisplaySkill = PetSkill & {
  displayName: string;
  value: number | null;
  formula: string;
  unlocked: boolean;
  lockText: string;
};

type PetSkillsPanelProps = {
  inventorySkills: DisplaySkill[];
  equippedSkillIds: SkillId[];
  slotCap: number;
  onEquip: (skillId: SkillId) => void;
  onClose: () => void;
};

export default function PetSkillsPanel({
  inventorySkills,
  equippedSkillIds,
  slotCap,
  onEquip,
  onClose,
}: PetSkillsPanelProps) {
  const equippedCount = equippedSkillIds.length;
  const isFull = equippedCount >= slotCap;

  return (
    <div
      className="skillPopupBackdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="skillInventoryModal"
        role="dialog"
        aria-modal="true"
        aria-label="Skill Inventory"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="skillPopupClose" onClick={onClose}>
          Close
        </button>

        <h3 className="skillInventoryTitle">Skill Inventory</h3>

        <p className="skillPopupDescription">
          Equip unlocked battle skills into your active Kith loadout.
        </p>

        <p className="skillInventorySlotCount">
          Equipped: {equippedCount} / {slotCap}
        </p>

        {isFull ? (
          <p className="skillInventorySlotWarning">
            Your battle skill slots are full.
          </p>
        ) : null}

        {inventorySkills.length > 0 ? (
          <div className="skillInventoryGrid">
            {inventorySkills.map((skill) => {
              const isEquipped = equippedSkillIds.includes(skill.id as SkillId);

              return (
                <article className="skillInventoryCard" key={skill.id}>
                  <div className="skillInventoryCardInfo">
                    <h4 className="skillInventoryCardName">
                      {skill.displayName}
                    </h4>

                    <p className="skillInventoryCardDesc">
                      {skill.description}
                    </p>

                    <p className="skillInventoryCardFormula">
                      Power: {skill.value ?? "—"} | {skill.formula}
                    </p>
                  </div>

                  <div className="skillInventoryActions">
                    <button
                      type="button"
                      className="skillInventoryEquipBtn"
                      disabled={isFull || isEquipped}
                      onClick={() => onEquip(skill.id as SkillId)}
                    >
                      {isEquipped ? "Equipped" : "Equip"}
                    </button>

                    <button
                      type="button"
                      className="skillInventorySellBtn"
                      disabled
                    >
                      Sell Later
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="skillInventoryEmpty">
            No unlocked inventory skills available yet.
          </p>
        )}
      </section>
    </div>
  );
}
