import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import careCatalog from "../../../../pet_items/tutorial/basic_pet_care.json";
import { kennithCatalog } from "@/lib/kithna/kennithCatalog";
import { useAuth } from "@/app/providers/useAuth";
import { ApiError, apiFetch } from "@/lib/api/baseClient";
import "./inventory.css";
import { isRegularInventoryItem } from "@/lib/inventoryDisplay";

// These owned items are displayed in Closet and Browse Relics, not the general bag.
const dedicatedViewSlugs = new Set(
  [...kennithCatalog.clothing, ...kennithCatalog.accessories, ...kennithCatalog.relics]
    .map(item => item.slug),
);

// Authoritative quantities for care, merchant trades and new rewards.
// Older browser-local items remain visible separately as legacy possessions.
export type BackendInventoryItem = {
  slug: string;
  name: string;
  type: string;
  description: string | null;
  rarity: number;
  stackLimit: number;
  effects: Record<string, unknown>;
  qty: number;
  availableQty?: number;
  equippedQty?: number;
  updatedAt: string;
};

export type CareInventoryCategory = "food" | "soap" | "toy" | "bed";
export type InventoryItemType =
  | "food"
  | "seed"
  | "care"
  | "armor"
  | "skill"
  | "misc";

export type InventoryItemDefinition = {
  slug: string;
  name: string;
  type: InventoryItemType;
  description: string;
  rarity?: string;
  stackLimit?: number;
  careCategory?: CareInventoryCategory;
};

type CareInventoryCounts = Record<CareInventoryCategory, number> & {
  tutorial?: number;
};

type InventoryItemRecord = InventoryItemDefinition & {
  qty: number;
};

type InventoryStorageState = {
  items: Record<string, InventoryItemRecord>;
};

// v2: bumped so testers whose local blob was drained to zero before the
// starter-seed fix get reseeded once. ensureStarterCareInventory() only
// seeds when this key is completely absent, so a stale v1 blob (even one
// sitting at all zeros) would otherwise block them forever. Old v1 data
// is simply orphaned in localStorage, harmless, nothing reads it anymore.
const INVENTORY_STORAGE_KEY = "deltapets:care-inventory:v3";
const INVENTORY_CHANGE_EVENT = "deltapets:care-inventory-change";

// Fixed bag size for now. Later this becomes level-gated and expandable by
// paying dots, but that leveling system doesn't exist yet, so for now this
// is just the hard cap and the grid always renders this many slots.
const MAX_INVENTORY_SLOTS = 15;

type InventoryFilter = "all" | "care" | "seed" | "armor" | "skill";

const INVENTORY_FILTERS: { value: InventoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "care", label: "Care" },
  { value: "seed", label: "Seeds" },
  { value: "armor", label: "Armor" },
  { value: "skill", label: "Skills" },
];

function matchesFilter(item: InventoryItemRecord, filter: InventoryFilter) {
  if (filter === "all") return true;
  if (filter === "care") return item.type === "care" || item.type === "food";
  return item.type === filter;
}

const EMPTY_CARE_INVENTORY: CareInventoryCounts = {
  food: 0,
  soap: 0,
  toy: 0,
  bed: 0,
};

function emptyInventoryState(): InventoryStorageState {
  return { items: {} };
}

