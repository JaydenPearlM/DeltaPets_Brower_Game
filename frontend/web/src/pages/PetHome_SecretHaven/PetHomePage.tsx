// src/pages/PetHome_SecretHaven/PetHomePage.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase/client";
import { useAuth } from "../../app/providers/useAuth";
import "./PetHomePage.css";

import { FURNITURE, TILE, roomDefaults } from "./secretHaven.data";
import {
  clamp,
  getItemSizeTiles,
  rectsOverlap,
  safeParseJSON,
  storageKey,
  tilesUsed,
} from "./secretHaven.utils";
import type {
  ActivePetResponse,
  Cooldowns,
  FurnitureKind,
  RoomKey,
  RoomLayout,
  PlacedFurniture,
} from "./secretHaven.types";

import { RoomTopDown } from "./petHomeComponents/roomTopDown";
import { FurniturePicker } from "./petHomeComponents/furniturePicker";
import { PetCarePanel } from "./petHomeComponents/petCarePanel";

// =============================================================================
// Pet Home (Top-down room editor)
// - Two rooms (Care + Bond)
// - Edit mode hides pet, shows grid
// - Click to place, right-click to remove
// - Local persistence (localStorage) keyed per-user
// =============================================================================

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
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;

    const res = await fetch(`/api/pets/active`, {
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
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not logged in");

      const res = await fetch(`/api/pets/actions/do`, {
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

          <RoomTopDown
            layout={layout}
            roomKey={roomKey}
            editMode={editMode}
            roomRef={roomRef}
            onMouseMove={onRoomMouseMove}
            onMouseLeave={() => setHoverTile(null)}
            onClick={onRoomClick}
            onContextMenu={onRoomContextMenu}
            hoverTile={hoverTile}
            selectedKind={selectedKind}
            rot={rot}
            selectedSize={selectedSize}
            selectedDef={selectedDef}
            canPlaceAt={canPlaceAt}
            pet={pet}
          />
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

              <FurniturePicker
                editMode={editMode}
                selectedKind={selectedKind}
                setSelectedKind={setSelectedKind}
                selectedDef={selectedDef}
                selectedSize={selectedSize}
              />

              <PetCarePanel
                pet={pet}
                busy={busy}
                cd={{ feed: cd.feed, clean: cd.clean, bond: cd.bond }}
                doAction={doAction}
              />

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
