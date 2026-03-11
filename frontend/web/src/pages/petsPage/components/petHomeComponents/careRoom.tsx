import React, { useEffect, useState } from "react";
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

/**
 * Preview-only "Pet Description" text, driven by personality.
 * - No weird punctuation
 * - Reads like real in-world lore
 * - Auto-scales to any pet without writing per-pet entries
 */
function personalityLore(
  personalityRaw: unknown,
  opts?: { element?: unknown; stage?: unknown; name?: unknown },
) {
  const p = String(personalityRaw ?? "")
    .trim()
    .toLowerCase();
  const element = String(opts?.element ?? "")
    .trim()
    .toLowerCase();
  const stage = String(opts?.stage ?? "")
    .trim()
    .toLowerCase();
  const name = String(opts?.name ?? "").trim();

  const stageWord = stage.includes("egg")
    ? "egg"
    : stage.includes("baby")
      ? "hatchling"
      : "delta";

  const elementWord = element ? prettyEnum(element) : "Unknown";
  const subject = name ? `${name}` : `This ${stageWord}`;

  const map: Record<string, string> = {
    gentle: `${subject} carries a calm presence and responds warmly to careful handling. Its ${elementWord.toLowerCase()} nature strengthens through steady routines and patient care.`,
    brave: `${subject} shows steady confidence and adapts quickly to unfamiliar places. Its ${elementWord.toLowerCase()} traits surface early and remain reliable under pressure.`,
    curious: `${subject} constantly observes movement, sound, and energy patterns around it. Its ${elementWord.toLowerCase()} alignment often leads it toward hidden paths and strange discoveries.`,
    moody: `${subject} reflects subtle emotional shifts that change with its surroundings. When settled, its ${elementWord.toLowerCase()} energy becomes stable and easier to train.`,
    loyal: `${subject} forms strong bonds and stays attentive to those it trusts. Consistent companionship helps its ${elementWord.toLowerCase()} abilities develop with clarity.`,
    chaotic: `${subject} releases unpredictable bursts of energy that appear without warning. Its ${elementWord.toLowerCase()} growth path often becomes unusual, but rarely weak.`,
    focused: `${subject} trains with discipline and improves rapidly with structure. A consistent schedule helps its ${elementWord.toLowerCase()} traits sharpen into dependable skill.`,
  };

  return (
    map[p] ??
    `${subject} has a distinct presence and an origin that is still being studied. Its ${elementWord.toLowerCase()} alignment may shape its abilities over time.`
  );
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
      </div>

      <div
        className="tamaBarTrack"
        role="progressbar"
        aria-label={label}
        aria-valuenow={v}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`tamaBarFill tamaBarFill--${tone}`}
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}

// -------------------------
// Homepage preview helpers
// -------------------------

const PREVIEW_NAMES = [
  "Mason",
  "Astra",
  "Nyx",
  "Kairo",
  "Lyra",
  "Rook",
  "Juniper",
  "Vega",
  "Sable",
  "Nova",
  "Iris",
  "Zed",
];

const PREVIEW_PERSONALITIES = [
  "gentle",
  "brave",
  "curious",
  "moody",
  "loyal",
  "chaotic",
  "focused",
];

const PREVIEW_LINES = [
  "null",
  "water",
  "fire",
  "earth",
  "air",
  "ice",
  "storm",
  "light",
  "shadow",
] as const;

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[randInt(0, arr.length - 1)];
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

function rollPreviewStats(totalPoints = 17): StatTotals {
  const keys: (keyof StatTotals)[] = [
    "hp",
    "atk",
    "def",
    "spd",
    "magi",
    "mana",
  ];
  const out: Record<string, number> = {
    hp: 0,
    atk: 0,
    def: 0,
    spd: 0,
    magi: 0,
    mana: 0,
  };

  let remaining = Math.max(0, Math.floor(totalPoints));

  for (const k of keys) {
    if (remaining <= 0) break;
    if (Math.random() < 0.65) {
      out[k] += 1;
      remaining -= 1;
    }
  }

  while (remaining > 0) {
    const k = pick(keys);
    out[k] += 1;
    remaining -= 1;
  }

  return out as StatTotals;
}

function rollPreviewElements(
  primary: (typeof PREVIEW_LINES)[number],
): ElementTotals {
  const base: ElementTotals = {
    null: 0,
    water: 0,
    fire: 0,
    earth: 0,
    air: 0,
    ice: 0,
    storm: 0,
    light: 0,
    shadow: 0,
  };

  const primaryPoints = randInt(6, 12);
  (base as any)[primary] = primaryPoints;

  if (Math.random() < 0.35) {
    const secondary = pick(PREVIEW_LINES.filter((l) => l !== primary));
    (base as any)[secondary] = randInt(1, 4);
  }

  return base;
}

