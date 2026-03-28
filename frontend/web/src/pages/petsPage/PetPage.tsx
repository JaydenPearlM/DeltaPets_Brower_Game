import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../app/providers/useAuth";
import { supabase } from "../../lib/supabase/client";
import "./PetPage.css";

type CareAction = "feed" | "clean" | "play" | "pet";

type PetRecord = {
  id?: string;
  user_id?: string;
  name?: string | null;
  nickname?: string | null;
  level?: number | null;
  gender?: string | null;
  element?: string | null;
  line?: string | null;
  stage?: string | null;

  personality?: string | null;
  personality_name?: string | null;
  personality_key?: string | null;
  personality_id?: string | null;

  hunger?: number | null;
  cleanliness?: number | null;
  happiness?: number | null;
  bond?: number | null;

  description?: string | null;
};

type PetStatsRow = {
  pet_id?: string;
  hp?: number | null;
  atk?: number | null;
  def?: number | null;
  spd?: number | null;
  magi?: number | null;
  mana?: number | null;
  base_total?: number | null;
};

type PetElementsRow = {
  pet_id?: string;
  null?: number | null;
  water?: number | null;
  fire?: number | null;
  earth?: number | null;
  air?: number | null;
  ice?: number | null;
  storm?: number | null;
  light?: number | null;
  shadow?: number | null;
};

type CareCurrentResponse = {
  pet: PetRecord | null;
  stats: PetStatsRow | null;
  total_points?: number | null;
  hp_display?: number | null;
  elements: PetElementsRow | null;
};

const ELEMENT_ORDER: Array<keyof Omit<PetElementsRow, "pet_id">> = [
  "null",
  "water",
  "fire",
  "earth",
  "air",
  "ice",
  "storm",
  "light",
  "shadow",
];

function clampPercent(value: unknown) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function safeNum(value: unknown, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

function titleCase(value: string | null | undefined) {
  if (!value) return "—";

  return String(value)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeElement(value: string | null | undefined) {
  if (!value) return "null";

  const v = String(value).trim().toLowerCase().replace(/\s+/g, "_");

  if (v === "null_element") return "null";
  if (ELEMENT_ORDER.includes(v as keyof Omit<PetElementsRow, "pet_id">)) {
    return v;
  }

  return "null";
}

async function getAccessTokenSafe() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message || "Failed to read auth session.");
  }

  return data.session?.access_token ?? null;
}

function getPetLabel(pet: PetRecord | null) {
  return pet?.nickname?.trim() || pet?.name?.trim() || "Your Delta";
}

function getPersonalityTone(personalityName: string | null) {
  const p = String(personalityName ?? "").toLowerCase();

  if (!p) {
    return "This Delta is still figuring itself out, but it already feels attached to you.";
  }

  if (p.includes("brave") || p.includes("bold") || p.includes("heroic")) {
    return "It carries itself with bright confidence and likes to face the world head-on.";
  }

  if (p.includes("calm") || p.includes("gentle") || p.includes("kind")) {
    return "It has a calm aura and tends to make every moment feel softer and steadier.";
  }

  if (p.includes("shy") || p.includes("timid")) {
    return "It can be a little cautious at first, but it clearly trusts you more every day.";
  }

  if (p.includes("playful") || p.includes("silly") || p.includes("cheerful")) {
    return "It loves attention, movement, and the kind of fun that turns into instant bonding.";
  }

  if (p.includes("curious") || p.includes("clever") || p.includes("smart")) {
    return "It constantly observes movement, sound, and energy patterns around it. It always seems one step away from discovering something new.";
  }

  if (p.includes("loyal") || p.includes("devoted")) {
    return "It bonds deeply and gives off the feeling that once it chooses you, it means it.";
  }

  if (p.includes("fiery") || p.includes("fierce") || p.includes("wild")) {
    return "It has a strong spark to it and reacts with a lot of emotion, energy, and presence.";
  }

  if (p.includes("lazy") || p.includes("sleepy")) {
    return "It prefers comfort, naps, and taking life at its own weird little pace.";
  }

  return "Its personality is starting to show more clearly, and the bond between you two is shaping who it becomes.";
}

