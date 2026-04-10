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
  pet?: PetRecord | null;
  stats?: PetStatsRow | null;
  total_points?: number | null;
  hp_display?: number | null;
  elements?: PetElementsRow | null;
  team?: TeamCardPet[];
  error?: string;
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
  personality: string;
  level: number;
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

function getDisplayedPersonality(
  pet: Pick<
    PetRecord,
    "personality_name" | "personality" | "personality_key"
  > | null,
  personalityName?: string | null,
) {
  const direct =
    personalityName ??
    pet?.personality_name ??
    pet?.personality ??
    pet?.personality_key ??
    null;

  return direct ? titleCase(direct) : "Mysterious";
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

        const json = (await res
          .json()
          .catch(() => ({}))) as CareCurrentResponse;

        if (!res.ok) {
          throw new Error(json.error || "Failed to load pet page.");
        }

        const nextPet = json.pet ?? null;
        const nextStats = json.stats ?? null;
        const nextElements = json.elements ?? null;
        const nextTeam = json.team ?? [];

        setPet(nextPet);
        setStats(nextStats);
        setElements(nextElements);
        setTeam(nextTeam);
        setNicknameDraft(nextPet?.nickname?.trim() || "");

        const directPersonality =
          nextPet?.personality_name ??
          nextPet?.personality ??
          nextPet?.personality_key ??
          null;

        setPersonalityName(
          directPersonality ? titleCase(directPersonality) : null,
        );

        hasLoadedOnceRef.current = true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load pet page.";

        setLoadErr(message);
        setPet(null);
        setStats(null);
        setElements(null);
        setTeam([]);
        setPersonalityName(null);
      } finally {
        setLoadingPage(false);
      }
    },
    [user],
  );

  useEffect(() => {
    if (authLoading || !user) return;

    void loadPetPage(true);

    const handleWindowFocus = () => {
      void loadPetPage(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadPetPage(false);
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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

  const hasMultipleTeamPets = team.filter((entry) => entry?.id).length > 1;
  const nicknameLocked = Boolean(pet?.nickname?.trim());
  const canSaveNickname =
    !busy &&
    !nicknameSaving &&
    (!nicknameLocked || nicknameDraft.trim() === (pet?.nickname?.trim() || ""));

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
            <div className="petRepoHeroStatus petRepoHeroStatus--focusLeft">
              <span className="petRepoStatusLabel">Current Focus</span>
              <strong>{getPetLabel(pet)}</strong>
              <span>{titleCase(pet.stage)}</span>
            </div>

            <div className="petRepoHeroText petRepoHeroTextShifted">
              <h1 className="petRepoTitle">Delta Care Chamber</h1>
              <p className="petRepoSubtitle petRepoSubtitle--centered">
                Care is part of progression, but it does not force evolution.
                This room is for upkeep, trust, and keeping your main team in
                real condition.
              </p>
            </div>
          </header>

          <section className="petRepoTeamPanel">
            <div className="petRepoTeamPanelHeader petRepoTeamPanelHeader--centered">
              <div className="petRepoSectionLine" />
              <h2 className="petRepoTeamPanelTitle">Main Team</h2>
              <p className="petRepoTeamPanelCopy petRepoTeamPanelCopy--centered">
                Your care room follows the 4-slot main team. Click any team pet
                here to switch the Care panel focus.
              </p>
              <div className="petRepoSectionLine" />
            </div>

            <div className="petRepoTeamGrid">
              {Array.from({ length: 4 }, (_, index) => {
                const teamPet = team[index] ?? null;

                if (!teamPet) {
                  return (
                    <div
                      key={`empty-slot-${index + 1}`}
                      className="petRepoTeamCard petRepoTeamCard--empty"
                    >
                      <div className="petRepoTeamEmptyOnly">No Pet Yet</div>
                    </div>
                  );
                }

                const teamDisplayName =
                  teamPet.nickname?.trim() || teamPet.species;

                return (
                  <button
                    key={teamPet.id}
                    type="button"
                    className={`petRepoTeamCard ${teamPet.isActive ? "is-active" : ""}`}
                    onClick={() => void switchActivePet(teamPet.id)}
                    disabled={busy || nicknameSaving}
                  >
                    <div className="petRepoTeamInfoTop">
                      <div className="petRepoTeamInfoLine">
                        <span className="petRepoTeamInfoName">
                          {teamDisplayName}
                        </span>
                        <span className="petRepoTeamInfoDot">•</span>
                        <span>Lv {teamPet.level}</span>
                        <span className="petRepoTeamInfoDot">•</span>
                        <span>{teamPet.personality || "Mysterious"}</span>
                        <span className="petRepoTeamInfoDot">•</span>
                        <span>{teamPet.element}</span>
                      </div>
                    </div>

                    <div className="petRepoTeamCardBody petRepoTeamCardBody--stacked">
                      <div className="petRepoTeamPreview petRepoTeamPreview--large">
                        {teamPet.previewUrl && team.length > 1 ? (
                          <img
                            className="petRepoTeamPreviewImage petRepoTeamPreviewImage--large"
                            src={teamPet.previewUrl}
                            alt={teamDisplayName}
                          />
                        ) : (
                          <div
                            className={`petRepoTeamCreature petRepoTeamCreature--${teamPet.elementKey} petRepoTeamCreatureStage--${teamPet.stageKey} petRepoTeamCreature--large`}
                            aria-hidden="true"
                          >
                            <span className="petRepoTeamCreatureEye petRepoTeamCreatureEyeLeft" />
                            <span className="petRepoTeamCreatureEye petRepoTeamCreatureEyeRight" />
                            <span className="petRepoTeamCreatureBeak" />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
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
                      {getPreviewUrl(pet) ? (
                        <img
                          className="petRepoCreatureFrameImage"
                          src={getPreviewUrl(pet) ?? undefined}
                          alt={getPetLabel(pet)}
                        />
                      ) : (
                        <div className="petRepoCreatureCore">
                          <span className="petRepoCreatureEye petRepoCreatureEyeLeft" />
                          <span className="petRepoCreatureEye petRepoCreatureEyeRight" />
                          <span className="petRepoCreatureBeak" />
                        </div>
                      )}
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
                        <span>
                          {getDisplayedPersonality(pet, personalityName)}
                        </span>
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
                        disabled={nicknameLocked}
                      />

                      <button
                        type="button"
                        className="petRepoSaveNickname"
                        onClick={() => void saveNickname()}
                        disabled={!canSaveNickname}
                        title={
                          nicknameLocked
                            ? "Nickname already set once."
                            : undefined
                        }
                      >
                        {nicknameSaving
                          ? "Saving..."
                          : nicknameLocked
                            ? "Locked"
                            : "Save"}
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
                      value={getDisplayedPersonality(pet, personalityName)}
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