function makeRandomPreview(): CareCurrentResponse {
  const line = pick(PREVIEW_LINES);

  const stats = rollPreviewStats(17);
  const total = sumTotals(stats);

  const hpMax = 10 + (stats.hp ?? 0) * 2;
  const hpCur = randInt(Math.max(1, Math.floor(hpMax * 0.55)), hpMax);

  const stage = Math.random() < 0.22 ? "egg" : "baby";

  return {
    pet: {
      name: pick(PREVIEW_NAMES),
      nickname: null,
      level: 1, //only for the preview
      gender: pick(["male", "female", "null"]),
      line,
      stage,
      personality: pick(PREVIEW_PERSONALITIES),
      hunger: randInt(15, 95),
      cleanliness: randInt(15, 95),
      happiness: randInt(15, 95),
      bond: randInt(0, 30),
      hp_cur: hpCur,
      hp_max: hpMax,
    },
    stats,
    total_points: total,
    hp_display: hpCur,
    elements: rollPreviewElements(line),
  };
}

function safeLineKey(line: unknown) {
  const s = String(line ?? "")
    .toLowerCase()
    .trim();
  const ok = new Set([
    "null",
    "water",
    "fire",
    "earth",
    "air",
    "ice",
    "storm",
    "light",
    "shadow",
  ]);
  return ok.has(s) ? s : "null";
}

