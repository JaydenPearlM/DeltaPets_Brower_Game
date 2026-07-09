import { useEffect, useMemo, useState } from "react";
import "./inventory.css";

export type CareInventoryCategory = "food" | "soap" | "toy" | "bed";
export type InventoryItemType = "food" | "seed" | "care" | "armor" | "skill" | "misc";

export type InventoryItemDefinition = {
  slug: string;
  name: string;
  type: InventoryItemType;
  description: string;
  rarity?: string;
  stackLimit?: number;
  careCategory?: CareInventoryCategory;
};

type CareInventoryCounts = Record<CareInventoryCategory, number>;

type InventoryItemRecord = InventoryItemDefinition & {
  qty: number;
};

type InventoryStorageState = {
  items: Record<string, InventoryItemRecord>;
};

const INVENTORY_STORAGE_KEY = "deltapets:care-inventory";
const INVENTORY_CHANGE_EVENT = "deltapets:care-inventory-change";

const EMPTY_CARE_INVENTORY: CareInventoryCounts = {
  food: 0,
  soap: 0,
  toy: 0,
  bed: 0,
};

const CARE_ITEM_DEFINITIONS: Record<CareInventoryCategory, InventoryItemDefinition> = {
  food: {
    slug: "kithna-food-pack",
    name: "Kithna Food Pack",
    type: "food",
    description: "A simple meal for restoring hunger.",
    rarity: "common",
    stackLimit: 99,
    careCategory: "food",
  },
  soap: {
    slug: "soft-cleaning-brush",
    name: "Soft Cleaning Brush",
    type: "care",
    description: "A gentle brush for restoring clean.",
    rarity: "common",
    stackLimit: 99,
    careCategory: "soap",
  },
  toy: {
    slug: "spark-jingle-toy",
    name: "Spark Jingle Toy",
    type: "care",
    description: "A tiny toy for restoring mood.",
    rarity: "common",
    stackLimit: 99,
    careCategory: "toy",
  },
  bed: {
    slug: "moon-nap-pillow",
    name: "Moon Nap Pillow",
    type: "care",
    description: "A soft pillow for restoring comfort.",
    rarity: "common",
    stackLimit: 99,
    careCategory: "bed",
  },
};

function emptyInventoryState(): InventoryStorageState {
  return { items: {} };
}

function normalizeInventoryItem(
  item: Partial<InventoryItemRecord>,
): InventoryItemRecord | null {
  const slug = typeof item.slug === "string" ? item.slug.trim() : "";
  const name = typeof item.name === "string" ? item.name.trim() : "";
  const description =
    typeof item.description === "string" ? item.description.trim() : "";
  const qty = Math.max(0, Math.floor(Number(item.qty ?? 0)));

  if (!slug || !name || qty <= 0) return null;

  return {
    slug,
    name,
    type: item.type ?? "misc",
    description,
    rarity: item.rarity ?? "common",
    stackLimit: Math.max(1, Math.floor(Number(item.stackLimit ?? 99))),
    careCategory: item.careCategory,
    qty,
  };
}

function readInventoryState(): InventoryStorageState {
  try {
    const raw = window.localStorage.getItem(INVENTORY_STORAGE_KEY);

    if (!raw) {
      return emptyInventoryState();
    }

    const parsed = JSON.parse(raw) as Partial<InventoryStorageState>;

    if (parsed.items && typeof parsed.items === "object") {
      const nextState = emptyInventoryState();

      Object.values(parsed.items).forEach((item) => {
        const normalizedItem = normalizeInventoryItem(item);

        if (!normalizedItem) return;

        nextState.items[normalizedItem.slug] = normalizedItem;
      });

      return nextState;
    }

    return emptyInventoryState();
  } catch {
    return emptyInventoryState();
  }
}

function writeInventoryState(nextInventory: InventoryStorageState) {
  window.localStorage.setItem(
    INVENTORY_STORAGE_KEY,
    JSON.stringify(nextInventory),
  );

  window.dispatchEvent(new Event(INVENTORY_CHANGE_EVENT));
}

function dispatchInventoryChange() {
  window.dispatchEvent(new Event(INVENTORY_CHANGE_EVENT));
}

export function getInventoryChangeEventName() {
  return INVENTORY_CHANGE_EVENT;
}

export function ensureStarterCareInventory() {
  if (window.localStorage.getItem(INVENTORY_STORAGE_KEY)) return;

  writeInventoryState(emptyInventoryState());
}

