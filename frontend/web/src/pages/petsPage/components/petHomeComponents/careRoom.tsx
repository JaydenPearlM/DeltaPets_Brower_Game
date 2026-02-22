import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase/client";
import "./careRoom.css";

function clamp01to100(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function Bar({ label, value }: { label: string; value: number }) {
  const v = clamp01to100(value);

  return (
    <div className="tamaBarRow">
      <div className="tamaBarTop">
        <span className="tamaBarLabel">{label}</span>
        <span className="tamaBarValue">{v}</span>
      </div>

      <div className="tamaBarTrack">
        <div className="tamaBarFill" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

/**
 * Alpha food storage (local-only)
 * Later you’ll swap this to real Inventory tables.
 */
const FOOD_KEY = "deltapets_food_chicken";

function readFoodCount(): number {
  try {
    const raw = localStorage.getItem(FOOD_KEY);
    if (raw == null) return 3; // ✅ starter amount so feeding works in Alpha
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 3;
  } catch {
    return 3;
  }
}

function writeFoodCount(n: number) {
  try {
    localStorage.setItem(FOOD_KEY, String(Math.max(0, Math.floor(n))));
  } catch {
    // ignore
  }
}

export function CareRoom() {
  const [pet, setPet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  // ✅ local “inventory” for food (temporary)
  const [food, setFood] = useState<number>(() => readFoodCount());

  async function load() {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;

    const res = await fetch("/api/care/current", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = await res.json().catch(() => ({}));
    setPet((json as any).pet ?? null);
    setLoading(false);
  }

  async function doAction(action: "feed" | "clean") {
    setMsg(null);

    // ✅ Feed consumes food from “inventory” (localStorage for now)
    if (action === "feed") {
      if (food <= 0) {
        setMsg("No food available. Go find some first.");
        return;
      }

      // spend locally first (feels instant)
      const nextFood = food - 1;
      setFood(nextFood);
      writeFoodCount(nextFood);
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setMsg("Not logged in.");
      return;
    }

    const res = await fetch(`/api/care/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const json = await res.json().catch(() => ({}));

    // if server rejects feed, refund food (so you don’t lose items)
    if (!res.ok) {
      if (action === "feed") {
        const refund = food; // note: state updates async, but we have intent
        const actual = readFoodCount();
        const restored = actual + 1;
        setFood(restored);
        writeFoodCount(restored);
      }

      setMsg((json as any).error ?? "Action failed");
      return;
    }

    await load();
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return null;

  return (
    <div className="tamaShell">
      <div className="tamaScreen">
        {!pet ? (
          <div className="tamaEmpty">No pet placed in Care Room.</div>
        ) : (
          <>
            <div className="tamaPetName">{pet.name}</div>

            <div className="tamaPetSprite">🐣</div>

            {/* ✅ tiny “inventory” line */}
            <div className="tamaFoodLine">Food: {food}</div>

            <div className="tamaBars">
              <Bar label="Hunger" value={Number(pet.hunger ?? 0)} />
              <Bar label="Clean" value={Number(pet.cleanliness ?? 0)} />
              <Bar label="Happy" value={Number(pet.happiness ?? 0)} />
            </div>
          </>
        )}
      </div>

      <div className="tamaButtons">
        {/* ✅ removed emojis, keep it clean */}
        <button onClick={() => doAction("feed")}>Feed</button>
        <button onClick={() => doAction("clean")}>Clean</button>
      </div>

      {msg && <div className="tamaMsg">{msg}</div>}
    </div>
  );
}
