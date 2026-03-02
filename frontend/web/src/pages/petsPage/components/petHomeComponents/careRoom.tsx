import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../lib/supabase/client";
import "./careRoom.css";

type CareRoomMode = "auth" | "preview";
type CareRoomProps = { mode?: CareRoomMode };

type PetRow = {
  id?: string;
  name?: string | null;

  hunger?: number | null;
  cleanliness?: number | null;
  happiness?: number | null;
  bond?: number | null;

  level?: number | null;
  gender?: string | null;
  line?: string | null;
  stage?: string | null;
  personality?: string | null;

  hp_cur?: number | null;
  hp_max?: number | null;
};

type StatTotals = {
  hp?: number;
  atk?: number;
  def?: number;
  spd?: number;
  magi?: number;
  mana?: number;
};

type ElementTotals = {
  null?: number;
  water?: number;
  fire?: number;
  earth?: number;
  air?: number;
  ice?: number;
  storm?: number;
  light?: number;
  shadow?: number;
};

type CareCurrentResponse = {
  pet: PetRow | null;
  stats: StatTotals | null;
  total_points: number | null;
  hp_display: number | null; // still allowed from backend, but NOT used in stats panel
  elements: ElementTotals | null;
};

function clamp0to100(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function prettyEnum(s: unknown) {
  const str = String(s ?? "").trim();
  if (!str) return "—";
  return str
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function displayStage(stageRaw: unknown) {
  const s = String(stageRaw ?? "").toLowerCase();
  if (!s) return "—";
  if (s.includes("baby")) return "Baby";
  if (s.includes("egg")) return "Egg";
  return prettyEnum(s);
}

function displayGender(g: unknown) {
  const s = String(g ?? "").toLowerCase();
  if (!s) return "—";
  if (s.includes("null")) return "Null";
  if (s.includes("male")) return "Male";
  if (s.includes("female")) return "Female";
  return prettyEnum(s);
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="crKV">
      <div className="crK">{k}</div>
      <div className="crV">{v}</div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="crStatRow">
      <div className="crStatLabel">{label}</div>
      <div className="crStatValue">{value}</div>
    </div>
  );
}

function Bar({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "blue" | "purple" | "red" | "gold";
}) {
  const v = clamp0to100(value);
  return (
    <div className="tamaBarRow">
      <div className="tamaBarTop">
        <span className="tamaBarLabel">{label}</span>
        <span className="tamaBarValue">{v}</span>
      </div>
      <div className="tamaBarTrack">
        <div
          className={`tamaBarFill tamaBarFill--${tone}`}
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}

function makePreview(): CareCurrentResponse {
  // IMPORTANT: Stats panel should sum to total_points (17)
  // HP here is the STAT HP (points), not the derived HP max.
  // Derived HP is shown via hp_cur/hp_max (hp_stat * 2).
  return {
    pet: {
      name: "Mason",
      level: 1,
      gender: "male",
      line: "shadow",
      stage: "baby",
      personality: "gentle",
      hunger: 50,
      cleanliness: 50,
      happiness: 50,
      bond: 0,
      hp_cur: 10,
      hp_max: 10,
    },
    stats: { hp: 5, atk: 3, def: 2, spd: 3, magi: 4, mana: 0 },
    total_points: 17,
    hp_display: 10,
    elements: {
      null: 0,
      water: 0,
      fire: 0,
      earth: 0,
      air: 0,
      ice: 0,
      storm: 0,
      light: 0,
      shadow: 0,
    },
  };
}

function sumTotals(t: StatTotals | null) {
  if (!t) return 0;
  return (
    (t.hp ?? 0) +
    (t.atk ?? 0) +
    (t.def ?? 0) +
    (t.spd ?? 0) +
    (t.magi ?? 0) +
    (t.mana ?? 0)
  );
}

export function CareRoom({ mode = "auth" }: CareRoomProps) {
  const [data, setData] = useState<CareCurrentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const previewData = useMemo(() => makePreview(), []);

  async function load() {
    setMsg(null);

    if (mode === "preview") {
      setData(previewData);
      setLoading(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setData({
        pet: null,
        stats: null,
        total_points: null,
        hp_display: null,
        elements: null,
      });
      setLoading(false);
      return;
    }

    const res = await fetch("/api/care/current", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = (await res.json().catch(() => ({}))) as CareCurrentResponse;
    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function doAction(action: "feed" | "clean" | "play") {
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

  const pet = data?.pet ?? null;
  const totals = data?.stats ?? null;
  const totalPoints = data?.total_points ?? null;
  const elements = data?.elements ?? null;

  const hunger = Number(pet?.hunger ?? 0);
  const clean = Number(pet?.cleanliness ?? 0);
  const happy = Number(pet?.happiness ?? 0);
  const bond = Number(pet?.bond ?? 0);

  const level = Number(pet?.level ?? 1);
  const hpCur = Number(pet?.hp_cur ?? 0);
  const hpMax = Number(pet?.hp_max ?? 0);

  // ✅ FIX: Stats panel should use raw stat HP (points), NOT hp_display (hp*2)
  const sHP = totals?.hp ?? 0;
  const sATK = totals?.atk ?? 0;
  const sDEF = totals?.def ?? 0;
  const sSPD = totals?.spd ?? 0;
  const sMAGI = totals?.magi ?? 0;
  const sMANA = totals?.mana ?? 0;

  const computedTotal = sumTotals(totals);
  const shownTotal = totalPoints ?? computedTotal;

  const nickname = "—";

  return (
    <div className="crWrap">
      <section className="tamaShell">
        <div className="tamaScreen">
          {!pet ? (
            <div className="tamaEmpty">No pet placed in Care Room.</div>
          ) : (
            <div className="tamaSharedPanel">
              <div className="tamaBars">
                <Bar label="Hunger" value={hunger} tone="blue" />
                <Bar label="Clean" value={clean} tone="purple" />
                <Bar label="Happy" value={happy} tone="red" />
                <Bar label="Bond" value={bond} tone="gold" />
              </div>

              <div className="tamaPetPanel" aria-label="Pet display">
                <div className="tamaPetFrame">
                  <div className="tamaPetSprite" aria-hidden>
                    🐣
                  </div>
                </div>
                <div className="tamaPetHint">Sprite placeholder</div>
              </div>
            </div>
          )}
        </div>

        <div className="tamaButtons">
          <button
            onClick={() => doAction("feed")}
            disabled={mode === "preview" || !pet}
          >
            Feed
          </button>
          <button
            onClick={() => doAction("clean")}
            disabled={mode === "preview" || !pet}
          >
            Clean
          </button>
        </div>

        <div className="tamaPlayRow">
          <button
            className="tamaPlayRect"
            onClick={() => doAction("play")}
            disabled={mode === "preview" || !pet}
          >
            Play
          </button>
        </div>

        <div className="tamaIdentity">
          <KV k="Name:" v={pet?.name ?? "—"} />
          <KV k="NickName:" v={nickname} />
          <KV k="Level:" v={level} />
          <KV k="Gender:" v={displayGender(pet?.gender)} />
          <KV k="Element:" v={prettyEnum(pet?.line)} />
          <KV k="Stage:" v={displayStage(pet?.stage)} />
          <KV k="HP:" v={hpMax ? `${hpCur} / ${hpMax}` : "—"} />
          <KV k="Personality:" v={prettyEnum(pet?.personality)} />
        </div>

        {msg && <div className="tamaMsg">{msg}</div>}
      </section>

      <aside className="crStatsShell" aria-label="Stats">
        <div className="crStatsHeader">
          <div className="crStatsTitle">Stats</div>
          <div className="crStatsMeta">Total points: {shownTotal}</div>
        </div>

        <div className="crStatsCard">
          <StatRow label="HP" value={sHP} />
          <StatRow label="ATK" value={sATK} />
          <StatRow label="DEF" value={sDEF} />
          <StatRow label="SPD" value={sSPD} />
          <StatRow label="MAGI" value={sMAGI} />
          <StatRow label="MANA" value={sMANA} />
          <StatRow label="Total" value={shownTotal} />
        </div>

        <div className="crStatsDivider" />

        <div className="crStatsHeader">
          <div className="crStatsTitle">Element Stats</div>
        </div>

        <div className="crStatsCard">
          <StatRow label="Null" value={elements?.null ?? 0} />
          <StatRow label="Water" value={elements?.water ?? 0} />
          <StatRow label="Fire" value={elements?.fire ?? 0} />
          <StatRow label="Earth" value={elements?.earth ?? 0} />
          <StatRow label="Air" value={elements?.air ?? 0} />
          <StatRow label="Ice" value={elements?.ice ?? 0} />
          <StatRow label="Storm" value={elements?.storm ?? 0} />
          <StatRow label="Light" value={elements?.light ?? 0} />
          <StatRow label="Shadow" value={elements?.shadow ?? 0} />
        </div>
      </aside>
    </div>
  );
}
