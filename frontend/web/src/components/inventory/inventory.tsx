// frontend/web/src/pages/inventory.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./inventory.css";

type InventoryTab = "all" | "equipment" | "battle" | "health" | "eggs";

type InventoryKind = "equipment" | "battle_potion" | "health_potion" | "egg";

type InventoryItem = {
  id: string;
  kind: InventoryKind;
  name: string;
  qty?: number; // stackables
  rarity?: "common" | "rare" | "epic" | "legendary";
  icon?: string; // optional URL later
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

// --- Alpha starter config ---
const START_CAPS: Caps = {
  equipment: 5,
  battle: 5,
  health: 5,
  eggs: 5,
};

// +5 slots per upgrade. Costs are per-category.
const UPGRADE_COSTS = [50, 100, 200, 350, 550, 800, 1100, 1450, 1850];

// Map tab -> item kind(s)
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
  // Slots = number of stacks (each unique item row = 1 slot)
  // Stackables just have qty but still count as 1 slot.
  const used: UsedSlots = { equipment: 0, battle: 0, health: 0, eggs: 0 };
  for (const it of items) {
    const k = kindToCapKey(it.kind);
    used[k] += 1;
  }
  return used;
}

function getUpgradeCountFromCap(cap: number) {
  // start is 5. each upgrade adds +5. so:
  // cap = 5 + 5*u -> u = (cap-5)/5
  const u = Math.max(0, Math.floor((cap - 5) / 5));
  return u;
}

function nextUpgradeCost(currentCap: number) {
  const u = getUpgradeCountFromCap(currentCap);
  return UPGRADE_COSTS[u] ?? null; // null means maxed for now
}

// ------------------------------------------------------------
// Inventory UI can be used as:
// - Full page (/inventory)
// - Popup overlay (render <InventoryPanel mode="overlay" ... />)
// ------------------------------------------------------------

export default function InventoryPage() {
  // Page version
  return (
    <div className="invPage">
      <InventoryPanel mode="page" />
    </div>
  );
}

type InventoryPanelProps = {
  mode: "page" | "overlay";
  onRequestClose?: () => void; //  allow overlay to close
  // later: you can pass context like { pick: "egg", from: "hatchery" }
};

export function InventoryPanel({ mode, onRequestClose }: InventoryPanelProps) {
  const nav = useNavigate();
  const location = useLocation();

  // Query params for “picker mode” (future wiring)
  const qs = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const pick = qs.get("pick"); // "equipment" | "egg" etc (optional)
  const inBattle = qs.get("battle") === "1"; // temporary lock demo

  // Dots for upgrades (Alpha stub; later comes from user profile)
  const [dots, setDots] = useState<number>(420);

  // Capacity per category (Alpha: local state; later from DB)
  const [caps, setCaps] = useState<Caps>(START_CAPS);

  // Inventory items (Alpha: mock data; later from Supabase)
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

  const filtered = useMemo(
    () => items.filter((it) => tabMatches(tab, it)),
    [items, tab],
  );
  const used = useMemo(() => computeUsedSlots(items), [items]);

  // ------------------------------------------------------------
  // Hotkeys
  // - Esc: ALWAYS works
  //   - overlay -> close overlay
  //   - page -> navigate back
  // - We do NOT handle Ctrl+I here (global UIProvider handles that)
  // ------------------------------------------------------------
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          (target as any).isContentEditable);

      if (isTyping) return;

      //  ESC should always work (even if inBattle)
      if (e.key === "Escape") {
        if (mode === "overlay") {
          onRequestClose?.();
          return;
        }
        nav(-1);
        return;
      }

      // If you add other keys later, you can block them in battle here.
      if (inBattle) return;
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, nav, inBattle, onRequestClose]);

  // ------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------
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
    // Adds a new stack, so capacity rules apply
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

  function onSelectItem(it: InventoryItem) {
    // Picker mode (later): choose equipment for pet or egg for hatchery
    if (!pick) return;

    // Example behavior: go back and pass selection in router state
    nav(-1, { state: { pickedItemId: it.id, pickedKind: it.kind } });
  }

  // Header capacity display per category
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
          {/* Debug buttons: remove later */}
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
