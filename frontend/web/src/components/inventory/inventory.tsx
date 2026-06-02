export type CareInventoryCategory = "food" | "soap" | "toy" | "bed";

const INVENTORY_STORAGE_KEY = "deltapets:care-inventory";
const INVENTORY_CHANGE_EVENT = "deltapets:care-inventory-change";

type CareInventoryCounts = Record<CareInventoryCategory, number>;

const STARTER_INVENTORY: CareInventoryCounts = {
  food: 5,
  soap: 5,
  toy: 5,
  bed: 1,
};

function readCareInventory(): CareInventoryCounts {
  try {
    const raw = window.localStorage.getItem(INVENTORY_STORAGE_KEY);

    if (!raw) {
      return { ...STARTER_INVENTORY };
    }

    const parsed = JSON.parse(raw) as Partial<CareInventoryCounts>;

    return {
      food: Number(parsed.food ?? 0),
      soap: Number(parsed.soap ?? 0),
      toy: Number(parsed.toy ?? 0),
      bed: Number(parsed.bed ?? 0),
    };
  } catch {
    return { ...STARTER_INVENTORY };
  }
}

function writeCareInventory(nextInventory: CareInventoryCounts) {
  window.localStorage.setItem(
    INVENTORY_STORAGE_KEY,
    JSON.stringify(nextInventory),
  );

  window.dispatchEvent(new Event(INVENTORY_CHANGE_EVENT));
}

export function getInventoryChangeEventName() {
  return INVENTORY_CHANGE_EVENT;
}

export function ensureStarterCareInventory() {
  const existing = window.localStorage.getItem(INVENTORY_STORAGE_KEY);

  if (existing) return;

  writeCareInventory({ ...STARTER_INVENTORY });
}

export function getCareItemCount(category: CareInventoryCategory) {
  const inventory = readCareInventory();
  return inventory[category] ?? 0;
}

export function addCareItem(category: CareInventoryCategory, amount = 1) {
  const inventory = readCareInventory();

  writeCareInventory({
    ...inventory,
    [category]: Math.max(0, (inventory[category] ?? 0) + amount),
  });
}

export function consumeCareItem(category: CareInventoryCategory, amount = 1) {
  const inventory = readCareInventory();
  const current = inventory[category] ?? 0;

  if (current < amount) {
    return false;
  }

  writeCareInventory({
    ...inventory,
    [category]: current - amount,
  });

  return true;
}

export default function Inventory() {
  const inventory = readCareInventory();

  return (
    <section>
      <h2>Inventory</h2>
      <p>Food: {inventory.food}</p>
      <p>Soap: {inventory.soap}</p>
      <p>Toy: {inventory.toy}</p>
      <p>Bed: {inventory.bed}</p>
    </section>
  );
}
