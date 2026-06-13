import "./Armory.css";

type ArmorySlot = {
  key: string;
  slotName: string;
  itemName: string;
  rarity: "empty" | "common" | "uncommon" | "rare" | "legendary";
  stats: string;
};

const ARMOR_SLOTS: ArmorySlot[] = [
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

export default function Armory() {
  return (
    <section className="petArmory" aria-labelledby="pet-armory-title">
      <header className="petArmoryHeader">
        <h2 id="pet-armory-title" className="petArmoryTitle">
          Armory:
        </h2>

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
    </section>
  );
}
