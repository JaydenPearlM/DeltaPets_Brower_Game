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
  is_active?: boolean | null;

  image_url?: string | null;
  sprite_url?: string | null;
  portrait_url?: string | null;
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

type PartySlotRow = {
  id?: string;
  user_id?: string;
  pet_id?: string | null;
  slot_index?: number | null;
};

type TeamCardPet = {
  id: string;
  slotIndex: number;
  species: string;
  nickname: string;
  stage: string;
  stageKey: string;
  element: string;
  elementKey: string;
  level: number;
  hunger: number;
  cleanliness: number;
  happiness: number;
  bond: number;
  isActive: boolean;
  previewUrl: string | null;
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

function normalizeStage(value: string | null | undefined) {
  if (!value) return "unknown";
  return String(value).trim().toLowerCase().replace(/\s+/g, "_");
}

function getPreviewUrl(pet: PetRecord) {
  return pet.portrait_url || pet.sprite_url || pet.image_url || null;
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

function getCareState(values: {
  hunger: number;
  clean: number;
  happy: number;
  bond: number;
}) {
  const { hunger, clean, happy, bond } = values;
  const avg = (hunger + clean + happy + bond) / 4;

  if (hunger < 35) {
    return {
      title: "Needs Feeding",
      text: "Energy is dropping. Feeding keeps your Delta stable for training and daily care cycles.",
    };
  }

  if (clean < 35) {
    return {
      title: "Needs Cleaning",
      text: "A messy Delta gets uncomfortable fast. Care matters because upkeep supports long-term condition, not just vibes.",
    };
  }

  if (happy < 35) {
    return {
      title: "Needs Attention",
      text: "Mood is low. Play and affection help restore comfort and improve the room’s overall care state.",
    };
  }

  if (bond < 35) {
    return {
      title: "Bond Is Weak",
      text: "Bond is still building. Bond does not force evolution, but it should matter for trust-based systems later.",
    };
  }

  if (avg >= 85) {
    return {
      title: "Excellent Condition",
      text: "Your Delta is thriving. This is the kind of care state you want before harder content and later progression systems.",
    };
  }

  if (avg >= 65) {
    return {
      title: "Stable Condition",
      text: "Your Delta is doing well. Keep the room maintained so one neglected meter doesn’t drag the rest down.",
    };
  }

  return {
    title: "Needs Maintenance",
    text: "Your Delta is okay, but not comfortable. A real care room should reward consistency, not spam clicking.",
  };
}

export default function PetPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [pet, setPet] = useState<PetRecord | null>(null);
  const [stats, setStats] = useState<PetStatsRow | null>(null);
  const [elements, setElements] = useState<PetElementsRow | null>(null);
  const [team, setTeam] = useState<TeamCardPet[]>([]);

  const [busy, setBusy] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [personalityName, setPersonalityName] = useState<string | null>(null);

  const [nicknameDraft, setNicknameDraft] = useState("");
  const [nicknameSaving, setNicknameSaving] = useState(false);

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
        // ignore lookup errors
      }

      setPersonalityName("—");
    },
    [],
  );

  const loadPartyTeam = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data: slotRows, error: slotError } = await supabase
        .from("party_slots")
        .select("pet_id,slot_index")
        .eq("user_id", user.id)
        .order("slot_index", { ascending: true });

      if (slotError) {
        throw new Error(slotError.message);
      }

      const normalizedSlots = ((slotRows ?? []) as PartySlotRow[])
        .filter((row) => row.pet_id && safeNum(row.slot_index) >= 1)
        .sort((a, b) => safeNum(a.slot_index) - safeNum(b.slot_index))
        .slice(0, 4);

      const petIds = normalizedSlots
        .map((row) => row.pet_id)
        .filter((value): value is string => Boolean(value));

      if (!petIds.length) {
        setTeam([]);
        return;
      }

      const { data: petRows, error: petsError } = await supabase
        .from("pets")
        .select(
          "id,name,nickname,stage,element,line,level,hunger,cleanliness,happiness,bond,is_active,image_url,sprite_url,portrait_url",
        )
        .in("id", petIds);

      if (petsError) {
        throw new Error(petsError.message);
      }

      const petMap = new Map<string, PetRecord>(
        ((petRows ?? []) as PetRecord[]).map((row) => [String(row.id), row]),
      );

      const nextTeam: TeamCardPet[] = normalizedSlots
        .map((slot) => {
          const source = petMap.get(String(slot.pet_id));

          if (!source?.id) return null;

          return {
            id: String(source.id),
            slotIndex: safeNum(slot.slot_index),
            species: source.name?.trim() || "Unknown Delta",
            nickname:
              source.nickname?.trim() || source.name?.trim() || "Unnamed Delta",
            stage: titleCase(source.stage),
            stageKey: normalizeStage(source.stage),
            element: titleCase(source.element || source.line || "Null"),
            elementKey: normalizeElement(source.element || source.line),
            level: safeNum(source.level, 1),
            hunger: clampPercent(source.hunger),
            cleanliness: clampPercent(source.cleanliness),
            happiness: clampPercent(source.happiness),
            bond: clampPercent(source.bond),
            isActive: Boolean(source.is_active),
            previewUrl: getPreviewUrl(source),
          };
        })
        .filter((row): row is TeamCardPet => Boolean(row));

      setTeam(nextTeam);
    } catch {
      setTeam([]);
    }
  }, [user?.id]);

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
        setNicknameDraft(nextPet?.nickname?.trim() || "");
        await resolvePersonalityName(nextPet);
        await loadPartyTeam();

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
    [loadPartyTeam, resolvePersonalityName, user],
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

  const switchActivePet = useCallback(
    async (petId: string) => {
      if (!petId || busy || nicknameSaving) return;

      setBusy(true);
      setActionMsg(null);

      try {
        const token = await getAccessTokenSafe();

        if (!token) {
          throw new Error("You are not authenticated.");
        }

        const res = await fetch("/api/care/place", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ petId }),
        });

        const json = (await res.json().catch(() => null)) as {
          success?: boolean;
          error?: string;
        } | null;

        if (!res.ok) {
          throw new Error(json?.error || "Failed to switch active Delta.");
        }

        setActionMsg("Active Delta switched.");
        await loadPetPage(false);
      } catch (error) {
        setActionMsg(
          error instanceof Error
            ? error.message
            : "Failed to switch active Delta.",
        );
      } finally {
        setBusy(false);
      }
    },
    [busy, loadPetPage, nicknameSaving],
  );

  const saveNickname = useCallback(async () => {
    if (!user?.id || !pet?.id) return;

    const trimmed = nicknameDraft.trim();

    setNicknameSaving(true);
    setActionMsg(null);

    try {
      const { error } = await supabase
        .from("pets")
        .update({ nickname: trimmed || null })
        .eq("id", pet.id)
        .eq("user_id", user.id);

      if (error) {
        throw new Error(error.message);
      }

      setActionMsg(
        trimmed
          ? `Nickname updated to ${trimmed}.`
          : "Nickname cleared. Species name will display instead.",
      );

      await loadPetPage(false);
    } catch (error) {
      setActionMsg(
        error instanceof Error ? error.message : "Failed to save nickname.",
      );
    } finally {
      setNicknameSaving(false);
    }
  }, [loadPetPage, nicknameDraft, pet?.id, user?.id]);

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

  const careState = useMemo(() => {
    return getCareState({ hunger, clean, happy, bond });
  }, [hunger, clean, happy, bond]);

  if (authLoading || (!hasLoadedOnceRef.current && loadingPage)) {
    return (
      <div className="petRepoPage">
        <div className="petRepoStateCard">Loading Delta Room…</div>
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
          <p>Put one of your Deltas into the main team, then come back here.</p>
        </div>
      ) : null}

      {!loadErr && pet ? (
        <section className="petRepoStage">
          <header className="petRepoHeroCard">
            <div className="petRepoHeroText">
              <h1 className="petRepoTitle">Delta Care Chamber</h1>
              <p className="petRepoSubtitle">
                Care is part of progression, but it does not force evolution.
                This room is for upkeep, trust, and keeping your main team in
                real condition.
              </p>
            </div>

            <div className="petRepoHeroStatus">
              <span className="petRepoStatusLabel">Current Focus</span>
              <strong>{getPetLabel(pet)}</strong>
              <span>{titleCase(pet.stage)}</span>
            </div>
          </header>

          <section className="petRepoTeamPanel">
            <SectionPill title="Main Team" />

            <div className="petRepoTeamGrid">
              {team.length ? (
                team.map((teamPet) => (
                  <button
                    key={teamPet.id}
                    type="button"
                    className={`petRepoTeamCard ${teamPet.isActive ? "is-active" : ""} ${teamPet.slotIndex === 1 ? "is-primary-slot" : ""}`}
                    onClick={() => void switchActivePet(teamPet.id)}
                    disabled={busy || nicknameSaving}
                  >
                    <div className="petRepoTeamSlot">
                      Slot {teamPet.slotIndex}
                    </div>

                    <div className="petRepoTeamCardBody">
                      <div className="petRepoTeamPreview">
                        {teamPet.previewUrl ? (
                          <img
                            className="petRepoTeamPreviewImage"
                            src={teamPet.previewUrl}
                            alt={teamPet.nickname}
                          />
                        ) : (
                          <div
                            className={`petRepoTeamCreature petRepoTeamCreature--${teamPet.elementKey} petRepoTeamCreatureStage--${teamPet.stageKey}`}
                            aria-hidden="true"
                          >
                            <span className="petRepoTeamCreatureEye petRepoTeamCreatureEyeLeft" />
                            <span className="petRepoTeamCreatureEye petRepoTeamCreatureEyeRight" />
                            <span className="petRepoTeamCreatureBeak" />
                          </div>
                        )}
                      </div>

                      <div className="petRepoTeamText">
                        <div className="petRepoTeamName">
                          {teamPet.nickname}
                        </div>
                        <div className="petRepoTeamMeta">
                          {teamPet.species} · Lv {teamPet.level}
                        </div>
                        <div className="petRepoTeamMeta">{teamPet.stage}</div>
                      </div>
                    </div>

                    <div className="petRepoMiniMeters">
                      <MiniMeter label="H" value={teamPet.hunger} />
                      <MiniMeter label="C" value={teamPet.cleanliness} />
                      <MiniMeter label="M" value={teamPet.happiness} />
                      <MiniMeter label="B" value={teamPet.bond} />
                    </div>

                    <span className="petRepoTeamAction">
                      {teamPet.isActive ? "Viewing" : "Switch"}
                    </span>
                  </button>
                ))
              ) : (
                <div className="petRepoEmptyTeam">
                  No main team Deltas found yet. Put up to 4 in party slots and
                  they’ll show here.
                </div>
              )}
            </div>
          </section>

          <section className="petRepoMainGrid">
            <div className="petRepoLeftColumn">
              <article className="petRepoCareCard">
                <div className="petRepoCreatureStageBadge">
                  {titleCase(pet.stage)}
                </div>

                <div className="petRepoCreatureTop">
                  <div className="petRepoCreatureArt">
                    <div className="petRepoCreatureBackGlow" />
                    <div className="petRepoCreatureFrame">
                      <div className="petRepoCreatureCore">
                        <span className="petRepoCreatureEye petRepoCreatureEyeLeft" />
                        <span className="petRepoCreatureEye petRepoCreatureEyeRight" />
                        <span className="petRepoCreatureBeak" />
                      </div>
                    </div>
                  </div>

                  <div className="petRepoCreatureInfo">
                    <div className="petRepoIdentityBlock">
                      <div className="petRepoIdentityName">
                        {getPetLabel(pet)}
                      </div>
                      <div className="petRepoIdentityMeta">
                        {pet.name || "Unknown Species"}
                      </div>
                      <div className="petRepoIdentityTags">
                        <span>
                          {titleCase(pet.element || pet.line || "Null")}
                        </span>
                        <span>Lv {safeNum(pet.level, 1)}</span>
                        <span>{personalityName || "—"}</span>
                      </div>
                    </div>

                    <div className="petRepoCareStatusCard">
                      <div className="petRepoCareStatusTitle">
                        {careState.title}
                      </div>
                      <p>{careState.text}</p>
                    </div>
                  </div>
                </div>

                <div className="petRepoBars">
                  <MeterRow label="Hunger" value={hunger} tone="blue" />
                  <MeterRow label="Clean" value={clean} tone="purple" />
                  <MeterRow label="Happy" value={happy} tone="red" />
                  <MeterRow label="Bond" value={bond} tone="gold" />
                </div>

                <div className="petRepoActionGrid">
                  <button
                    type="button"
                    className="petRepoAction petRepoActionBlue"
                    onClick={() => void runCareAction("feed")}
                    disabled={busy || nicknameSaving}
                  >
                    Feed
                  </button>

                  <button
                    type="button"
                    className="petRepoAction petRepoActionPurple"
                    onClick={() => void runCareAction("clean")}
                    disabled={busy || nicknameSaving}
                  >
                    Clean
                  </button>

                  <button
                    type="button"
                    className="petRepoAction petRepoActionRed"
                    onClick={() => void runCareAction("play")}
                    disabled={busy || nicknameSaving}
                  >
                    Play
                  </button>

                  <button
                    type="button"
                    className="petRepoAction petRepoActionYellow"
                    onClick={() => void runCareAction("pet")}
                    disabled={busy || nicknameSaving}
                  >
                    Pet
                  </button>
                </div>

                {actionMsg ? (
                  <div className="petRepoInlineMessage">{actionMsg}</div>
                ) : null}
              </article>

              <article className="petRepoPanel petRepoPanel--careNotes">
                <SectionPill title="Care Room Purpose" />
                <div className="petRepoCareNotes">
                  <div className="petRepoCareNote">
                    <strong>Upkeep matters.</strong>
                    <span>
                      Feeding and cleaning should support long-term readiness,
                      not become a cheap evolution trigger.
                    </span>
                  </div>
                  <div className="petRepoCareNote">
                    <strong>Main team focus.</strong>
                    <span>
                      The active Delta is the one you see here, and you can swap
                      between your 4 main companions above.
                    </span>
                  </div>
                  <div className="petRepoCareNote">
                    <strong>Future-proofed.</strong>
                    <span>
                      This layout is ready for later systems like trust checks,
                      training readiness, events, or room bonuses.
                    </span>
                  </div>
                </div>
              </article>
            </div>

            <div className="petRepoRightColumn">
              <div className="petRepoInfoStack">
                <article className="petRepoPanel">
                  <SectionPill title="Pet Details" />

                  <div className="petRepoNicknameEditor">
                    <label htmlFor="pet-nickname" className="petRepoInputLabel">
                      Nickname
                    </label>

                    <div className="petRepoNicknameRow">
                      <input
                        id="pet-nickname"
                        className="petRepoInput"
                        type="text"
                        maxLength={32}
                        value={nicknameDraft}
                        onChange={(event) =>
                          setNicknameDraft(event.target.value)
                        }
                        placeholder="Give your Delta a nickname"
                      />

                      <button
                        type="button"
                        className="petRepoSaveNickname"
                        onClick={() => void saveNickname()}
                        disabled={nicknameSaving || busy}
                      >
                        {nicknameSaving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>

                  <div className="petRepoStatList">
                    <InfoRow label="Species" value={pet.name || "—"} />
                    <InfoRow label="Current Name" value={getPetLabel(pet)} />
                    <InfoRow
                      label="Level"
                      value={String(safeNum(pet.level, 1))}
                    />
                    <InfoRow label="Gender" value={titleCase(pet.gender)} />
                    <InfoRow
                      label="Element"
                      value={titleCase(pet.element || pet.line || "Null")}
                    />
                    <InfoRow label="Stage" value={titleCase(pet.stage)} />
                    <InfoRow
                      label="Personality"
                      value={personalityName || "—"}
                    />
                  </div>
                </article>

                <article className="petRepoPanel">
                  <SectionPill title="Pet Description" />
                  <p className="petRepoDescription">
                    {pet.description?.trim() || petDescription}
                  </p>
                </article>

                <div className="petRepoDataTwoCol">
                  <article className="petRepoPanel">
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
                  </article>

                  <article className="petRepoPanel">
                    <SectionPill title="Element Stats" />
                    <div className="petRepoStatList">
                      {elementRows.map((row) => {
                        const rowClassNames = ["petRepoInfoRow"];

                        if (row.strong) rowClassNames.push("is-strong-element");
                        if (row.weak) rowClassNames.push("is-weak-element");
                        if (row.active) rowClassNames.push("is-active-element");

                        return (
                          <div
                            key={row.key}
                            className={rowClassNames.join(" ")}
                          >
                            <span>{row.label}</span>
                            <span>{row.value}</span>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                </div>
              </div>
            </div>
          </section>
        </section>
      ) : null}
    </div>
  );
}

function SectionPill({ title }: { title: string }) {
  return (
    <div className="petRepoSectionHeader">
      <div className="petRepoSectionLine" />
      <div className="petRepoSectionPill">{title}</div>
      <div className="petRepoSectionLine" />
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
      <div className="petRepoMeterMeta">
        <span className="petRepoMeterLabel">{label}</span>
        <span className="petRepoMeterValue">{value}</span>
      </div>
      <div className="petRepoMeterTrack" aria-hidden="true">
        <div
          className={`petRepoMeterFill petRepoMeterFill-${tone}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function MiniMeter({ label, value }: { label: string; value: number }) {
  return (
    <div className="petRepoMiniMeter">
      <span>{label}</span>
      <div className="petRepoMiniMeterTrack">
        <div className="petRepoMiniMeterFill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
