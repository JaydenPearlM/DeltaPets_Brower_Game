import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/providers/useAuth";
import { apiFetch } from "@/lib/api/baseClient";
import haikuScrollIcon from "@/kith/assets/Scroll/Haiku_Scrolls.png";
import "./inventory.css";

// Backend-tracked items (GET /api/inventory). Separate from the local
// care-item system above on purpose, see inventoryRouter for why. These
// are real rows granted server-side, e.g. weekly reward items.
export type BackendInventoryItem = {
  slug: string;
  name: string;
  type: string;
  description: string | null;
  rarity: number;
  stackLimit: number;
  effects: Record<string, unknown>;
  qty: number;
  updatedAt: string;
};

type ClosedAlphaCarePackageItem = InventoryItemDefinition & {
  qty: number;
};

type ClosedAlphaCarePackageResponse = {
  opened: true;
  wallet: {
    dots: number;
  };
  careItems: ClosedAlphaCarePackageItem[];
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

type CareInventoryCounts = Record<CareInventoryCategory, number>;

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
const MAX_INVENTORY_SLOTS = 10;

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

const CARE_ITEM_DEFINITIONS: Record<
  CareInventoryCategory,
  InventoryItemDefinition
> = {
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

function getPlayerName(user: any) {
  const meta = user?.user_metadata ?? {};
  const fromMeta =
    meta.username || meta.display_name || meta.displayName || meta.name;

  if (typeof fromMeta === "string" && fromMeta.trim()) return fromMeta.trim();

  const email = user?.email;
  if (typeof email === "string" && email.includes("@")) {
    return email.split("@")[0];
  }

  return "Traveler";
}

type InventoryWallet = {
  dots: number;
  crystals: number;
};

type InventoryProps = {
  onClose: () => void;
};

export default function Inventory({ onClose }: InventoryProps) {
  const { user } = useAuth();
  const playerName = useMemo(() => getPlayerName(user), [user]);

  const [inventoryItems, setInventoryItems] = useState(() =>
    getInventoryItems(),
  );
  const [filter, setFilter] = useState<InventoryFilter>("all");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [backendItems, setBackendItems] = useState<BackendInventoryItem[]>([]);
  const [backendLoading, setBackendLoading] = useState(true);
  const [backendError, setBackendError] = useState("");
  const [, setWallet] = useState<InventoryWallet>({
    dots: 0,
    crystals: 0,
  });
  const [openingCarePackage, setOpeningCarePackage] = useState(false);
  const [showCarePackageNotice, setShowCarePackageNotice] = useState(false);
  const [carePackageMessage, setCarePackageMessage] = useState("");
  const [haikuCollectionOpen, setHaikuCollectionOpen] = useState(false);
  const [selectedHaikuScroll, setSelectedHaikuScroll] =
    useState<BackendInventoryItem | null>(null);

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

    async function loadBackendInventory() {
      setBackendLoading(true);
      setBackendError("");

      try {
        const json = await apiFetch<{
          items: BackendInventoryItem[];
          wallet: InventoryWallet;
        }>("/api/inventory");

        if (!cancelled) {
          const nextBackendItems = json.items ?? [];

          setBackendItems(nextBackendItems);
          setWallet(
            json.wallet ?? {
              dots: 0,
              crystals: 0,
            },
          );

          setShowCarePackageNotice(
            nextBackendItems.some(
              (item) => item.slug === "closed-alpha-care-package",
            ),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setBackendError(
            err instanceof Error ? err.message : "Failed to load rewards.",
          );
        }
      } finally {
        if (!cancelled) {
          setBackendLoading(false);
        }
      }
    }

    void loadBackendInventory();

    return () => {
      cancelled = true;
    };
  }, []);

  async function openClosedAlphaCarePackage() {
    if (openingCarePackage) return;

    setOpeningCarePackage(true);
    setCarePackageMessage("");

    try {
      const result = await apiFetch<ClosedAlphaCarePackageResponse>(
        "/api/inventory/open-closed-alpha-care-package",
        { method: "POST" },
      );

      result.careItems.forEach(({ qty, ...item }) => {
        addInventoryItem(item, qty);
      });

      setBackendItems((items) =>
        items.filter((item) => item.slug !== "closed-alpha-care-package"),
      );
      setShowCarePackageNotice(false);

      setCarePackageMessage(
        `Care Package opened! You received 50 Meat, 50 Vegetables, 50 Clean, 50 Mood, 50 Comfort, and 1,000 Dots. Balance: ${result.wallet.dots.toLocaleString()} Dots.`,
      );
    } catch (err) {
      setCarePackageMessage(
        err instanceof Error ? err.message : "Failed to open care package.",
      );
    } finally {
      setOpeningCarePackage(false);
    }
  }

  const sortedInventoryItems = useMemo(
    () =>
      [...inventoryItems].sort((firstItem, secondItem) =>
        firstItem.name.localeCompare(secondItem.name),
      ),
    [inventoryItems],
  );

  const visibleInventoryItems = useMemo(
    () => sortedInventoryItems.filter((item) => matchesFilter(item, filter)),
    [sortedInventoryItems, filter],
  );

  // Fixed 10-slot bag display, WoW-style: filled slots hold an item, the
  // rest render as empty placeholders up to MAX_INVENTORY_SLOTS. When the
  // level-based paid expansion exists later, this is where more slots get
  // added.
  const inventorySlots = useMemo(() => {
    const slots: (InventoryItemRecord | null)[] = [...visibleInventoryItems];

    while (slots.length < MAX_INVENTORY_SLOTS) {
      slots.push(null);
    }

    return slots.slice(
      0,
      Math.max(MAX_INVENTORY_SLOTS, visibleInventoryItems.length),
    );
  }, [visibleInventoryItems]);

  const sortedBackendItems = useMemo(
    () =>
      [...backendItems].sort((firstItem, secondItem) =>
        firstItem.name.localeCompare(secondItem.name),
      ),
    [backendItems],
  );

  const haikuScrolls = useMemo(
    () => backendItems.filter((item) => item.effects?.collection === "haiku"),
    [backendItems],
  );

  const nonHaikuBackendItems = useMemo(
    () =>
      sortedBackendItems.filter((item) => item.effects?.collection !== "haiku"),
    [sortedBackendItems],
  );

  return (
    <section className="inventoryPanel" aria-label="Inventory">
      {showCarePackageNotice ? (
        <div
          className="inventoryCarePackageNotice"
          role="alertdialog"
          aria-modal="true"
          aria-label="Closed Alpha Care Package"
        >
          <div className="inventoryCarePackageNoticeCard">
            <p className="inventoryCarePackageStillHere">
              This is for all of you who are actively testing.
            </p>

            <h2 className="inventoryCarePackageThankYou">
              Thank you for joining this journey with me, {playerName}!
            </h2>

            <p className="inventoryCarePackageJourney">
              Can not wait to see what lies ahead.
            </p>

            <button
              type="button"
              className="dp-btn--close"
              disabled={openingCarePackage}
              onClick={() => void openClosedAlphaCarePackage()}
            >
              {openingCarePackage ? "Opening..." : "Get Gift"}
            </button>
          </div>
        </div>
      ) : null}

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

        <p className="inventoryIntro">
          Care items, seeds, armor, and skills live here before they move into
          their specialty storage.
        </p>
      </header>

      <button
        type="button"
        className="inventoryHaikuButton"
        onClick={() => setHaikuCollectionOpen(true)}
      >
        <img
          className="inventoryHaikuIcon"
          src={haikuScrollIcon}
          alt=""
          aria-hidden="true"
        />
        <span>Haiku Scrolls</span>
      </button>

      <p className="inventorySectionLabel">
        Items ({visibleInventoryItems.length}/{MAX_INVENTORY_SLOTS})
      </p>

      <div
        className="inventoryGrid inventoryGrid--slots"
        aria-label="Inventory items"
      >
        {inventorySlots.map((item, slotIndex) =>
          item ? (
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
          ) : (
            <div
              className="inventorySlotEmpty"
              key={`empty-${slotIndex}`}
              aria-hidden="true"
            />
          ),
        )}
      </div>

      {(() => {
        const nonPackageItems = nonHaikuBackendItems.filter(
          (item) => item.slug !== "closed-alpha-care-package",
        );

        if (backendLoading) {
          return (
            <>
              <p className="inventorySectionLabel">Rewards</p>
              <div className="inventoryEmpty" role="status">
                <p>Loading rewards...</p>
              </div>
            </>
          );
        }

        if (backendError) {
          return (
            <>
              <p className="inventorySectionLabel">Rewards</p>
              <div className="inventoryEmpty" role="status">
                <p className="inventoryEmptyTitle">Couldn't load rewards.</p>
                <p>{backendError}</p>
              </div>
            </>
          );
        }

        if (nonPackageItems.length === 0) return null;

        return (
          <>
            <p className="inventorySectionLabel">Rewards</p>
            <div
              className="inventoryGrid inventoryGrid--rewards"
              aria-label="Reward items"
            >
              {nonPackageItems.map((item) => (
                <article className="inventoryItemCard" key={item.slug}>
                  <div className="inventoryItemCardHeader">
                    <div>
                      <p className="inventoryItemType">{item.type}</p>
                      <h3>{item.name}</h3>
                    </div>

                    <span className="inventoryItemQty">×{item.qty}</span>
                  </div>

                  {item.description ? (
                    <p className="inventoryItemDescription">
                      {item.description}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </>
        );
      })()}

      {haikuCollectionOpen ? (
        <div
          className="inventoryHaikuBackdrop"
          role="presentation"
          onMouseDown={() => {
            setHaikuCollectionOpen(false);
            setSelectedHaikuScroll(null);
          }}
        >
          <section
            className="inventoryHaikuPopup dp-blue-grid-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Haiku Scrolls"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {selectedHaikuScroll ? (
              <>
                <img
                  className="inventoryHaikuIcon"
                  src={haikuScrollIcon}
                  alt=""
                  aria-hidden="true"
                />

                <h2>{selectedHaikuScroll.name}</h2>

                <p className="inventoryHaikuDescription">
                  A tiny ribbon-bound scroll containing a piece of Aliune Lore.
                </p>

                <div className="inventoryHaikuText">
                  {Array.isArray(selectedHaikuScroll.effects?.haiku)
                    ? selectedHaikuScroll.effects.haiku.map((line) => (
                        <p key={String(line)}>{String(line)}</p>
                      ))
                    : null}
                </div>

                <button
                  type="button"
                  className="dp-btn--close"
                  onClick={() => setSelectedHaikuScroll(null)}
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <h2>Haiku Scrolls</h2>

                <p className="inventoryHaikuDescription">
                  A tiny ribbon-bound scroll containing a piece of Aliune Lore.
                </p>

                <div className="inventoryHaikuGrid">
                  {Array.from({ length: 50 }, (_, index) => {
                    const scrollNumber = index + 1;
                    const collectedScroll = haikuScrolls.find(
                      (item) =>
                        Number(item.effects?.scrollNumber) === scrollNumber,
                    );

                    return (
                      <button
                        key={scrollNumber}
                        type="button"
                        className={
                          collectedScroll
                            ? "inventoryHaikuSlot inventoryHaikuSlot--collected"
                            : "inventoryHaikuSlot"
                        }
                        disabled={!collectedScroll}
                        onClick={() => {
                          if (collectedScroll) {
                            setSelectedHaikuScroll(collectedScroll);
                          }
                        }}
                      >
                        <img
                          className="inventoryHaikuSlotIcon"
                          src={haikuScrollIcon}
                          alt=""
                          aria-hidden="true"
                        />

                        <span>Haiku Scroll #{scrollNumber}</span>

                        <span className="inventoryHaikuSlotState">
                          {collectedScroll ? "Collected" : "Locked"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="dp-btn--close"
                  onClick={() => setHaikuCollectionOpen(false)}
                >
                  Close
                </button>
              </>
            )}
          </section>
        </div>
      ) : null}

      {carePackageMessage ? (
        <p className="inventoryCarePackageMessage" role="status">
          {carePackageMessage}
        </p>
      ) : null}

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
    </section>
  );
}
