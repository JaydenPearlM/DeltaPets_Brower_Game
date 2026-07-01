import { useMemo, useState } from "react";
import DpPopupWindow from "../DpPopupWindow";
import "./Armory.css";

export type ArmoryGearType =
  | "weapon"
  | "head"
  | "body"
  | "arms"
  | "legs"
  | "feet"
  | "ring"
  | "charm";

export type ArmoryElement =
  | "fire"
  | "water"
  | "earth"
  | "air"
  | "ice"
  | "storm"
  | "light"
  | "shadow"
  | "voidborne";

export type ArmoryClosetItem = {
  id: string;
  name: string;
  gearType: ArmoryGearType;
  requiredLevel: number;
  elements: ArmoryElement[];
  description: string;
  iconUrl?: string;
};

type GearTypeFilter = "all" | ArmoryGearType;
type ElementFilter = "all" | ArmoryElement;
type ClosetSort = "gearType" | "element" | "requiredLevel";

const CLOSET_CAPACITY = 30;

const GEAR_TYPE_LABELS: Record<ArmoryGearType, string> = {
  weapon: "Weapon",
  head: "Head Gear",
  body: "Body Gear",
  arms: "Arm Gear",
  legs: "Leg Gear",
  feet: "Foot Gear",
  ring: "Ring",
  charm: "Charm",
};

type ArmorySlot = {
  key: string;
  slotName: string;
  itemName: string;
  rarity: "empty" | "common" | "uncommon" | "rare" | "legendary";
  stats: string;
};

const ARMOR_SLOTS: ArmorySlot[] = [
  {
    key: "weapon",
    slotName: "Weapon",
    itemName: "Empty",
    rarity: "empty",
    stats: "No stats",
  },
  {
    key: "head",
    slotName: "Head Gear",
    itemName: "Empty",
    rarity: "empty",
    stats: "No stats",
  },
  {
    key: "body",
    slotName: "Body Gear",
    itemName: "Empty",
    rarity: "empty",
    stats: "No stats",
  },
  {
    key: "arms",
    slotName: "Arm Gear",
    itemName: "Empty",
    rarity: "empty",
    stats: "No stats",
  },
  {
    key: "legs",
    slotName: "Leg Gear",
    itemName: "Empty",
    rarity: "empty",
    stats: "No stats",
  },
  {
    key: "feet",
    slotName: "Foot Gear",
    itemName: "Empty",
    rarity: "empty",
    stats: "No stats",
  },
];

const ARMORY_ITEM_SLOTS: ArmorySlot[] = [
  {
    key: "ring-one",
    slotName: "Ring",
    itemName: "Empty",
    rarity: "empty",
    stats: "No stats",
  },
  {
    key: "ring-two",
    slotName: "Ring",
    itemName: "Empty",
    rarity: "empty",
    stats: "No stats",
  },
  {
    key: "charm-one",
    slotName: "Charm",
    itemName: "Empty",
    rarity: "empty",
    stats: "No stats",
  },
  {
    key: "charm-two",
    slotName: "Charm",
    itemName: "Empty",
    rarity: "empty",
    stats: "No stats",
  },
  {
    key: "charm-three",
    slotName: "Charm",
    itemName: "Empty",
    rarity: "empty",
    stats: "No stats",
  },
];

type ArmoryClosetProps = {
  items: ArmoryClosetItem[];
  onClose: () => void;
};

