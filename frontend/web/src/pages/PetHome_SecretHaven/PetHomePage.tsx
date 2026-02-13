import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase/client";
import { useAuth } from "../../app/providers/useAuth";
import "./PetHomePage.css";

// =============================================================================
// Pet Home (Top-down room editor)
// - Two rooms (Care + Bond)
// - Edit mode hides pet, shows grid
// - Click to place, right-click to remove
// - Local persistence (localStorage) keyed per-user
// =============================================================================

type CooldownState = {
  ends_at: string | null;
  remaining_ms: number;
  ready: boolean;
};
type Cooldowns = {
  feed: CooldownState;
  clean: CooldownState;
  play: CooldownState;
  bond: CooldownState;
};

type ActivePetResponse = {
  server_now: string;
  pet: any | null;
  cooldowns?: Cooldowns | null;
};

type RoomKey = "care" | "bond";

type FurnitureKind =
  | "trough"
  | "wash"
  | "bed"
  | "couch"
  | "table"
  | "chair"
  | "rug";

type FurnitureDef = {
  kind: FurnitureKind;
  label: string;
  w: number; // tiles
  h: number; // tiles
  tilesCost: number; // placement budget
  description: string;
  buffs: Record<string, number>; // future use
};

type PlacedFurniture = {
  id: string;
  kind: FurnitureKind;
  x: number; // tile coords
  y: number;
  rot: 0 | 90;
};

type RoomLayout = {
  roomKey: RoomKey;
  width: number;
  height: number;
  maxTilesBudget: number;
  items: PlacedFurniture[];
};

const TILE = 48;