function buildPetDescription(
  pet: PetRecord | null,
  personalityName: string | null,
) {
  if (!pet) {
    return "No active Delta is currently placed. Once you set a pet as active, its details will show here.";
  }

  const label = getPetLabel(pet);
  const stage = titleCase(pet.stage);
  const element = titleCase(pet.element || pet.line || "Null");
  const personality =
    personalityName && personalityName !== "—" ? personalityName : "Mysterious";
  const tone = getPersonalityTone(personalityName);

  return `${label} is a ${stage} ${element} Delta with a ${personality.toLowerCase()} personality. ${tone}`;
}

export default function PetPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [pet, setPet] = useState<PetRecord | null>(null);
  const [stats, setStats] = useState<PetStatsRow | null>(null);
  const [elements, setElements] = useState<PetElementsRow | null>(null);

  const [busy, setBusy] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [personalityName, setPersonalityName] = useState<string | null>(null);

  const hasLoadedOnceRef = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/", { replace: true });
    }
  }, [authLoading, user, navigate]);

  const resolvePersonalityName = useCallback(
    async (nextPet: PetRecord | null) => {
      if (!nextPet) {
        setPersonalityName(null);
        return;
      }

      const direct =
        nextPet.personality_name ||
        nextPet.personality ||
        nextPet.personality_key ||
        null;

      if (direct && String(direct).trim()) {
        setPersonalityName(titleCase(direct));
        return;
      }

      try {
        if (nextPet.personality_id) {
          const { data } = await supabase
            .from("personalities")
            .select("name,key")
            .eq("id", nextPet.personality_id)
            .maybeSingle();

          if (data?.name || data?.key) {
            setPersonalityName(titleCase(data.name || data.key));
            return;
          }
        }

        if (nextPet.personality_key) {
          const { data } = await supabase
            .from("personalities")
            .select("name,key")
            .eq("key", nextPet.personality_key)
            .maybeSingle();

          if (data?.name || data?.key) {
            setPersonalityName(titleCase(data.name || data.key));
            return;
          }
        }
      } catch {
        // ignore personality lookup errors
      }

      setPersonalityName("—");
    },
    [],
  );

  const loadPetPage = useCallback(
    async (showSpinner: boolean) => {
      if (!user) return;

      if (showSpinner) {
        setLoadingPage(true);
      }

      setLoadErr(null);

      try {
        const token = await getAccessTokenSafe();

        if (!token) {
          throw new Error("You are not authenticated.");
        }

        const res = await fetch("/api/care/current", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json = (await res.json().catch(() => null)) as
          | CareCurrentResponse
          | { error?: string }
          | null;

        if (!res.ok) {
          throw new Error(json?.error || "Failed to load pet page.");
        }

        const nextPet = json?.pet ?? null;
        const nextStats = json?.stats ?? null;
        const nextElements = json?.elements ?? null;

        setPet(nextPet);
        setStats(nextStats);
        setElements(nextElements);
        await resolvePersonalityName(nextPet);

        hasLoadedOnceRef.current = true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load pet page.";

        setLoadErr(message);
        setPet(null);
        setStats(null);
        setElements(null);
        setPersonalityName(null);
      } finally {
        setLoadingPage(false);
      }
    },
    [resolvePersonalityName, user],
  );

  useEffect(() => {
    if (authLoading || !user) return;

    void loadPetPage(true);

    const refreshTimer = window.setInterval(() => {
      void loadPetPage(false);
    }, 60_000);

    return () => {
      window.clearInterval(refreshTimer);
    };
  }, [authLoading, user, loadPetPage]);

  const runCareAction = useCallback(
    async (action: CareAction) => {
      if (busy) return;

      setBusy(true);
      setActionMsg(null);

      try {
        const token = await getAccessTokenSafe();

        if (!token) {
          throw new Error("You are not authenticated.");
        }

        const res = await fetch(`/api/care/${action}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const json = (await res.json().catch(() => null)) as {
          message?: string;
          error?: string;
        } | null;

        if (!res.ok) {
          throw new Error(json?.error || `Failed to ${action} your pet.`);
        }

        const defaultMessageMap: Record<CareAction, string> = {
          feed: "Your Delta has been fed.",
          clean: "Your Delta is all cleaned up.",
          play: "Your Delta had a fun play session.",
          pet: "Your Delta looks happier after the extra affection.",
        };

        setActionMsg(json?.message || defaultMessageMap[action]);
        await loadPetPage(false);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : `Failed to ${action} your pet.`;
        setActionMsg(message);
      } finally {
        setBusy(false);
      }
    },
    [busy, loadPetPage],
  );

  const hunger = clampPercent(pet?.hunger);
  const clean = clampPercent(pet?.cleanliness);
  const happy = clampPercent(pet?.happiness);
  const bond = clampPercent(pet?.bond);

  const totalStats = useMemo(() => {
    const hp = safeNum(stats?.hp);
    const atk = safeNum(stats?.atk);
    const def = safeNum(stats?.def);
    const spd = safeNum(stats?.spd);
    const magi = safeNum(stats?.magi);
    const mana = safeNum(stats?.mana);

    return {
      hp,
      atk,
      def,
      spd,
      magi,
      mana,
      total: hp + atk + def + spd + magi + mana,
    };
  }, [stats]);

  const activeElementKey = normalizeElement(pet?.element || pet?.line);

  const elementRows = useMemo(() => {
    const valueMap = ELEMENT_ORDER.map((key) => ({
      key,
      value: safeNum(elements?.[key]),
    }));

    const values = valueMap.map((row) => row.value);
    const maxValue = values.length ? Math.max(...values) : 0;
    const minValue = values.length ? Math.min(...values) : 0;
    const hasRange = maxValue !== minValue;

    return valueMap.map((row) => ({
      key: row.key,
      label: row.key === "null" ? "Null" : titleCase(row.key),
      value: row.value,
      active: row.key === activeElementKey,
      strong: hasRange && row.value === maxValue,
      weak: hasRange && row.value === minValue,
    }));
  }, [elements, activeElementKey]);

  const petDescription = useMemo(() => {
    return buildPetDescription(pet, personalityName);
  }, [pet, personalityName]);

  const userName =
    user?.user_metadata?.username ||
    user?.user_metadata?.full_name ||
    user?.email ||
    "Player";

  if (authLoading || (!hasLoadedOnceRef.current && loadingPage)) {
    return (
      <div className="petRepoPage">
        <div className="petRepoStateCard">Loading Delta Repository…</div>
      </div>
    );
  }

  return (
    <div className="petRepoPage">
      {loadErr ? (
        <div className="petRepoStateCard petRepoStateCardError">
          <h2>Pet page load error</h2>
          <p>{loadErr}</p>
        </div>
      ) : null}

      {!loadErr && !loadingPage && !pet ? (
        <div className="petRepoStateCard">
          <h2>No active pet found</h2>
          <p>Set one active, then come back to the repository.</p>
        </div>
      ) : null}

      {!loadErr && pet ? (
        <section className="petRepoGrid petRepoGrid--threeCol">
          <div className="petRepoLeft">
            <div className="petRepoCreatureCard">
              <div className="petRepoElementBadge">
                {titleCase(pet.element || pet.line || "Null")}
              </div>

              <div className="petRepoPortraitWrap">
                <div className="petRepoPortrait">
                  <div className="petRepoOrb">
                    <span className="petRepoOrbEye petRepoOrbEyeLeft" />
                    <span className="petRepoOrbEye petRepoOrbEyeRight" />
                    <span className="petRepoOrbBeak" />
                  </div>
                </div>
              </div>

              <div className="petRepoBars">
                <MeterRow label="Hunger" value={hunger} tone="blue" />
                <MeterRow label="Clean" value={clean} tone="purple" />
                <MeterRow label="Happy" value={happy} tone="red" />
                <MeterRow label="Bond" value={bond} tone="gold" />
              </div>
            </div>

            <div className="petRepoActionGrid">
              <button
                type="button"
                className="petRepoAction petRepoActionRed"
                onClick={() => void runCareAction("feed")}
                disabled={busy}
              >
                Feed
              </button>

              <button
                type="button"
                className="petRepoAction petRepoActionBlue"
                onClick={() => void runCareAction("clean")}
                disabled={busy}
              >
                Clean
              </button>

              <button
                type="button"
                className="petRepoAction petRepoActionPurple"
                onClick={() => void runCareAction("play")}
                disabled={busy}
              >
                Play
              </button>

              <button
                type="button"
                className="petRepoAction petRepoActionYellow"
                onClick={() => void runCareAction("pet")}
                disabled={busy}
              >
                Pet
              </button>
            </div>

            {actionMsg ? (
              <div className="petRepoInlineMessage">{actionMsg}</div>
            ) : null}

            <div className="petRepoPanel">
              <SectionPill title="Pet Details" />

              <div className="petRepoStatList">
                <InfoRow label="Pet Name" value={pet.name || "—"} />
                <InfoRow label="Nickname" value={pet.nickname || "—"} />
                <InfoRow label="Level" value={String(safeNum(pet.level, 1))} />
                <InfoRow label="Gender" value={titleCase(pet.gender)} />
                <InfoRow
                  label="Element"
                  value={titleCase(pet.element || pet.line || "Null")}
                />
                <InfoRow label="Stage" value={titleCase(pet.stage)} />
                <InfoRow label="Personality" value={personalityName || "—"} />
              </div>
            </div>
          </div>

          <div className="petRepoMiddle">
            <div className="petRepoTitleCard">
              <h1 className="petRepoTitle">Delta Repository</h1>
            </div>

            <div className="petRepoPanel petRepoPanel--tightTop">
              <SectionPill title="Pet Description" />
              <p className="petRepoDescription">
                {pet.description?.trim() || petDescription}
              </p>
            </div>

            <div className="petRepoPanel">
              <SectionPill title="Stats" />

              <div className="petRepoStatList">
                <InfoRow label="HP" value={String(totalStats.hp)} />
                <InfoRow label="ATK" value={String(totalStats.atk)} />
                <InfoRow label="DEF" value={String(totalStats.def)} />
                <InfoRow label="SPD" value={String(totalStats.spd)} />
                <InfoRow label="MAGI" value={String(totalStats.magi)} />
                <InfoRow label="MANA" value={String(totalStats.mana)} />
                <InfoRow
                  label="Total"
                  value={String(totalStats.total)}
                  strong
                />
              </div>
            </div>

            <div className="petRepoPanel">
              <SectionPill title="Element Stats" />

              <div className="petRepoStatList">
                {elementRows.map((row) => {
                  const rowClassNames = ["petRepoInfoRow"];

                  if (row.strong) rowClassNames.push("is-strong-element");
                  if (row.weak) rowClassNames.push("is-weak-element");
                  if (row.active) rowClassNames.push("is-active-element");

                  return (
                    <div key={row.key} className={rowClassNames.join(" ")}>
                      <span>{row.label}</span>
                      <span>{row.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="petRepoRight">
            <div className="petRepoPanel">
              <SectionPill title="User" />

              <div className="petRepoUserHero">
                <div className="petRepoUserName">{userName}</div>
                <div className="petRepoUserMeta">
                  Active caretaker of this Delta
                </div>
              </div>

              <div className="petRepoStatList">
                <InfoRow label="Email" value={user?.email || "—"} />
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SectionPill({ title }: { title: string }) {
  return (
    <div className="petRepoSectionHeader">
      <span className="petRepoSectionLine" />
      <div className="petRepoSectionPill">{title}</div>
      <span className="petRepoSectionLine" />
    </div>
  );
}

function MeterRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "blue" | "purple" | "red" | "gold";
}) {
  return (
    <div className="petRepoMeterRow">
      <div className="petRepoMeterLabel">{label}</div>
      <div className="petRepoMeterTrack" aria-hidden="true">
        <div
          className={`petRepoMeterFill petRepoMeterFill-${tone}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={`petRepoInfoRow ${strong ? "is-strong" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