function ArmoryCloset({ items, onClose }: ArmoryClosetProps) {
  const [gearTypeFilter, setGearTypeFilter] = useState<GearTypeFilter>("all");
  const [elementFilter, setElementFilter] = useState<ElementFilter>("all");
  const [sortBy, setSortBy] = useState<ClosetSort>("gearType");

  const sortedItems = useMemo(() => {
    return [...items]
      .filter((item) => {
        if (gearTypeFilter === "all") return true;
        return item.gearType === gearTypeFilter;
      })
      .filter((item) => {
        if (elementFilter === "all") return true;
        return item.elements.includes(elementFilter);
      })
      .sort((left, right) => {
        if (sortBy === "requiredLevel") {
          return (
            left.requiredLevel - right.requiredLevel ||
            left.name.localeCompare(right.name)
          );
        }

        if (sortBy === "element") {
          return (
            (left.elements[0] ?? "").localeCompare(right.elements[0] ?? "") ||
            left.name.localeCompare(right.name)
          );
        }

        return (
          left.gearType.localeCompare(right.gearType) ||
          left.name.localeCompare(right.name)
        );
      })
      .slice(0, CLOSET_CAPACITY);
  }, [elementFilter, gearTypeFilter, items, sortBy]);

  const closetSlots = useMemo(() => {
    return Array.from(
      { length: CLOSET_CAPACITY },
      (_, index) => sortedItems[index] ?? null,
    );
  }, [sortedItems]);

  return (
    <DpPopupWindow
      open
      onClose={onClose}
      label="Armory Closet"
      size="large"
      className="dp-blue-grid-panel armoryClosetWindow"
    >
      <section className="armoryClosetModal">
        <h3 className="armoryClosetTitle">Armory Closet</h3>

        {items.length === 0 ? (
          <p className="armoryClosetEmpty">No stored gear.</p>
        ) : null}

        <div className="armoryClosetToolbar">
          <label htmlFor="armory-closet-type">Gear</label>
          <select
            id="armory-closet-type"
            value={gearTypeFilter}
            onChange={(event) =>
              setGearTypeFilter(event.target.value as GearTypeFilter)
            }
          >
            <option value="all">All Gear</option>
            <option value="weapon">Weapon</option>
            <option value="head">Head Gear</option>
            <option value="body">Body Gear</option>
            <option value="arms">Arm Gear</option>
            <option value="legs">Leg Gear</option>
            <option value="feet">Foot Gear</option>
            <option value="ring">Ring</option>
            <option value="charm">Charm</option>
          </select>

          <label htmlFor="armory-closet-element">Element</label>
          <select
            id="armory-closet-element"
            value={elementFilter}
            onChange={(event) =>
              setElementFilter(event.target.value as ElementFilter)
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

          <label htmlFor="armory-closet-sort">Sort</label>
          <select
            id="armory-closet-sort"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as ClosetSort)}
          >
            <option value="gearType">Gear Type</option>
            <option value="element">Element</option>
            <option value="requiredLevel">Required Level</option>
          </select>
        </div>

        <div className="armoryClosetGrid" aria-label="Stored gear">
          {closetSlots.map((item, index) => {
            if (item) {
              return (
                <article className="armoryClosetSlot" key={item.id}>
                  <div className="armoryClosetIcon">
                    {item.iconUrl ? <img src={item.iconUrl} alt="" /> : null}
                  </div>

                  <div className="armoryClosetSlotText">
                    <h4>{item.name}</h4>
                    <span>{GEAR_TYPE_LABELS[item.gearType]}</span>
                    <span>Level {item.requiredLevel}+</span>
                    <span>{item.elements.join(" / ") || "No element"}</span>
                  </div>

                  <p className="armoryClosetDescription">{item.description}</p>
                </article>
              );
            }

            return (
              <article
                className="armoryClosetSlot armoryClosetSlot--empty"
                key={`empty-armory-slot-${index + 1}`}
              >
                <div className="armoryClosetIcon" aria-hidden="true" />

                <div className="armoryClosetSlotText">
                  <h4>Gear Slot</h4>
                  <span>Empty</span>
                </div>

                <p className="armoryClosetDescription">No gear</p>
              </article>
            );
          })}
        </div>

        <div className="armoryClosetFooter">
          <button
            type="button"
            className="armoryClosetClose dp-btn--pearl"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </section>
    </DpPopupWindow>
  );
}

type ArmoryProps = {
  closetItems?: ArmoryClosetItem[];
};

export default function Armory({ closetItems = [] }: ArmoryProps) {
  const [showCloset, setShowCloset] = useState(false);

  return (
    <section className="petArmory" aria-labelledby="pet-armory-title">
      <header className="petArmoryHeader">
        <h2 id="pet-armory-title" className="petArmoryTitle">
          Armory:
        </h2>

        <button
          type="button"
          className="petArmoryClosetButton btn btn-gold"
          onClick={() => setShowCloset(true)}
        >
          Armory Closet
        </button>

        <div className="petArmoryHeaderAccent" aria-hidden="true">
          <span className="petArmoryHeaderDot" />
          <span className="petArmoryHeaderLine" />
          <span className="petArmoryHeaderDelta">△</span>
        </div>
      </header>

      <div className="petArmoryLoadout" aria-label="Equipment slots">
        <div className="petArmoryColumn" aria-label="Armor slots">
          {ARMOR_SLOTS.map((slot) => (
            <article
              key={slot.key}
              className={`petArmorySlot petArmorySlot--${slot.rarity}`}
            >
              <div className="petArmoryIcon" aria-hidden="true" />

              <div className="petArmorySlotText">
                <h3>{slot.slotName}</h3>
                <p>{slot.itemName}</p>
              </div>

              <div className="petArmoryStatBlock">
                <div className="petArmoryDivider" aria-hidden="true" />
                <div className="petArmoryStats">{slot.stats}</div>
              </div>
            </article>
          ))}
        </div>

        <div className="petArmoryColumn" aria-label="Item slots">
          {ARMORY_ITEM_SLOTS.map((slot) => (
            <article
              key={slot.key}
              className={`petArmorySlot petArmorySlot--${slot.rarity}`}
            >
              <div className="petArmoryIcon" aria-hidden="true" />

              <div className="petArmorySlotText">
                <h3>{slot.slotName}</h3>
                <p>{slot.itemName}</p>
              </div>

              <div className="petArmoryStatBlock">
                <div className="petArmoryDivider" aria-hidden="true" />
                <div className="petArmoryStats">{slot.stats}</div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {showCloset ? (
        <ArmoryCloset
          items={closetItems}
          onClose={() => setShowCloset(false)}
        />
      ) : null}
    </section>
  );
}
