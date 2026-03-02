import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../lib/supabase/client";
import "./careRoom.css";

type CareRoomMode = "auth" | "preview";
type CareRoomProps = { mode?: CareRoomMode };

type PetRow = {
  id?: string;
  name?: string | null;
  nickname?: string | null;

  hunger?: number | null;
  cleanliness?: number | null;
  happiness?: number | null;
  bond?: number | null;

  level?: number | null;
  gender?: string | null;
  line?: string | null;
  stage?: string | null;

  personality?: string | null;
  personality_key?: string | null;

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
  hp_display: number | null;
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
  return {
    pet: {
      name: "Mason",
      nickname: null,
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

function isEggStage(stage: unknown) {
  return String(stage ?? "")
    .toLowerCase()
    .includes("egg");
}

export function CareRoom({ mode = "auth" }: CareRoomProps) {
  const [data, setData] = useState<CareCurrentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [nickDraft, setNickDraft] = useState("");
  const [nickBusy, setNickBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const previewData = useMemo(() => makePreview(), []);

  async function getToken() {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.access_token ?? null;
  }

  async function load() {
    setMsg(null);

    // ✅ Preview mode never calls API/Supabase
    if (mode === "preview") {
      setData(previewData);
      setLoading(false);
      return;
    }

    const token = await getToken();

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

    const nick = String(json?.pet?.nickname ?? "").trim();
    setNickDraft(nick);

    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function doAction(action: "feed" | "clean" | "play" | "pet") {
    setMsg(null);

    if (mode === "preview") {
      setMsg("Log in to interact with your own pet.");
      return;
    }

    const token = await getToken();
    if (!token) {
      setMsg("Not logged in.");
      return;
    }

    setActionBusy(true);
    try {
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
    } finally {
      setActionBusy(false);
    }
  }

  async function saveNickname() {
    setMsg(null);

    if (mode === "preview") {
      setMsg("Log in to set a nickname.");
      return;
    }

    const token = await getToken();
    if (!token) {
      setMsg("Not logged in.");
      return;
    }

    const next = nickDraft.trim();

    setNickBusy(true);
    try {
      const res = await fetch("/api/care/nickname", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nickname: next }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg((json as any).error ?? "Nickname update failed");
        return;
      }

      await load();
      setMsg("Nickname saved.");
    } finally {
      setNickBusy(false);
    }
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

  const sHP = totals?.hp ?? 0;
  const sATK = totals?.atk ?? 0;
  const sDEF = totals?.def ?? 0;
  const sSPD = totals?.spd ?? 0;
  const sMAGI = totals?.magi ?? 0;
  const sMANA = totals?.mana ?? 0;

  const computedTotal = sumTotals(totals);
  const shownTotal = totalPoints ?? computedTotal;

  const personalityShown = prettyEnum(pet?.personality ?? pet?.personality_key);

  const sprite = pet ? (isEggStage(pet.stage) ? "🥚" : "🐣") : "—";
  const disableCare = mode === "preview" || !pet || actionBusy || nickBusy;

  // ✅ One-time nickname behavior
  const existingNick = String(pet?.nickname ?? "").trim();
  const nicknameLocked = Boolean(existingNick);

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
                    {sprite}
                  </div>
                </div>
                <div className="tamaPetHint">Sprite placeholder</div>
              </div>
            </div>
          )}
        </div>

        <div className="tamaButtons">
          <button onClick={() => doAction("feed")} disabled={disableCare}>
            Feed
          </button>
          <button onClick={() => doAction("clean")} disabled={disableCare}>
            Clean
          </button>
        </div>

        <div className="tamaButtons" style={{ marginTop: 10 }}>
          <button onClick={() => doAction("play")} disabled={disableCare}>
            Play
          </button>
          <button onClick={() => doAction("pet")} disabled={disableCare}>
            Pet
          </button>
        </div>

        {/* ✅ Pet info first */}
        <div className="tamaIdentity">
          <KV k="Name:" v={pet?.name ?? "—"} />
          <KV k="NickName:" v={existingNick ? existingNick : "—"} />
          <KV k="Level:" v={level} />
          <KV k="Gender:" v={displayGender(pet?.gender)} />
          <KV k="Element:" v={prettyEnum(pet?.line)} />
          <KV k="Stage:" v={displayStage(pet?.stage)} />
          <KV k="HP:" v={hpMax ? `${hpCur} / ${hpMax}` : "—"} />
          <KV k="Personality:" v={personalityShown} />
        </div>

        {/* ✅ Nickname input BELOW the info panel */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
            Nickname {nicknameLocked ? "(locked)" : "(one-time)"}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={nickDraft}
              onChange={(e) => setNickDraft(e.target.value)}
              placeholder={nicknameLocked ? "Nickname locked" : "Set nickname…"}
              disabled={
                mode === "preview" ||
                !pet ||
                nickBusy ||
                actionBusy ||
                nicknameLocked
              }
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.92)",
                outline: "none",
                opacity: nicknameLocked ? 0.65 : 1,
              }}
            />

            <button
              type="button"
              onClick={saveNickname}
              disabled={
                mode === "preview" ||
                !pet ||
                nickBusy ||
                actionBusy ||
                nicknameLocked ||
                !nickDraft.trim()
              }
            >
              {nickBusy ? "Saving…" : "Save"}
            </button>
          </div>

          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
            {nicknameLocked
              ? "Nickname is locked for this pet."
              : "You can only set your nickname once. Choose wisely."}
          </div>
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