const FURNITURE: Record<FurnitureKind, FurnitureDef> = {
  trough: {
    kind: "trough",
    label: "Trough",
    w: 2,
    h: 1,
    tilesCost: 2,
    description: "Feeds your pet. Later: increases hunger buffer.",
    buffs: { hunger_decay_modifier: -0.1 },
  },
  wash: {
    kind: "wash",
    label: "Wash Station",
    w: 2,
    h: 1,
    tilesCost: 2,
    description: "Cleans your pet. Later: faster cleanliness recovery.",
    buffs: { cleanliness_gain: 1 },
  },
  bed: {
    kind: "bed",
    label: "Pet Bed",
    w: 2,
    h: 2,
    tilesCost: 4,
    description: "Rest spot. Later: passive energy regen.",
    buffs: { energy_regen: 1 },
  },
  couch: {
    kind: "couch",
    label: "Couch",
    w: 2,
    h: 1,
    tilesCost: 2,
    description: "Bonding furniture. Later: bond gain bonus.",
    buffs: { bond_gain: 0.1 },
  },
  table: {
    kind: "table",
    label: "Table",
    w: 2,
    h: 2,
    tilesCost: 4,
    description: "Decor / crafting surface. Later: boosts daily quest rewards.",
    buffs: { daily_bonus: 0.05 },
  },
  chair: {
    kind: "chair",
    label: "Chair",
    w: 1,
    h: 1,
    tilesCost: 1,
    description: "A tiny throne. Later: small bond bonus.",
    buffs: { bond_gain: 0.03 },
  },
  rug: {
    kind: "rug",
    label: "Rug",
    w: 3,
    h: 2,
    tilesCost: 6,
    description: "Cozy vibes. Later: happiness gain.",
    buffs: { happiness_gain: 0.1 },
  },
};

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r}s`;
  return `${m}m ${r}s`;
}

function storageKey(userId: string, roomKey: RoomKey) {
  return `deltapets.home.${userId}.${roomKey}`;
}

function safeParseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );
}

function getItemSizeTiles(item: PlacedFurniture) {
  const def = FURNITURE[item.kind];
  if (item.rot === 90) return { w: def.h, h: def.w };
  return { w: def.w, h: def.h };
}

function tilesUsed(items: PlacedFurniture[]) {
  return items.reduce(
    (sum, it) => sum + (FURNITURE[it.kind]?.tilesCost ?? 0),
    0,
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function roomDefaults(roomKey: RoomKey): RoomLayout {
  // Slightly different vibes per room
  if (roomKey === "care") {
    return {
      roomKey,
      width: 12,
      height: 9,
      maxTilesBudget: 28,
      items: [
        { id: crypto.randomUUID(), kind: "trough", x: 1, y: 6, rot: 0 },
        { id: crypto.randomUUID(), kind: "wash", x: 9, y: 1, rot: 0 },
        { id: crypto.randomUUID(), kind: "bed", x: 2, y: 1, rot: 0 },
      ],
    };
  }
  return {
    roomKey,
    width: 12,
    height: 9,
    maxTilesBudget: 28,
    items: [
      { id: crypto.randomUUID(), kind: "couch", x: 2, y: 6, rot: 0 },
      { id: crypto.randomUUID(), kind: "table", x: 6, y: 5, rot: 0 },
      { id: crypto.randomUUID(), kind: "chair", x: 5, y: 7, rot: 0 },
      { id: crypto.randomUUID(), kind: "chair", x: 9, y: 7, rot: 0 },
      { id: crypto.randomUUID(), kind: "rug", x: 4, y: 2, rot: 0 },
    ],
  };
}

export default function PetHomePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<ActivePetResponse | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [busy, setBusy] = useState<null | string>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [roomKey, setRoomKey] = useState<RoomKey>("care");
  const [editMode, setEditMode] = useState(false);

  // per-room layouts
  const [careLayout, setCareLayout] = useState<RoomLayout>(() =>
    roomDefaults("care"),
  );
  const [bondLayout, setBondLayout] = useState<RoomLayout>(() =>
    roomDefaults("bond"),
  );

  // editor palette state
  const [selectedKind, setSelectedKind] = useState<FurnitureKind>("trough");
  const [rot, setRot] = useState<0 | 90>(0);
  const [hoverTile, setHoverTile] = useState<{ x: number; y: number } | null>(
    null,
  );

  const roomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [authLoading, user, navigate]);

  // tick local clock (for countdown UI)
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  async function loadActivePet() {
    const apiBase = import.meta.env.VITE_API_URL;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;

    const res = await fetch(`${apiBase}/api/pets/active`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Failed to load pet");
    setData(json as ActivePetResponse);
  }

  // load & periodically refresh active pet
  useEffect(() => {
    if (authLoading || !user) return;
    let alive = true;

    (async () => {
      try {
        await loadActivePet();
      } catch (e: any) {
        if (!alive) return;
        setMsg(e?.message ?? "Failed to load");
      }
    })();

    const id = window.setInterval(
      () => loadActivePet().catch(() => {}),
      15_000,
    );
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [authLoading, user]);

  // load room layouts from localStorage
  useEffect(() => {
    if (!user?.id) return;
    const care = safeParseJSON<RoomLayout>(
      localStorage.getItem(storageKey(user.id, "care")),
    );
    const bond = safeParseJSON<RoomLayout>(
      localStorage.getItem(storageKey(user.id, "bond")),
    );
    if (care?.roomKey === "care")
      setCareLayout({ ...roomDefaults("care"), ...care });
    if (bond?.roomKey === "bond")
      setBondLayout({ ...roomDefaults("bond"), ...bond });
  }, [user?.id]);

  // persist on changes
  useEffect(() => {
    if (!user?.id) return;
    localStorage.setItem(
      storageKey(user.id, "care"),
      JSON.stringify(careLayout),
    );
  }, [careLayout, user?.id]);
  useEffect(() => {
    if (!user?.id) return;
    localStorage.setItem(
      storageKey(user.id, "bond"),
      JSON.stringify(bondLayout),
    );
  }, [bondLayout, user?.id]);

  // editor hotkeys
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!editMode) return;
      if (e.key === "Escape") {
        setHoverTile(null);
        setMsg(null);
        setEditMode(false);
      }
      if (e.key.toLowerCase() === "r") {
        setRot((p) => (p === 0 ? 90 : 0));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editMode]);

  const pet = data?.pet ?? null;
  const cooldowns = (data?.cooldowns ?? null) as Cooldowns | null;

  const cd = useMemo(() => {
    const calc = (endsAtIso: string | null) => {
      if (!endsAtIso) return 0;
      const t = Date.parse(endsAtIso);
      if (!Number.isFinite(t)) return 0;
      return Math.max(0, t - nowMs);
    };
    return {
      feed: calc(cooldowns?.feed?.ends_at ?? null),
      clean: calc(cooldowns?.clean?.ends_at ?? null),
      bond: calc(cooldowns?.bond?.ends_at ?? null),
      play: calc(cooldowns?.play?.ends_at ?? null),
    };
  }, [cooldowns, nowMs]);

  async function doAction(action: "feed" | "clean" | "bond") {
    setMsg(null);
    setBusy(action);
    try {
      const apiBase = import.meta.env.VITE_API_URL;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not logged in");

      const res = await fetch(`${apiBase}/api/pets/actions/do`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Action failed");
      await loadActivePet();
    } catch (e: any) {
      setMsg(e?.message ?? "Action failed");
    } finally {
      setBusy(null);
    }
  }

  const layout = roomKey === "care" ? careLayout : bondLayout;
  const setLayout = roomKey === "care" ? setCareLayout : setBondLayout;

  const budgetUsed = useMemo(() => tilesUsed(layout.items), [layout.items]);
  const budgetLeft = layout.maxTilesBudget - budgetUsed;

  const selectedDef = FURNITURE[selectedKind];
  const selectedSize = useMemo(() => {
    if (rot === 90) return { w: selectedDef.h, h: selectedDef.w };
    return { w: selectedDef.w, h: selectedDef.h };
  }, [selectedDef, rot]);

  function getTileFromMouse(e: React.MouseEvent) {
    const el = roomRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const x = Math.floor(px / TILE);
    const y = Math.floor(py / TILE);
    if (x < 0 || y < 0 || x >= layout.width || y >= layout.height) return null;
    return { x, y };
  }

  function canPlaceAt(
    x: number,
    y: number,
    kind: FurnitureKind,
    rotVal: 0 | 90,
  ) {
    const def = FURNITURE[kind];
    const size =
      rotVal === 90 ? { w: def.h, h: def.w } : { w: def.w, h: def.h };

    // bounds
    if (x + size.w > layout.width || y + size.h > layout.height) return false;

    // budget
    if (budgetLeft < def.tilesCost) return false;

    // collisions
    const candidate = { x, y, w: size.w, h: size.h };
    for (const it of layout.items) {
      const s = getItemSizeTiles(it);
      const r = { x: it.x, y: it.y, w: s.w, h: s.h };
      if (rectsOverlap(candidate, r)) return false;
    }
    return true;
  }

  function placeAt(x: number, y: number) {
    if (!canPlaceAt(x, y, selectedKind, rot)) return;
    const next: PlacedFurniture = {
      id: crypto.randomUUID(),
      kind: selectedKind,
      x,
      y,
      rot,
    };
    setLayout((prev) => ({ ...prev, items: [...prev.items, next] }));
  }

  function removeAt(x: number, y: number) {
    // remove top-most item that contains tile
    const idx = [...layout.items]
      .map((it, i) => ({ it, i }))
      .reverse()
      .find(({ it }) => {
        const s = getItemSizeTiles(it);
        return x >= it.x && y >= it.y && x < it.x + s.w && y < it.y + s.h;
      })?.i;

    if (idx == null) return;
    setLayout((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  }

  function onRoomMouseMove(e: React.MouseEvent) {
    if (!editMode) return;
    const tile = getTileFromMouse(e);
    if (!tile) {
      setHoverTile(null);
      return;
    }
    // keep ghost inside bounds
    const x = clamp(tile.x, 0, layout.width - selectedSize.w);
    const y = clamp(tile.y, 0, layout.height - selectedSize.h);
    setHoverTile({ x, y });
  }

  function onRoomClick(e: React.MouseEvent) {
    if (!editMode) return;
    const tile = getTileFromMouse(e);
    if (!tile) return;
    const x = clamp(tile.x, 0, layout.width - selectedSize.w);
    const y = clamp(tile.y, 0, layout.height - selectedSize.h);
    placeAt(x, y);
  }

  function onRoomContextMenu(e: React.MouseEvent) {
    if (!editMode) return;
    e.preventDefault();
    const tile = getTileFromMouse(e);
    if (!tile) return;
    removeAt(tile.x, tile.y);
  }

  function resetRoom() {
    setLayout(roomDefaults(roomKey));
  }

  return (
    <div className="petHome">
      <div className="petHome__top">
        <div>
          <div className="petHome__title">Secret Haven</div>
          <div className="petHome__subtitle">
            Top-down rooms • Stardew vibes • DeltaPets chaos
          </div>
        </div>

        <div className="petHome__nav">
          <button className="petHome__btn" onClick={() => navigate("/pet")}>
            Back to Pet
          </button>
          <button
            className="petHome__btn"
            onClick={() => navigate("/hatchery")}
          >
            Hatchery
          </button>
        </div>
      </div>

      <div className="petHome__tabs">
        <button
          className={`tabBtn ${roomKey === "care" ? "tabBtn--active" : ""}`}
          onClick={() => {
            setRoomKey("care");
            setMsg(null);
          }}
        >
          Care Room
        </button>
        <button
          className={`tabBtn ${roomKey === "bond" ? "tabBtn--active" : ""}`}
          onClick={() => {
            setRoomKey("bond");
            setMsg(null);
          }}
        >
          Bond Room
        </button>

        <div className="tabsSpacer" />

        <div className="budget">
          Tiles: <b>{budgetUsed}</b> / {layout.maxTilesBudget}
          <span className={budgetLeft < 0 ? "budget__bad" : "budget__ok"}>
            (
            {budgetLeft >= 0
              ? `${budgetLeft} left`
              : `${Math.abs(budgetLeft)} over`}
            )
          </span>
        </div>
      </div>

      <div className="petHome__grid">
        {/* ROOM */}
        <div className="roomWrap">
          <div className="roomHeader">
            <div className="roomHeader__left">
              <div className="roomHeader__title">
                {roomKey === "care" ? "Care" : "Bond"} Room
              </div>
              <div className="roomHeader__hint">
                {editMode ? (
                  <>
                    Click to place • Right-click to remove • <b>R</b> rotate •{" "}
                    <b>Esc</b> exit edit
                  </>
                ) : (
                  <>
                    Edit to place furniture. Pet chills here when you’re not
                    messing with the decor.
                  </>
                )}
              </div>
            </div>

            <div className="roomHeader__right">
              <button
                className={`petHome__btn ${editMode ? "petHome__btn--hot" : ""}`}
                onClick={() => {
                  setEditMode((p) => !p);
                  setMsg(null);
                }}
              >
                {editMode ? "Done" : "Edit Room"}
              </button>
              <button
                className="petHome__btn"
                disabled={!editMode}
                onClick={() => setRot((p) => (p === 0 ? 90 : 0))}
              >
                Rotate (R)
              </button>
              <button
                className="petHome__btn"
                disabled={!editMode}
                onClick={resetRoom}
              >
                Reset
              </button>
            </div>
          </div>

          <div
            ref={roomRef}
            className={`roomTop ${roomKey === "care" ? "roomTop--care" : "roomTop--bond"}`}
            style={{ width: layout.width * TILE, height: layout.height * TILE }}
            onMouseMove={onRoomMouseMove}
            onMouseLeave={() => setHoverTile(null)}
            onClick={onRoomClick}
            onContextMenu={onRoomContextMenu}
          >
            {/* grid overlay */}
            {editMode ? (
              <div
                className="gridOverlay"
                style={{ backgroundSize: `${TILE}px ${TILE}px` }}
                aria-hidden="true"
              />
            ) : null}

            {/* placed furniture */}
            {layout.items.map((it) => {
              const def = FURNITURE[it.kind];
              const s = getItemSizeTiles(it);
              return (
                <div
                  key={it.id}
                  className={`furn furn--${it.kind}`}
                  style={{
                    left: it.x * TILE,
                    top: it.y * TILE,
                    width: s.w * TILE,
                    height: s.h * TILE,
                  }}
                  title={`${def.label} — ${def.description}`}
                >
                  <div className="furn__label">{def.label}</div>
                </div>
              );
            })}

            {/* ghost placement */}
            {editMode && hoverTile ? (
              <div
                className={`ghost ${canPlaceAt(hoverTile.x, hoverTile.y, selectedKind, rot) ? "ghost--ok" : "ghost--bad"}`}
                style={{
                  left: hoverTile.x * TILE,
                  top: hoverTile.y * TILE,
                  width: selectedSize.w * TILE,
                  height: selectedSize.h * TILE,
                }}
              >
                <div className="ghost__label">{selectedDef.label}</div>
              </div>
            ) : null}

            {/* pet (hidden during edit) */}
            {!editMode ? (
              <div
                className="petSprite"
                style={{ left: 6 * TILE, top: 4 * TILE }}
              >
                <div className="petSprite__blob" />
                <div className="petSprite__name">
                  {pet?.is_runaway ? "Gone..." : (pet?.name ?? "Your Pet")}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* PANEL */}
        <div className="panel">
          {!pet ? (
            <div className="panel__empty">
              No pet yet. Go to <b>/create</b> and get your starter egg.
            </div>
          ) : (
            <>
              <div className="panel__header">
                <div className="panel__petName">{pet.name ?? "Your Pet"}</div>
                <div className="panel__meta">
                  <span>Stage: {pet.stage}</span>
                  <span>Line: {pet.line}</span>
                </div>
              </div>

              {pet.is_runaway ? (
                <div className="panel__alert panel__alert--bad">
                  Your pet ran away (no feeding for 3 days).
                </div>
              ) : null}

              <div className="panelBlock">
                <div className="panelBlock__title">Room Edit</div>
                <div className="panelBlock__body">
                  <div className="picker">
                    <div className="picker__label">Furniture</div>
                    <div className="picker__grid">
                      {(Object.keys(FURNITURE) as FurnitureKind[]).map((k) => {
                        const def = FURNITURE[k];
                        const active = selectedKind === k;
                        const disabled = !editMode;
                        return (
                          <button
                            key={k}
                            className={`pickBtn ${active ? "pickBtn--active" : ""}`}
                            disabled={disabled}
                            onClick={() => setSelectedKind(k)}
                            title={`${def.label} • costs ${def.tilesCost} tiles`}
                          >
                            <div className="pickBtn__name">{def.label}</div>
                            <div className="pickBtn__meta">
                              {def.w}×{def.h} • {def.tilesCost} tiles
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="picker__info">
                      <div className="picker__infoTitle">
                        {selectedDef.label}
                      </div>
                      <div className="picker__infoDesc">
                        {selectedDef.description}
                      </div>
                      <div className="picker__infoMeta">
                        Size: {selectedSize.w}×{selectedSize.h} • Cost:{" "}
                        {selectedDef.tilesCost}
                      </div>
                      {!editMode ? (
                        <div className="picker__locked">
                          Turn on <b>Edit Room</b> to place stuff.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="panelBlock">
                <div className="panelBlock__title">Pet Care</div>
                <div className="panelBlock__body">
                  <div className="stats">
                    <div className="stat">
                      <div className="stat__k">Hunger</div>
                      <div className="stat__v">{pet.hunger}</div>
                    </div>
                    <div className="stat">
                      <div className="stat__k">Clean</div>
                      <div className="stat__v">{pet.cleanliness}</div>
                    </div>
                    <div className="stat">
                      <div className="stat__k">Happy</div>
                      <div className="stat__v">{pet.happiness}</div>
                    </div>
                    <div className="stat">
                      <div className="stat__k">Bond</div>
                      <div className="stat__v">{pet.bond ?? 0}</div>
                    </div>
                  </div>

                  <div className="actions">
                    <button
                      className="actionBtn"
                      disabled={!!busy || pet.is_runaway || cd.feed > 0}
                      onClick={() => doAction("feed")}
                    >
                      Feed {cd.feed > 0 ? `(${fmt(cd.feed)})` : ""}
                    </button>

                    <button
                      className="actionBtn"
                      disabled={!!busy || pet.is_runaway || cd.clean > 0}
                      onClick={() => doAction("clean")}
                    >
                      Clean {cd.clean > 0 ? `(${fmt(cd.clean)})` : ""}
                    </button>

                    <button
                      className="actionBtn"
                      disabled={!!busy || pet.is_runaway || cd.bond > 0}
                      onClick={() => doAction("bond")}
                    >
                      Sit / Bond {cd.bond > 0 ? `(${fmt(cd.bond)})` : ""}
                    </button>
                  </div>
                </div>
              </div>

              {msg ? <div className="panel__msg">{msg}</div> : null}

              <div className="panel__note">
                This is Alpha: layouts save locally (per account). Next step is
                wiring these placements to Supabase so furniture comes from
                inventory + buffs apply server-side.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