export function CareRoom({ mode = "auth" }: CareRoomProps) {
  const isPreview = mode === "preview";

  const [data, setData] = useState<CareCurrentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgTone, setMsgTone] = useState<"info" | "success" | "error">("info");

  const [nickDraft, setNickDraft] = useState("");
  const [nickBusy, setNickBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const [nickWarned, setNickWarned] = useState(false);

  async function getToken() {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.access_token ?? null;
  }

  async function load() {
    setMsg(null);

    if (isPreview) {
      setData(makeRandomPreview());
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
    setNickWarned(false);

    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    if (!isPreview) return;

    const id = window.setInterval(
      () => {
        setData(makeRandomPreview());
      },
      3 * 60 * 1000,
    );

    return () => window.clearInterval(id);
  }, [isPreview]);

  async function doAction(action: "feed" | "clean" | "play" | "pet") {
    setMsg(null);

    if (isPreview) {
      setMsgTone("info");
      setMsg("Log in to interact with your own pet.");
      return;
    }

    const token = await getToken();
    if (!token) {
      setMsgTone("error");
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
        setMsgTone("error");
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

    const pet = data?.pet ?? null;
    const existingNick = String(pet?.nickname ?? "").trim();
    const nicknameLocked = Boolean(existingNick);

    if (isPreview) {
      setMsgTone("info");
      setMsg("Log in to set a nickname.");
      return;
    }

    if (!pet) {
      setMsgTone("error");
      setMsg("No pet found.");
      return;
    }

    if (nicknameLocked) {
      setNickWarned(true);
      setMsgTone("error");
      setMsg("Nickname already set. It can’t be changed.");
      return;
    }

    const token = await getToken();
    if (!token) {
      setMsgTone("error");
      setMsg("Not logged in.");
      return;
    }

    const next = nickDraft.trim();
    if (!next) return;

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
        setMsgTone("error");
        setMsg((json as any).error ?? "Nickname update failed");
        return;
      }

      await load();
      setMsgTone("success");
      setMsg(
        "Nickname saved. This is the only time you can change your pet’s name.",
      );
    } finally {
      setNickBusy(false);
    }
  }

  if (loading) return null;

  const pet = data?.pet ?? null;
  const totals = data?.stats ?? null;
  const elements = data?.elements ?? null;

  const hunger = Number(pet?.hunger ?? 0);
  const clean = Number(pet?.cleanliness ?? 0);
  const happy = Number(pet?.happiness ?? 0);
  const bond = Number(pet?.bond ?? 0);

  // Preview stays level 1 (requested). Auth mode shows real pet level.
  const level = isPreview ? 1 : Number(pet?.level ?? 1);

  const sHP = totals?.hp ?? 0;
  const sATK = totals?.atk ?? 0;
  const sDEF = totals?.def ?? 0;
  const sSPD = totals?.spd ?? 0;
  const sMAGI = totals?.magi ?? 0;
  const sMANA = totals?.mana ?? 0;

  const shownTotal = sumTotals(totals);

  const personalityShown = prettyEnum(pet?.personality ?? pet?.personality_key);

  const sprite = pet ? "🐣" : "—";
  const disableCare = isPreview || !pet || actionBusy || nickBusy;

  const existingNick = String(pet?.nickname ?? "").trim();
  const nicknameLocked = Boolean(existingNick);

  // Display name shown on the sprite card (AUTH mode only)
  const displayName = (
    existingNick ||
    String(pet?.name ?? "").trim() ||
    "—"
  ).trim();

  const lineKey = safeLineKey(pet?.line);
  const accentClass = `crAccent--${lineKey}`;

  const nickInputReadOnly = nicknameLocked || isPreview || !pet;

  const saveLooksDisabled =
    isPreview ||
    !pet ||
    nickBusy ||
    actionBusy ||
    nicknameLocked ||
    !nickDraft.trim();

  const saveTitle =
    nicknameLocked && nickWarned
      ? "You can't change your pet’s nickname once it’s set."
      : undefined;

  return (
    <div
      className={`crWrap ${accentClass} ${isPreview ? "crWrap--preview" : ""}`}
    >
      <section className="tamaShell">
        <div className="tamaScreen">
          {!pet ? (
            <div className="tamaEmpty">No pet placed in Care Room.</div>
          ) : (
            <div className="tamaUnifiedPanel">
              <div className="tamaBars">
                <Bar label="Hunger" value={hunger} tone="blue" />
                <Bar label="Clean" value={clean} tone="purple" />
                <Bar label="Happy" value={happy} tone="red" />
                <Bar label="Bond" value={bond} tone="gold" />
              </div>

              <div className="tamaPetPanel" aria-label="Pet display">
                <div className="tamaPetFrame">
                  {!isPreview && pet && (
                    <div className="tamaPetNameTag" title={displayName}>
                      {displayName}
                    </div>
                  )}

                  <div className="tamaPetSprite" aria-hidden>
                    <div className="tempPet">
                      <div className="tempPetBody"></div>
                      <div className="tempPetEye left"></div>
                      <div className="tempPetEye right"></div>
                      <div className="tempPetBeak"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {!isPreview && (
          <>
            <div className="tamaButtons">
              <button
                className="dp-btn dp-btn--red"
                onClick={() => doAction("feed")}
                disabled={disableCare}
              >
                Feed
              </button>

              <button
                className="dp-btn dp-btn--blue"
                onClick={() => doAction("clean")}
                disabled={disableCare}
              >
                Clean
              </button>
            </div>

            <div className="tamaButtons tamaButtons--secondRow">
              <button
                className="dp-btn dp-btn--purple"
                onClick={() => doAction("play")}
                disabled={disableCare}
              >
                Play
              </button>

              <button
                className="dp-btn dp-btn--yellow"
                onClick={() => doAction("pet")}
                disabled={disableCare}
              >
                Pet
              </button>
            </div>
          </>
        )}

        <div className="crPaperCard tamaIdentity">
          <KV k="Name:" v={pet?.name ?? "—"} />
          {/* Hide the NickName row once a nickname exists (since we show it on the sprite card) */}
          {!existingNick && <KV k="NickName:" v={"—"} />}
          <KV k="Level:" v={level} />
          <KV k="Gender:" v={displayGender(pet?.gender)} />
          <KV k="Element:" v={prettyEnum(pet?.line)} />
          <KV k="Stage:" v={displayStage(pet?.stage)} />
          <KV k="Personality:" v={personalityShown} />
        </div>

        {/* Hide nickname editor entirely once it’s set */}
        {!isPreview && !nicknameLocked && (
          <div className="crNickBlock crPaperCard">
            <div className="crNickRow">
              <input
                className="dp-input crNickInput"
                value={nickDraft}
                onChange={(e) => {
                  if (nicknameLocked) return;
                  setNickDraft(e.target.value);
                }}
                readOnly={nickInputReadOnly}
                placeholder={nicknameLocked ? "" : "Set nickname…"}
              />

              <button
                className={`dp-btn dp-btn--yellow dp-btn--sm ${
                  saveLooksDisabled ? "dp-btn--softDisabled" : ""
                }`}
                type="button"
                title={saveTitle}
                onClick={saveNickname}
                disabled={isPreview || !pet || nickBusy || actionBusy}
              >
                {nickBusy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}

        {!isPreview && msg && (
          <div
            className={`tamaMsg ${
              msgTone === "success"
                ? "tamaMsg--success"
                : msgTone === "error"
                  ? "tamaMsg--error"
                  : ""
            }`}
            role={msgTone === "error" ? "alert" : "status"}
            aria-live={msgTone === "error" ? "assertive" : "polite"}
          >
            {msg}
          </div>
        )}
      </section>

      <aside className="crStatsShell" aria-label="Stats">
        {/* ✅ Preview-only: Pet Description pill + clamped text */}
        {isPreview && (
          <>
            <div
              className="crSectionDivider crSectionDivider--top"
              aria-hidden="true"
            >
              <span>Pet Description</span>
            </div>

            <div className="crLoreText" aria-label="Pet description">
              {personalityLore(pet?.personality ?? pet?.personality_key, {
                element: pet?.line,
                stage: pet?.stage,
                name: pet?.name,
              })}
            </div>
          </>
        )}

        <div
          className="crSectionDivider crSectionDivider--top"
          aria-hidden="true"
        >
          <span>Stats</span>
        </div>

        <div className="crPaperCard crStatsCard">
          <StatRow label="HP" value={sHP} />
          <StatRow label="ATK" value={sATK} />
          <StatRow label="DEF" value={sDEF} />
          <StatRow label="SPD" value={sSPD} />
          <StatRow label="MAGI" value={sMAGI} />
          <StatRow label="MANA" value={sMANA} />
          <StatRow label="Total" value={shownTotal} />
        </div>

        {!isPreview && (
          <>
            <div className="crSectionDivider" aria-hidden="true">
              <span>Element Stats</span>
            </div>

            <div className="crPaperCard crStatsCard crElementCard">
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
          </>
        )}
      </aside>
    </div>
  );
}