export function getInventoryItems() {
  return Object.values(readInventoryState().items);
}

export function getCareInventoryCounts() {
  return getInventoryItems().reduce<CareInventoryCounts>(
    (counts, item) => {
      if (item.careCategory) {
        counts[item.careCategory] += item.qty;
      }

      return counts;
    },
    { ...EMPTY_CARE_INVENTORY },
  );
}

export function getCareItemCount(category: CareInventoryCategory) {
  return getCareInventoryCounts()[category] ?? 0;
}

export function addInventoryItem(item: InventoryItemDefinition, amount = 1) {
  const nextAmount = Math.max(0, Math.floor(Number(amount)));

  if (nextAmount <= 0) return;

  const nextInventory = readInventoryState();
  const existingItem = nextInventory.items[item.slug];
  const stackLimit = Math.max(1, Math.floor(Number(item.stackLimit ?? 99)));
  const nextQty = Math.min(stackLimit, (existingItem?.qty ?? 0) + nextAmount);

  nextInventory.items[item.slug] = {
    ...existingItem,
    ...item,
    stackLimit,
    qty: nextQty,
  };

  writeInventoryState(nextInventory);
}

export function addCareItem(category: CareInventoryCategory, amount = 1) {
  addInventoryItem(CARE_ITEM_DEFINITIONS[category], amount);
}

export function consumeInventoryItem(slug: string, amount = 1) {
  const nextAmount = Math.max(0, Math.floor(Number(amount)));

  if (nextAmount <= 0) return true;

  const nextInventory = readInventoryState();
  const existingItem = nextInventory.items[slug];

  if (!existingItem || existingItem.qty < nextAmount) {
    return false;
  }

  const nextQty = existingItem.qty - nextAmount;

  if (nextQty <= 0) {
    delete nextInventory.items[slug];
  } else {
    nextInventory.items[slug] = {
      ...existingItem,
      qty: nextQty,
    };
  }

  writeInventoryState(nextInventory);

  return true;
}

export function consumeCareItem(category: CareInventoryCategory, amount = 1) {
  const item = getInventoryItems().find(
    (inventoryItem) => inventoryItem.careCategory === category,
  );

  if (!item) return false;

  return consumeInventoryItem(item.slug, amount);
}

export default function Inventory() {
  const [inventoryItems, setInventoryItems] = useState(() => getInventoryItems());

  useEffect(() => {
    const handleInventoryChange = () => {
      setInventoryItems(getInventoryItems());
    };

    window.addEventListener(INVENTORY_CHANGE_EVENT, handleInventoryChange);
    window.addEventListener("storage", handleInventoryChange);

    dispatchInventoryChange();

    return () => {
      window.removeEventListener(INVENTORY_CHANGE_EVENT, handleInventoryChange);
      window.removeEventListener("storage", handleInventoryChange);
    };
  }, []);

  const sortedInventoryItems = useMemo(
    () =>
      [...inventoryItems].sort((firstItem, secondItem) =>
        firstItem.name.localeCompare(secondItem.name),
      ),
    [inventoryItems],
  );

  return (
    <section className="inventoryPanel" aria-label="Inventory">
      <header className="inventoryHeader">
        <p className="inventoryEyebrow">DeltaPets Pack</p>
        <h2>Inventory</h2>
        <p className="inventoryIntro">
          Care items, food, seeds, armor, and skills live here before they move
          into their specialty storage.
        </p>
      </header>

      {sortedInventoryItems.length > 0 ? (
        <div className="inventoryGrid" aria-label="Inventory items">
          {sortedInventoryItems.map((item) => (
            <article className="inventoryItemCard" key={item.slug}>
              <div className="inventoryItemCardHeader">
                <div>
                  <p className="inventoryItemType">{item.type}</p>
                  <h3>{item.name}</h3>
                </div>
                <span className="inventoryItemQty">×{item.qty}</span>
              </div>

              <p className="inventoryItemDescription">{item.description}</p>

              {item.careCategory ? (
                <p className="inventoryItemMeta">
                  Care target: {item.careCategory}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="inventoryEmpty" role="status">
          <p className="inventoryEmptyTitle">No items yet.</p>
          <p>
            Merchant purchases will show here once Kithna shops are connected.
          </p>
        </div>
      )}
    </section>
  );
}
