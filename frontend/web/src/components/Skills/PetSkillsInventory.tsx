/**
 * PetSkillsInventory
 *
 * Standalone skill inventory popup component.
 *
 * Two usage modes:
 *   1. modal  — rendered as a backdrop + dialog (original Skills Chamber button)
 *   2. inline — rendered flat, no backdrop (used inside the main Inventory page)
 */

import { useMemo, useState } from "react";
import type { SkillId, PetSkill } from "./skillsRegistry";
import "./PetSkillsInventory.css";

export type DisplaySkill = PetSkill & {
  displayName: string;
  value: number | null;
  formula: string;
  unlocked: boolean;
  lockText?: string;
  requiredLevel?: number;
  elements?: string[];
};

type SkillInventorySort = "name" | "level" | "elements";
type SkillElementFilter =
  | "all"
  | "fire"
  | "water"
  | "earth"
  | "air"
  | "ice"
  | "storm"
  | "light"
  | "shadow"
  | "voidborne";

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
  onEquip,
  mode = "modal",
  onClose,
}: PetSkillsInventoryProps) {
  const [sortBy, setSortBy] = useState<SkillInventorySort>("name");
  const [elementFilter, setElementFilter] = useState<SkillElementFilter>("all");
  const totalSlots = 30;
  const inventoryCount = inventorySkills.length;
  const inventoryFull = inventoryCount >= totalSlots;

  const sortedSkills = useMemo(() => {
    return [...inventorySkills]
      .filter((skill) => {
        if (elementFilter === "all") return true;

        return skill.elements?.some((element) => {
          const elementKey = element.toLowerCase();

          if (elementFilter === "voidborne") {
            return elementKey === "voidborne" || elementKey === "null_element";
          }

          return elementKey === elementFilter;
        });
      })
      .sort((left, right) => {
        if (sortBy === "level") {
          return (
            (left.requiredLevel ?? 1) - (right.requiredLevel ?? 1) ||
            left.displayName.localeCompare(right.displayName)
          );
        }

        if (sortBy === "elements") {
          return (
            (left.elements?.length ?? 0) - (right.elements?.length ?? 0) ||
            left.displayName.localeCompare(right.displayName)
          );
        }

        return left.displayName.localeCompare(right.displayName);
      })
      .slice(0, totalSlots);
  }, [elementFilter, inventorySkills, sortBy]);

  const inventorySlots = useMemo(() => {
    return Array.from(
      { length: totalSlots },
      (_, index) => sortedSkills[index] ?? null,
    );
  }, [sortedSkills]);

  const content = (
    <section
      className={
        mode === "modal"
          ? "skillInventoryModal dpPopupWindow dp-blue-grid-panel"
          : "skillInventoryModal skillInventoryModal--inline dp-blue-grid-panel"
      }
      role={mode === "modal" ? "dialog" : undefined}
      aria-modal={mode === "modal" ? "true" : undefined}
      aria-label="Pet Skill Inventory"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <h3 className="skillInventoryTitle">
        Skill <span>Inventory</span>
      </h3>

      {inventorySkills.length === 0 ? (
        <p className="skillInventoryEmpty">No purchased skills.</p>
      ) : null}

      <div className="skillInventoryToolbar">
        <label className="skillInventorySortLabel" htmlFor="skill-element">
          Element
        </label>
        <select
          id="skill-element"
          className="skillInventorySort"
          value={elementFilter}
          onChange={(event) =>
            setElementFilter(event.target.value as SkillElementFilter)
          }
        >
          <option value="all">All Elements</option>
          <option value="fire">Fire</option>
          <option value="water">Water</option>
          <option value="earth">Earth</option>
          <option value="air">Air</option>
          <option value="ice">Ice</option>
          <option value="storm">Storm</option>
          <option value="light">Light</option>
          <option value="shadow">Shadow</option>
          <option value="voidborne">Voidborne</option>
        </select>

        <label className="skillInventorySortLabel" htmlFor="skill-sort">
          Sort
        </label>
        <select
          id="skill-sort"
          className="skillInventorySort"
          value={sortBy}
          onChange={(event) =>
            setSortBy(event.target.value as SkillInventorySort)
          }
        >
          <option value="name">Name</option>
          <option value="level">Required Level</option>
          <option value="elements">Element Count</option>
        </select>
      </div>

      {inventoryFull ? (
        <p className="skillInventorySlotWarning">
          Inventory is full. Move or sell a skill before adding another.
        </p>
      ) : null}

      <div className="skillInventoryDivider" />

      <div className="skillInventoryGrid" aria-label="Skill inventory slots">
        {inventorySlots.map((skill, index) => {
          if (skill) {
            const isEquipped = equippedSkillIds.includes(skill.id);
            const skillElements = skill.elements?.slice(0, 4) ?? [];

            return (
              <button
                type="button"
                className="skillInventoryCard"
                key={skill.id}
                onClick={() => onEquip(skill.id)}
                disabled={isEquipped}
                title={`Place ${skill.displayName} into a Skills Chamber slot`}
              >
                <span className="skillInventoryCardIcon" aria-hidden="true" />

                <span className="skillInventoryCardInfo">
                  <span className="skillInventoryCardName">
                    {skill.displayName}
                  </span>
                  <span className="skillInventoryCardLevel">
                    Level {skill.requiredLevel ?? 1}+
                  </span>
                  <span className="skillInventoryCardElements">
                    {skillElements.length > 0
                      ? skillElements.map((element) => (
                          <span
                            className="skillInventoryElement"
                            key={`${skill.id}-${element}`}
                          >
                            {element}
                          </span>
                        ))
                      : "No element"}
                  </span>
                </span>

                <span className="skillInventoryCardMeta">
                  <span className="skillInventoryCardDescription">
                    {skill.description}
                  </span>
                  <strong className="skillInventoryCardAction">
                    {isEquipped ? "Equipped" : "Add to Slot"}
                  </strong>
                </span>
              </button>
            );
          }

          return (
            <div
              className="skillInventoryCard skillInventoryCard--empty"
              key={`empty-skill-slot-${index + 1}`}
            >
              <span className="skillInventoryCardIcon" aria-hidden="true" />

              <span className="skillInventoryCardInfo">
                <span className="skillInventoryCardName">Skill Slot</span>
                <span className="skillInventoryCardLevel">Empty</span>
              </span>

              <span className="skillInventoryCardMeta">No skill</span>
            </div>
          );
        })}
      </div>

      {mode === "modal" && onClose ? (
        <div className="skillInventoryFooter">
          <button
            type="button"
            className="skillInventoryCloseBtn dp-btn--pearl"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      ) : null}
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
