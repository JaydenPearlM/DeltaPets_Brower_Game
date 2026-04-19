// frontend/web/src/components/inventory/inventory.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./inventory.css";

export type CareInventoryCategory = "food" | "soap" | "toy" | "bed";

type CareInventoryState = Record<CareInventoryCategory, number>;

const CARE_INVENTORY_STORAGE_KEY = "deltapets-care-inventory";
const CARE_INVENTORY_CHANGE_EVENT = "deltapets:inventory-changed";

const DEFAULT_CARE_INVENTORY: CareInventoryState = {
  food: 3,
  soap: 3,
  toy: 2,
  bed: 1,
};

function isBrowser() {
  return typeof window !== "undefined";
}

function clampCount(value: unknown) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function normalizeCareInventory(value: unknown): CareInventoryState {
  const raw = (value && typeof value === "object" ? value : {}) as Partial<
    Record<CareInventoryCategory, unknown>
  >;

  return {
    food: clampCount(raw.food),
    soap: clampCount(raw.soap),
    toy: clampCount(raw.toy),
    bed: clampCount(raw.bed),
  };
}

function readCareInventory(): CareInventoryState {
  if (!isBrowser()) return { ...DEFAULT_CARE_INVENTORY };

  try {
    const raw = window.localStorage.getItem(CARE_INVENTORY_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CARE_INVENTORY };
    return {
      ...DEFAULT_CARE_INVENTORY,
      ...normalizeCareInventory(JSON.parse(raw)),
    };
  } catch {
    return { ...DEFAULT_CARE_INVENTORY };
  }
}

function writeCareInventory(next: CareInventoryState) {
  if (!isBrowser()) return;
  window.localStorage.setItem(CARE_INVENTORY_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(CARE_INVENTORY_CHANGE_EVENT));
}

export function ensureStarterCareInventory() {
  if (!isBrowser()) return;

  const existing = window.localStorage.getItem(CARE_INVENTORY_STORAGE_KEY);
  if (!existing) {
    writeCareInventory({ ...DEFAULT_CARE_INVENTORY });
    return;
  }

  try {
    const parsed = normalizeCareInventory(JSON.parse(existing));
    writeCareInventory({ ...DEFAULT_CARE_INVENTORY, ...parsed });
  } catch {
    writeCareInventory({ ...DEFAULT_CARE_INVENTORY });
  }
}

