import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../lib/supabase/client";
import "./careRoom.css";

type CareRoomMode = "auth" | "preview";

type CareRoomProps = {
  mode?: CareRoomMode;
};

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

function makePreviewPet() {
  const names = ["Aquarie", "Raylite", "Shadeimp", "Sparvolt", "Glimmeroot"];
  const name = names[Math.floor(Math.random() * names.length)];

  return {
    name,
    hunger: 45 + Math.floor(Math.random() * 45),
    cleanliness: 40 + Math.floor(Math.random() * 50),
    happiness: 50 + Math.floor(Math.random() * 45),
  };
}

export function CareRoom({ mode = "auth" }: CareRoomProps) {
  const [pet, setPet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const previewPet = useMemo(() => makePreviewPet(), []);

  async function load() {
    // ✅ PREVIEW MODE (no auth, no API)
    if (mode === "preview") {
      setPet(previewPet);
      setLoading(false);
      return;
    }

    // ✅ AUTH MODE (your existing behavior)
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setPet(null);
      setLoading(false);
      return;
    }

    const res = await fetch("/api/care/current", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = await res.json().catch(() => ({}));
    setPet((json as any).pet ?? null);
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function doAction(action: "feed" | "clean") {
    setMsg(null);

    if (mode === "preview") {
      setMsg("Log in to interact with your own pet.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setMsg("Not logged in.");
      return;
    }

    const res = await fetch(`/api/care/${action}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg((json as any).error ?? "Action failed");
      return;
    }

    await load();
  }

  if (loading) return null;

  return (
    <div className="tamaShell">
      <div className="tamaScreen">
        {!pet ? (
          <div className="tamaEmpty">No pet placed in Care Room.</div>
        ) : (
          <>
            <div className="tamaPetName">{pet.name}</div>

            {/* Replace this emoji later with sprite */}
            <div className="tamaPetSprite" aria-hidden>
              🐣
            </div>

            <div className="tamaBars">
              <Bar label="Hunger" value={Number(pet.hunger ?? 0)} />
              <Bar label="Clean" value={Number(pet.cleanliness ?? 0)} />
              <Bar label="Happy" value={Number(pet.happiness ?? 0)} />
            </div>
          </>
        )}
      </div>

      <div className="tamaButtons">
        <button onClick={() => doAction("feed")} disabled={mode === "preview"}>
          Feed
        </button>
        <button onClick={() => doAction("clean")} disabled={mode === "preview"}>
          Clean
        </button>
      </div>

      {msg && <div className="tamaMsg">{msg}</div>}
    </div>
  );
}