function readInventoryState(): InventoryStorageState {
  // Retired unowned browser inventory must not appear under another account.
  return emptyInventoryState();
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

// Starter grant amount. Previously this function only created an *empty*
// inventory, which meant consumeCareItem() always failed and feed/clean/
// play were permanently unusable for every player, since nothing else in
// the app ever legitimately added a care item. This seeds a small starting
// stock instead of an empty shell.
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

function backendCareCategory(
  item: BackendInventoryItem,
): CareInventoryCategory | undefined {
  if (item.type !== "care") return undefined;
  const category = item.effects.careCategory;
  if (
    category === "food" ||
    category === "soap" ||
    category === "toy" ||
    category === "bed"
  ) {
    return category;
  }
  return undefined;
}

export async function getServerCareInventoryCounts(): Promise<CareInventoryCounts> {
  const result = await apiFetch<{ items: BackendInventoryItem[] }>(
    "/api/inventory",
  );
  return result.items.reduce<CareInventoryCounts>(
    (counts, item) => {
      const category = backendCareCategory(item);
      if (category) counts[category] += item.availableQty ?? item.qty;
      if (careCatalog.some((entry) => entry.slug === item.slug))
        counts.tutorial =
          (counts.tutorial ?? 0) + (item.availableQty ?? item.qty);
      return counts;
    },
    { ...EMPTY_CARE_INVENTORY },
  );
}

type DisplayInventoryItem = InventoryItemRecord & { legacy: boolean };

function serverDisplayItem(item: BackendInventoryItem): DisplayInventoryItem {
  const category = backendCareCategory(item);
  const type: InventoryItemType =
    category === "food"
      ? "food"
      : item.type === "care"
        ? "care"
        : item.type === "seed" || item.type === "armor" || item.type === "skill"
          ? item.type
          : "misc";
  return {
    slug: item.slug,
    name: item.name,
    type,
    description: item.description ?? "",
    stackLimit: item.stackLimit,
    careCategory: category,
    qty: item.availableQty ?? item.qty,
    legacy: false,
  };
}

export function addInventoryItem(item: InventoryItemDefinition, amount = 1) {
  const nextAmount = Math.max(0, Math.floor(Number(amount)));

  if (nextAmount <= 0) return;

  const nextInventory = readInventoryState();
  const existingItem = nextInventory.items[item.slug];

  // A new item type needs an open slot. Topping up a stack you already
  // hold doesn't, since it's not taking a new slot.
  if (!existingItem) {
    const usedSlots = Object.keys(nextInventory.items).length;
    if (usedSlots >= MAX_INVENTORY_SLOTS) return;
  }

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
  // Retired compatibility entry point: do not recreate legacy starter items.
  void category;
  void amount;
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

type InventoryProps = {
  onClose: () => void;
};

export default function Inventory({ onClose }: InventoryProps) {
  const { user } = useAuth();

  const [inventoryItems, setInventoryItems] = useState(() =>
    getInventoryItems(),
  );
  const [serverItems, setServerItems] = useState<BackendInventoryItem[]>([]);
  const [filter, setFilter] = useState<InventoryFilter>("all");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [backendLoading, setBackendLoading] = useState(true);
  const [backendError, setBackendError] = useState("");

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

  useEffect(() => {
    let cancelled = false;
    let latestRequest = 0;
    setServerItems([]);

    async function loadBackendInventory() {
      const request = ++latestRequest;
      setBackendLoading(true);
      setBackendError("");

      try {
        const json = await apiFetch<{
          items: BackendInventoryItem[];
        }>("/api/inventory");

        if (!cancelled && request === latestRequest) {
          const nextBackendItems = json.items ?? [];
          setServerItems(nextBackendItems);
        }
      } catch (err) {
        if (!cancelled && request === latestRequest) {
          const accessLost =
            (err instanceof ApiError &&
              (err.status === 401 || err.status === 403)) ||
            (err instanceof Error &&
              (err.message === "Session expired. Please log in again." ||
                err.message === "Missing access token. Are you logged in?"));
          if (accessLost) setServerItems([]);
          setBackendError(
            err instanceof Error ? err.message : "Failed to load inventory.",
          );
        }
      } finally {
        if (!cancelled && request === latestRequest) {
          setBackendLoading(false);
        }
      }
    }

    void loadBackendInventory();
    const refresh = () => {
      void loadBackendInventory();
    };
    window.addEventListener(INVENTORY_CHANGE_EVENT, refresh);

    return () => {
      cancelled = true;
      window.removeEventListener(INVENTORY_CHANGE_EVENT, refresh);
    };
  }, [user?.id]);

  const sortedInventoryItems = useMemo(
    () =>
      [
        ...serverItems.map(serverDisplayItem).filter((item) => item.qty > 0),
        ...inventoryItems.map((item) => ({ ...item, legacy: true })),
      ].sort((firstItem, secondItem) =>
        firstItem.name.localeCompare(secondItem.name),
      ),
    [inventoryItems, serverItems],
  );

  const visibleInventoryItems = useMemo(
    () =>
      sortedInventoryItems.filter(
        (item) => isRegularInventoryItem(item) && !dedicatedViewSlugs.has(item.slug) && matchesFilter(item, filter),
      ),
    [sortedInventoryItems, filter],
  );

  // Fixed 15-slot bag display, WoW-style: filled slots hold an item, the
  // rest render as empty placeholders up to MAX_INVENTORY_SLOTS. When the
  // level-based paid expansion exists later, this is where more slots get
  // added.
  const inventorySlots = useMemo(() => {
    const slots: (DisplayInventoryItem | null)[] = [...visibleInventoryItems];

    while (slots.length < MAX_INVENTORY_SLOTS) {
      slots.push(null);
    }

    return slots.slice(
      0,
      Math.max(MAX_INVENTORY_SLOTS, visibleInventoryItems.length),
    );
  }, [visibleInventoryItems]);

  return (
    <section className="inventoryPanel" aria-label="Inventory">
      <header className="inventoryHeader">
        <div className="inventoryHeaderRow">
          <h2>Inventory</h2>

          <div className="inventoryFilterWrap">
            <button
              type="button"
              className="inventoryFilterToggle"
              aria-haspopup="true"
              aria-expanded={filterMenuOpen}
              aria-label="Sort inventory"
              onClick={() => setFilterMenuOpen((open) => !open)}
            >
              ☰
            </button>

            {filterMenuOpen ? (
              <div className="inventoryFilterMenu" role="menu">
                {INVENTORY_FILTERS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={filter === option.value}
                    className={
                      filter === option.value
                        ? "inventoryFilterOption inventoryFilterOption--active"
                        : "inventoryFilterOption"
                    }
                    onClick={() => {
                      setFilter(option.value);
                      setFilterMenuOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="inventoryBody">
        {backendLoading ? <p role="status">Loading inventory...</p> : null}
        {backendError ? <p role="alert">{backendError}</p> : null}
        {inventoryItems.length > 0 ? (
          <p>
            Legacy local items are preserved below. They cannot be used for care
            or sold for Dots.
          </p>
        ) : null}
        <p className="inventorySectionLabel">
          {visibleInventoryItems.length > MAX_INVENTORY_SLOTS
            ? `Items (${visibleInventoryItems.length} displayed · ${MAX_INVENTORY_SLOTS} base slots)`
            : `Items (${visibleInventoryItems.length}/${MAX_INVENTORY_SLOTS})`}
        </p>

        <div
          className="inventoryGrid inventoryGrid--slots"
          aria-label="Inventory items"
        >
          {inventorySlots.map((item, slotIndex) =>
            item ? (
              <article
                className="inventoryItemCard"
                key={`${item.legacy ? "legacy" : "server"}:${item.slug}`}
              >
                <div className="inventoryItemCardHeader">
                  <div>
                    <p className="inventoryItemType">
                      {item.type}
                      {item.legacy ? " · Legacy" : ""}
                    </p>
                    <h3>{item.name}</h3>
                  </div>

                  <span className="inventoryItemQty">×{item.qty}</span>
                </div>

                <p className="inventoryItemDescription">{item.description}</p>
                {[
                  ...kennithCatalog.clothing,
                  ...kennithCatalog.accessories,
                ].some((entry) => entry.slug === item.slug) && (
                  <Link to="/profile" onClick={onClose}>
                    Avatar Customization
                  </Link>
                )}

                {item.careCategory ? (
                  <p className="inventoryItemMeta">
                    Care target: {item.careCategory}
                  </p>
                ) : null}
              </article>
            ) : (
              <div
                className="inventorySlotEmpty"
                key={`empty-${slotIndex}`}
                aria-hidden="true"
              />
            ),
          )}
        </div>

        <div className="inventoryFooter">
          <button
            type="button"
            className="dp-btn--close inventoryFooterClose"
            onClick={onClose}
            aria-label="Close inventory"
          >
            Close
          </button>
        </div>
      </div>
    </section>
  );
}