export function getCareItemCount(category: CareInventoryCategory) {
  const inventory = readCareInventory();
  return inventory[category] ?? 0;
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

export function addCareItem(category: CareInventoryCategory, amount = 1) {
  const inventory = readCareInventory();
  const current = inventory[category] ?? 0;

  writeCareInventory({
    ...inventory,
    [category]: current + Math.max(0, Math.floor(amount)),
  });
}

export function getInventoryChangeEventName() {
  return CARE_INVENTORY_CHANGE_EVENT;
}

type InventoryTab = "all" | "equipment" | "battle" | "health" | "eggs";

type InventoryKind = "equipment" | "battle_potion" | "health_potion" | "egg";

type InventoryItem = {
  id: string;
  kind: InventoryKind;
  name: string;
  qty?: number;
  rarity?: "common" | "rare" | "epic" | "legendary";
  icon?: string;
};

type Caps = {
  equipment: number;
  battle: number;
  health: number;
  eggs: number;
};

type UsedSlots = {
  equipment: number;
  battle: number;
  health: number;
  eggs: number;
};

const START_CAPS: Caps = {
  equipment: 5,
  battle: 5,
  health: 5,
  eggs: 5,
};

const UPGRADE_COSTS = [50, 100, 200, 350, 550, 800, 1100, 1450, 1850];

function tabMatches(tab: InventoryTab, item: InventoryItem) {
  if (tab === "all") return true;
  if (tab === "equipment") return item.kind === "equipment";
  if (tab === "battle") return item.kind === "battle_potion";
  if (tab === "health") return item.kind === "health_potion";
  if (tab === "eggs") return item.kind === "egg";
  return true;
}

function kindToCapKey(kind: InventoryKind): keyof Caps {
  if (kind === "equipment") return "equipment";
  if (kind === "battle_potion") return "battle";
  if (kind === "health_potion") return "health";
  return "eggs";
}

function prettyTab(tab: InventoryTab) {
  if (tab === "all") return "All";
  if (tab === "equipment") return "Equipment";
  if (tab === "battle") return "Battle Potions";
  if (tab === "health") return "Health Potions";
  return "Eggs";
}

function safeParseInt(v: string | null, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function computeUsedSlots(items: InventoryItem[]): UsedSlots {
  const used: UsedSlots = { equipment: 0, battle: 0, health: 0, eggs: 0 };
  for (const it of items) {
    const k = kindToCapKey(it.kind);
    used[k] += 1;
  }
  return used;
}

function getUpgradeCountFromCap(cap: number) {
  const u = Math.max(0, Math.floor((cap - 5) / 5));
  return u;
}

function nextUpgradeCost(currentCap: number) {
  const u = getUpgradeCountFromCap(currentCap);
  return UPGRADE_COSTS[u] ?? null;
}

export default function InventoryPage() {
  return (
    <div className="invPage">
      <InventoryPanel mode="page" />
    </div>
  );
}

type InventoryPanelProps = {
  mode: "page" | "overlay";
  onRequestClose?: () => void;
};

export function InventoryPanel({ mode, onRequestClose }: InventoryPanelProps) {
  const nav = useNavigate();
  const location = useLocation();

  const qs = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const pick = qs.get("pick");
  const inBattle = qs.get("battle") === "1";

  const [dots, setDots] = useState<number>(420);
  const [caps, setCaps] = useState<Caps>(START_CAPS);
  const [items, setItems] = useState<InventoryItem[]>(() => [
    { id: "eq_001", kind: "equipment", name: "Twig Blade", rarity: "common" },
    { id: "eq_002", kind: "equipment", name: "Leaf Cloak", rarity: "rare" },
    {
      id: "bp_001",
      kind: "battle_potion",
      name: "ATK Spark",
      qty: 3,
      rarity: "common",
    },
    {
      id: "hp_001",
      kind: "health_potion",
      name: "Small Heal",
      qty: 7,
      rarity: "common",
    },
    { id: "egg_001", kind: "egg", name: "Warm Egg", rarity: "rare" },
    { id: "egg_002", kind: "egg", name: "Mystery Egg", rarity: "epic" },
  ]);
  const [tab, setTab] = useState<InventoryTab>("all");
  const [careInventory, setCareInventory] = useState<CareInventoryState>(() => {
    ensureStarterCareInventory();
    return {
      food: getCareItemCount("food"),
      soap: getCareItemCount("soap"),
      toy: getCareItemCount("toy"),
      bed: getCareItemCount("bed"),
    };
  });

  const filtered = useMemo(
    () => items.filter((it) => tabMatches(tab, it)),
    [items, tab],
  );
  const used = useMemo(() => computeUsedSlots(items), [items]);

  useEffect(() => {
    ensureStarterCareInventory();

    const syncCareInventory = () => {
      setCareInventory({
        food: getCareItemCount("food"),
        soap: getCareItemCount("soap"),
        toy: getCareItemCount("toy"),
        bed: getCareItemCount("bed"),
      });
    };

    syncCareInventory();
    const eventName = getInventoryChangeEventName();
    window.addEventListener(eventName, syncCareInventory);

    return () => {
      window.removeEventListener(eventName, syncCareInventory);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          (target as any).isContentEditable);

      if (isTyping) return;

      if (e.key === "Escape") {
        if (mode === "overlay") {
          onRequestClose?.();
          return;
        }
        nav(-1);
        return;
      }

      if (inBattle) return;
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, nav, inBattle, onRequestClose]);

  function upgradeCategory(cat: keyof Caps) {
    const cost = nextUpgradeCost(caps[cat]);
    if (cost == null) return;

    if (dots < cost) {
      alert(`Not enough Dots. Need ${cost}, you have ${dots}.`);
      return;
    }

    setDots((d) => d - cost);
    setCaps((c) => ({ ...c, [cat]: c[cat] + 5 }));
  }

  function canAddNewStack(kind: InventoryKind) {
    const capKey = kindToCapKey(kind);
    return used[capKey] < caps[capKey];
  }

  function debugAddItem(kind: InventoryKind) {
    if (!canAddNewStack(kind)) {
      alert("That category is full. Upgrade slots with Dots.");
      return;
    }

    const baseName =
      kind === "equipment"
        ? "New Gear"
        : kind === "battle_potion"
          ? "New Battle Potion"
          : kind === "health_potion"
            ? "New Health Potion"
            : "New Egg";

    const id = `${kind}_${Date.now()}`;
    const next: InventoryItem = {
      id,
      kind,
      name: `${baseName} #${safeParseInt(String(Math.random() * 999).slice(0, 3), 0)}`,
      qty: kind.includes("potion") ? 1 : undefined,
      rarity: "common",
    };

    setItems((arr) => [next, ...arr]);
  }

  function removeItem(id: string) {
    setItems((arr) => arr.filter((x) => x.id !== id));
  }

  function onSelectItem(_it: InventoryItem) {
    if (!pick) return;
    nav(-1);
  }

  function addStarterCareItem(category: CareInventoryCategory) {
    addCareItem(category, 1);
  }

  const capRows = [
    {
      key: "equipment" as const,
      label: "Equipment",
      used: used.equipment,
      cap: caps.equipment,
    },
    {
      key: "battle" as const,
      label: "Battle Potions",
      used: used.battle,
      cap: caps.battle,
    },
    {
      key: "health" as const,
      label: "Health Potions",
      used: used.health,
      cap: caps.health,
    },
    { key: "eggs" as const, label: "Eggs", used: used.eggs, cap: caps.eggs },
  ];

  const careRows: Array<{
    key: CareInventoryCategory;
    label: string;
    icon: string;
    blurb: string;
  }> = [
    { key: "food", label: "Food", icon: "🍎", blurb: "Used for Feed." },
    { key: "soap", label: "Soap", icon: "🫧", blurb: "Used for Clean." },
    { key: "toy", label: "Toy", icon: "🧸", blurb: "Used for Play." },
    {
      key: "bed",
      label: "Bed",
      icon: "🛏️",
      blurb: "Comfort helper for later.",
    },
  ];

  return (
    <div className={mode === "overlay" ? "invShell invOverlay" : "invShell"}>
      <div className="invTopBar">
        <div className="invTitleBlock">
          <div className="invTitle">Player’s Bag</div>
          <div className="invSub">
            Dots: <b>{dots}</b>
            {inBattle ? <span className="invLock">Locked: Battle</span> : null}
            {pick ? <span className="invPick">Picker: {pick}</span> : null}
          </div>
        </div>

        <div className="invTopActions">
          <button className="invBtn" onClick={() => debugAddItem("equipment")}>
            + Gear
          </button>
          <button
            className="invBtn"
            onClick={() => debugAddItem("battle_potion")}
          >
            + Battle
          </button>
          <button
            className="invBtn"
            onClick={() => debugAddItem("health_potion")}
          >
            + Health
          </button>
          <button className="invBtn" onClick={() => debugAddItem("egg")}>
            + Egg
          </button>
        </div>
      </div>

      <div className="invCaps">
        {capRows.map((r) => {
          const cost = nextUpgradeCost(r.cap);
          return (
            <div key={r.key} className="invCapCard">
              <div className="invCapTop">
                <div className="invCapLabel">{r.label}</div>
                <div className="invCapCount">
                  {r.used}/{r.cap}
                </div>
              </div>

              <button
                className="invUpgradeBtn"
                disabled={cost == null}
                onClick={() => upgradeCategory(r.key)}
                title={
                  cost == null
                    ? "Maxed (for now)"
                    : `Upgrade +5 slots for ${cost} Dots`
                }
              >
                {cost == null ? "Maxed" : `Upgrade +5 (${cost} dots)`}
              </button>
            </div>
          );
        })}
      </div>

      <div className="invTabs">
        {(
          ["all", "equipment", "battle", "health", "eggs"] as InventoryTab[]
        ).map((t) => (
          <button
            key={t}
            className={t === tab ? "invTab invTabActive" : "invTab"}
            onClick={() => setTab(t)}
          >
            {prettyTab(t)}
          </button>
        ))}
      </div>

      <div className="invGrid" style={{ marginBottom: 18 }}>
        {careRows.map((row) => (
          <div key={row.key} className="invItem">
            <div className="invItemIcon" aria-hidden="true">
              {row.icon}
            </div>
            <div className="invItemInfo">
              <div className="invItemName">{row.label}</div>
              <div className="invItemMeta">
                <span className="invPill">care item</span>
                <span className="invPill">x{careInventory[row.key]}</span>
                <span className="invPill">{row.blurb}</span>
              </div>
            </div>
            <button
              className="invDeleteBtn"
              onClick={() => addStarterCareItem(row.key)}
              type="button"
            >
              +1
            </button>
          </div>
        ))}
      </div>

      <div className="invGrid">
        {filtered.length === 0 ? (
          <div className="invEmpty">Nothing here… yet 👀</div>
        ) : (
          filtered.map((it) => (
            <div
              key={it.id}
              className={pick ? "invItem invItemPickable" : "invItem"}
              onClick={() => (pick ? onSelectItem(it) : undefined)}
              role={pick ? "button" : undefined}
              tabIndex={pick ? 0 : -1}
            >
              <div className="invItemIcon" aria-hidden="true">
                {it.kind === "equipment"
                  ? "🛡️"
                  : it.kind === "battle_potion"
                    ? "⚡"
                    : it.kind === "health_potion"
                      ? "🧪"
                      : "🥚"}
              </div>

              <div className="invItemInfo">
                <div className="invItemName">{it.name}</div>
                <div className="invItemMeta">
                  <span className="invPill">{it.kind.replace("_", " ")}</span>
                  {it.rarity ? (
                    <span className="invPill">{it.rarity}</span>
                  ) : null}
                  {typeof it.qty === "number" ? (
                    <span className="invPill">x{it.qty}</span>
                  ) : null}
                </div>
              </div>

              {!pick ? (
                <button
                  className="invDeleteBtn"
                  onClick={(e) => (e.stopPropagation(), removeItem(it.id))}
                >
                  Remove
                </button>
              ) : (
                <div className="invSelectHint">Select</div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="invFooter">
        <div className="invHint">
          Hotkeys: <b>Esc</b> to exit. (Ctrl+I opens overlay.)
        </div>

        {mode === "overlay" ? (
          <button className="invBtn" onClick={() => onRequestClose?.()}>
            Close
          </button>
        ) : !pick ? (
          <button className="invBtn" onClick={() => nav(-1)}>
            Back
          </button>
        ) : (
          <button className="invBtn" onClick={() => nav(-1)}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
