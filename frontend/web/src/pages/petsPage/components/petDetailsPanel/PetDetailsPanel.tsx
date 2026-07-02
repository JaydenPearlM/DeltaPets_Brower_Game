import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { safeNum, titleCase } from "@/lib/petUtils";
import DpPopupWindow from "../DpPopupWindow";
import "./PetDetailsPanel.css";
import { getPetDialogue } from "./petDialogue";
import {
  getSelfAwareBubbleText,
  rememberSelfAwareVisit,
} from "../selfAware/selfAware";
// ─── Types ────────────────────────────────────────────────────────────────────

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
  hunger?: number | null;
  clean?: number | null;
  happy?: number | null;
  energy?: number | null;
  bond?: number | null;
  description?: string | null;
  is_active?: boolean | null;
  image_url?: string | null;
  sprite_url?: string | null;
  portrait_url?: string | null;
  hatch_time_alignment?: string | null;
  training_time_preference?: string | null;
  preferred_time?: string | null;
  preferredTime?: string | null;
  created_at?: string | null;
  hatch_ends_at?: string | null;
  hatched_at?: string | null;
  passive_trait_id?: string | null;
  passive_trait_key?: string | null;
  passive_trait_name?: string | null;
  mutation_trait_names?: string[] | null;
  mutations?:
    | string[]
    | {
        name?: string | null;
        key?: string | null;
      }[]
    | null;
};

type MeterTone = "blue" | "purple" | "red" | "green" | "gold";

type StarterMerchantState = {
  show?: boolean;
  href?: string;
  title?: string;
  body?: string;
  ctaLabel?: string;
};

type PetPanelStats = {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  magi: number;
  mana: number;
};

const CARE_MAX = 50;
const ENERGY_MAX = 100;

type PetDetailsPanelProps = {
  pet: PetRecord;
  petDescription?: string;
  stats?: PetPanelStats;
  personalityName: string | null;
  nicknameDraft: string;
  nicknameSaving: boolean;
  showNicknameEditor: boolean;
  canRenameNickname: boolean;
  canSaveNickname: boolean;
  busy: boolean;
  hunger: number;
  clean: number;
  happy: number;
  comfort: number;
  rest: number;
  energy: number;
  bond: number;
  inventoryCounts?: {
    food: number;
    soap: number;
    toy: number;
    bed: number;
  };
  actionMsg: string | null;
  starterMerchant?: StarterMerchantState | null;
  setNicknameDraft: (value: string) => void;
  setShowNicknameEditor: (value: boolean) => void;
  saveNickname: () => Promise<void>;
  runCareAction: (action: "feed" | "clean" | "play" | "pet") => Promise<void>;
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function getPetLabel(pet: PetRecord | null) {
  return pet?.nickname?.trim() || pet?.name?.trim() || "Your Delta";
}

function hasNickname(pet: PetRecord | null) {
  return Boolean(pet?.nickname?.trim());
}

function getNicknameDisplay(pet: PetRecord | null) {
  return hasNickname(pet) ? pet?.nickname?.trim() || "--" : "--";
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

function getDisplayedPassiveTrait(
  pet: Pick<
    PetRecord,
    "passive_trait_name" | "passive_trait_key" | "passive_trait_id"
  > | null,
) {
  const direct =
    pet?.passive_trait_name ??
    pet?.passive_trait_key ??
    pet?.passive_trait_id ??
    null;

  return direct ? titleCase(direct) : "None";
}

function getDisplayedMutationTraits(
  pet: Pick<PetRecord, "mutation_trait_names" | "mutations"> | null,
) {
  const directNames = pet?.mutation_trait_names ?? [];

  const nestedNames =
    pet?.mutations?.map((mutation) => {
      if (typeof mutation === "string") {
        return mutation;
      }

      return mutation.name ?? mutation.key ?? "";
    }) ?? [];

  const names = Array.from(
    new Set([...directNames, ...nestedNames].filter(Boolean)),
  );

  return names.length
    ? names.map((name) => titleCase(name)).join(", ")
    : "None";
}

function getPreviewUrl(pet: PetRecord) {
  return pet.portrait_url || pet.sprite_url || pet.image_url || null;
}

function getDisplayedElement(pet: PetRecord) {
  const value = String(pet.element || pet.line || "").toLowerCase();
  if (!value || value === "null" || value === "null_element")
    return "Voidborne";
  return titleCase(value);
}

function getDayNightLabel(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (normalized === "day" || normalized === "day_pigeon") {
    return "Day Pigeon";
  }

  if (normalized === "night" || normalized === "night_owl") {
    return "Night Owl";
  }

  return null;
}

function getDayNightFromTimestamp(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;

  const hour = date.getHours();
  return hour >= 6 && hour < 18 ? "Day Pigeon" : "Night Owl";
}

function getIsDayNow() {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18;
}

function getStablePreference(pet: PetRecord) {
  const direct =
    getDayNightLabel(pet.hatch_time_alignment) ??
    getDayNightLabel(pet.training_time_preference) ??
    getDayNightLabel(pet.preferred_time) ??
    getDayNightLabel(pet.preferredTime);

  if (direct) return direct;

  const fallback =
    getDayNightFromTimestamp(pet.hatched_at) ??
    getDayNightFromTimestamp(pet.hatch_ends_at) ??
    getDayNightFromTimestamp(pet.created_at);

  return fallback ?? "--";
}

function getPetSpeech({
  hunger,
  clean,
  happy,
  comfort,
  rest,
  energy,
}: {
  hunger: number;
  clean: number;
  happy: number;
  comfort: number;
  rest: number;
  energy: number;
}) {
  const needs = [
    { value: hunger, text: "I'm hungry... can we get food?" },
    { value: clean, text: "I feel gross... I need a clean." },
    { value: happy, text: "I'm kinda bored... play with me?" },
    { value: comfort, text: "I could use some comfort right now." },
    { value: rest, text: "I'm tired... I need rest." },
    { value: energy, text: "I'm low on energy... slow down." },
  ];

  needs.sort((a, b) => a.value - b.value);
  const lowest = needs[0];

  if (lowest.value <= 15) return lowest.text;
  if (lowest.value <= 30) return `Hey... ${lowest.text}`;
  if (lowest.value <= 45) return `I'm okay, but ${lowest.text.toLowerCase()}`;

  return "I'm doing okay right now.";
}

function getRandomPetSpeech(options: {
  hunger: number;
  clean: number;
  happy: number;
  comfort: number;
  rest: number;
  energy: number;
}) {
  const sayings = [
    getPetSpeech(options),
    "Thanks for checking on me.",
    "I'm just vibing in here.",
    "This room feels cozy today.",
  ];

  if (options.hunger <= 25) {
    sayings.push(
      "My tummy is making noises...",
      "Food would be amazing right now.",
    );
  }

  if (options.clean <= 25) {
    sayings.push("I feel kinda messy...", "A bath would help a lot.");
  }

  if (options.happy <= 25) {
    sayings.push("Can we play soon?", "I'm getting a little bored.");
  }

  if (options.comfort <= 25) {
    sayings.push(
      "Can you stay with me for a bit?",
      "I could use some comfort.",
    );
  }

  if (options.rest <= 25) {
    sayings.push("I'm getting sleepy...", "A nap sounds really good.");
  }

  if (options.energy <= 25) {
    sayings.push("I'm low on energy today.", "I need to take it slow.");
  }

  return sayings[Math.floor(Math.random() * sayings.length)];
}

function randomNickname(seedName: string) {
  const starts = [
    "Nova",
    "Mochi",
    "Echo",
    "Rune",
    "Comet",
    "Luma",
    "Nori",
    "Jolt",
    "Miso",
    "Sprig",
    "Pebble",
    "Drift",
    "Orbit",
    "Blitz",
  ];

  const ends = [
    "tail",
    "flare",
    "spark",
    "leaf",
    "wing",
    "fang",
    "step",
    "gleam",
    "drop",
    "shade",
    "burst",
    "whisp",
  ];

  const cleaned = seedName.replace(/\s+/g, "").trim();

  if (cleaned.length >= 3 && Math.random() > 0.45) {
    const suffix = ends[Math.floor(Math.random() * ends.length)];
    return `${cleaned.slice(0, 8)}${suffix}`;
  }

  const first = starts[Math.floor(Math.random() * starts.length)];
  const second = ends[Math.floor(Math.random() * ends.length)];
  return `${first}${second}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function NicknameRow({
  canRenameNickname,
  nicknameSaving,
  busy,
  nicknameIsSet,
  pet,
  setNicknameDraft,
  setShowNicknameEditor,
}: {
  canRenameNickname: boolean;
  nicknameSaving: boolean;
  busy: boolean;
  nicknameIsSet: boolean;
  pet: PetRecord;
  setNicknameDraft: (value: string) => void;
  setShowNicknameEditor: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      className={`petRepoInfoRowButton ${
        canRenameNickname ? "is-clickable" : "is-locked"
      }`}
      onClick={() => {
        if (!canRenameNickname) return;
        setNicknameDraft("");
        setShowNicknameEditor(true);
      }}
      disabled={!canRenameNickname || nicknameSaving || busy}
      title={
        canRenameNickname
          ? "Click to name this pet."
          : "This Delta's nickname is already locked."
      }
    >
      <span className="petRepoInfoRowButtonLabel">
        {!nicknameIsSet ? (
          <span className="petRepoNicknamePulseOrb" aria-hidden="true" />
        ) : null}
        <span>Nickname</span>
      </span>

      <span
        className={
          nicknameIsSet
            ? "petRepoInfoRowButtonValue"
            : "petRepoInfoRowButtonValue petRepoInfoRowButtonValuePrompt"
        }
      >
        {getNicknameDisplay(pet)}
      </span>
    </button>
  );
}

function MeterRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: MeterTone;
}) {
  const clampedValue = Math.max(0, Math.min(CARE_MAX, value));
  const fillWidth = (clampedValue / CARE_MAX) * 100;

  return (
    <div className="petRepoMeterRow">
      <div className="petRepoMeterMeta">
        <span className="petRepoMeterLabel">{label}</span>
        <span className="petRepoMeterValue">{clampedValue}</span>
      </div>

      <div className="petRepoMeterTrack" aria-hidden="true">
        <div
          className={`petRepoMeterFill petRepoMeterFill-${tone}`}
          style={{ width: `${fillWidth}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PetDetailsPanel({
  pet,
  personalityName,
  petDescription,
  nicknameDraft,
  nicknameSaving,
  showNicknameEditor,
  canRenameNickname,
  canSaveNickname,
  busy,
  hunger,
  clean,
  happy,
  comfort,
  rest,
  energy,
  bond,
  inventoryCounts,
  actionMsg,
  starterMerchant,
  setNicknameDraft,
  setShowNicknameEditor,
  saveNickname,
  runCareAction,
}: PetDetailsPanelProps) {
  const previewUrl = getPreviewUrl(pet);
  const elementKey = String(pet.element || pet.line || "null")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  const nicknameIsSet = hasNickname(pet);
  const clampedBond = Math.max(0, Math.min(100, bond));
  const clampedEnergy = Math.max(
    0,
    Math.min(ENERGY_MAX, safeNum(energy, ENERGY_MAX)),
  );

  const hungerLevel = Math.max(
    0,
    Math.min(CARE_MAX, safeNum(hunger, CARE_MAX)),
  );
  const cleanLevel = Math.max(0, Math.min(CARE_MAX, safeNum(clean, CARE_MAX)));
  const moodLevel = Math.max(0, Math.min(CARE_MAX, safeNum(happy, CARE_MAX)));
  const restLevel = Math.max(0, Math.min(CARE_MAX, safeNum(rest, CARE_MAX)));
  const comfortLevel = Math.max(
    0,
    Math.min(CARE_MAX, safeNum(comfort, CARE_MAX)),
  );
  const energyLevel = Math.max(
    0,
    Math.min(ENERGY_MAX, safeNum(energy, ENERGY_MAX)),
  );

  const stablePreference = getStablePreference(pet);
  const [petSpeech, setPetSpeech] = useState("");
  const [showPetSpeech, setShowPetSpeech] = useState(false);

  const speechDataRef = useRef({
    pet,
    personalityName,
    hungerLevel,
    cleanLevel,
    moodLevel,
    comfortLevel,
    restLevel,
    energyLevel,
    clampedBond,
  });

  useEffect(() => {
    speechDataRef.current = {
      pet,
      personalityName,
      hungerLevel,
      cleanLevel,
      moodLevel,
      comfortLevel,
      restLevel,
      energyLevel,
      clampedBond,
    };
  }, [
    pet,
    personalityName,
    hungerLevel,
    cleanLevel,
    moodLevel,
    comfortLevel,
    restLevel,
    energyLevel,
    clampedBond,
  ]);

  const selfAwareMemoryRef = useRef<ReturnType<
    typeof rememberSelfAwareVisit
  > | null>(null);

  useEffect(() => {
    selfAwareMemoryRef.current = rememberSelfAwareVisit(pet?.id ?? null);
  }, [pet?.id]);

  useEffect(() => {
    let showTimer: number | null = null;
    let hideTimer: number | null = null;
    let stopped = false;

    const schedulePetSpeech = () => {
      showTimer = window.setTimeout(
        () => {
          if (stopped) return;

          const current = speechDataRef.current;

          const dialogueText =
            getPetDialogue({
              petName: getPetLabel(current.pet),
              personalityKey:
                current.pet.personality_key ??
                current.pet.personality ??
                current.personalityName,
              hunger: current.hungerLevel,
              clean: current.cleanLevel,
              happy: current.moodLevel,
              comfort: current.comfortLevel,
              rest: current.restLevel,
              energy: current.energyLevel,
              bond: current.clampedBond,
            })?.trim() ?? "";

          const fallbackSpeech =
            dialogueText ||
            getRandomPetSpeech({
              hunger: current.hungerLevel,
              clean: current.cleanLevel,
              happy: current.moodLevel,
              comfort: current.comfortLevel,
              rest: current.restLevel,
              energy: current.energyLevel,
            });

          setPetSpeech(
            getSelfAwareBubbleText({
              pet: current.pet,
              care: {
                hunger: current.hungerLevel,
                clean: current.cleanLevel,
                happy: current.moodLevel,
                comfort: current.comfortLevel,
                rest: current.restLevel,
                energy: current.energyLevel,
                bond: current.clampedBond,
              },
              isDay: getIsDayNow(),
              memory: selfAwareMemoryRef.current,
              fallbackText: fallbackSpeech,
            }),
          );

          setShowPetSpeech(true);

          hideTimer = window.setTimeout(() => {
            if (stopped) return;

            setShowPetSpeech(false);
            schedulePetSpeech();
          }, 90000);
        },
        20000 + Math.random() * 70000,
      );
    };

    schedulePetSpeech();

    return () => {
      stopped = true;

      if (showTimer !== null) {
        window.clearTimeout(showTimer);
      }

      if (hideTimer !== null) {
        window.clearTimeout(hideTimer);
      }
    };
  }, [pet?.id, personalityName]);

  const safeInventory = inventoryCounts ?? {
    food: 0,
    soap: 0,
    toy: 0,
    bed: 0,
  };

  useEffect(() => {
    if (!showNicknameEditor) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !nicknameSaving) {
        setShowNicknameEditor(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showNicknameEditor, nicknameSaving, setShowNicknameEditor]);

  const nicknameModal =
    showNicknameEditor && canRenameNickname ? (
      <DpPopupWindow
        open
        onClose={() => {
          if (nicknameSaving) return;
          setShowNicknameEditor(false);
        }}
        label="Name Your New Pet"
        size="compact"
        contentClassName="petRepoNicknamePopupContent"
      >
        <button
          type="button"
          className="petRepoNicknameModalClose"
          onClick={() => setShowNicknameEditor(false)}
          disabled={nicknameSaving}
          aria-label="Close nickname window"
        >
          ×
        </button>

        <div className="petRepoNicknameModalHeader">
          <h3 id="pet-nickname-title" className="petRepoNicknameModalTitle">
            Name Your New Pet!
          </h3>
          <p className="petRepoNicknameModalCopy">
            Create your nickname here. You can type your own or roll a random
            one.
          </p>
          <p className="petRepoNicknameModalCopy petRepoNicknameModalCopySmall">
            Once saved, it cannot be changed again.
          </p>
        </div>

        <div className="petRepoNicknameModalBody">
          <label htmlFor="pet-nickname" className="petRepoInputLabel">
            Nickname
          </label>

          <input
            id="pet-nickname"
            className="petRepoInput petRepoInputModal"
            type="text"
            maxLength={32}
            value={nicknameDraft}
            onChange={(event) => setNicknameDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && canSaveNickname) {
                event.preventDefault();
                void saveNickname();
              }
            }}
            placeholder="Enter a nickname"
            autoFocus
          />

          <div className="petRepoNicknameModalActions">
            <button
              type="button"
              className="petRepoNicknameModalSecondary"
              onClick={() =>
                setNicknameDraft(randomNickname(pet?.name?.trim() || "Delta"))
              }
              disabled={nicknameSaving}
            >
              Random Name
            </button>

            <button
              type="button"
              className="petRepoNicknameModalPrimary"
              onClick={() => void saveNickname()}
              disabled={!canSaveNickname}
            >
              {nicknameSaving ? "Saving..." : "Save Nickname"}
            </button>
          </div>
        </div>
      </DpPopupWindow>
    ) : null;

  return (
    <>
      {nicknameModal}

      <article className={`petRepoCareCard petRepoElement-${elementKey}`}>
        <div className="petRepoDetailsHeaderBlock">
          <h3 className="petRepoDeltaDetailsTitle">Kith Details</h3>

          <div className="petRepoBondPanel" aria-label="Bond level">
            <span className="petRepoBondTitle">Bond</span>

            <div className="petRepoBondTrack">
              <div
                className="petRepoBondFill"
                style={{ width: `${clampedBond}%` }}
              />
            </div>
          </div>
        </div>

        <section className="petRepoDetailsTopPanel">
          {petDescription ? (
            <div className="petRepoDetailsTopPanelBody">
              <p className="petRepoDetailsTopPanelText">{petDescription}</p>
            </div>
          ) : null}
        </section>

        <div className="petRepoCreatureTop">
          <section
            className="petRepoVerticalCard"
            aria-label="Pet scene and details"
          >
            <div
              className={`petRepoSceneOrb petRepoSceneOrb--${elementKey}`}
              style={
                {
                  ["--bond" as string]: String(clampedBond),
                  ["--energy" as string]: String(clampedEnergy),
                } as React.CSSProperties
              }
            >
              <div
                className="petRepoSceneRing petRepoSceneRing--bond"
                aria-hidden="true"
              />
              <div
                className="petRepoSceneRing petRepoSceneRing--energy"
                aria-hidden="true"
              />

              <div
                className="petRepoSupplyShelf"
                aria-label="Care item shelves"
              >
                <div className="petRepoSupplySlot" />
                <div className="petRepoSupplySlot" />
                <div className="petRepoSupplySlot" />
                <div className="petRepoSupplySlot" />
                <p className="petRepoSupplyShelfHint">Care Items go here</p>
              </div>

              <div className="petRepoSceneInner">
                <div className="petRepoSceneCeiling" aria-hidden="true" />
                <div className="petRepoSceneWallLeft" aria-hidden="true" />
                <div className="petRepoSceneWallRight" aria-hidden="true" />
                <div className="petRepoSceneGlow" aria-hidden="true" />
                <div className="petRepoSceneSparkles" aria-hidden="true">
                  <span className="petRepoSceneSparkle petRepoSceneSparkle-1" />
                  <span className="petRepoSceneSparkle petRepoSceneSparkle-2" />
                  <span className="petRepoSceneSparkle petRepoSceneSparkle-3" />
                  <span className="petRepoSceneSparkle petRepoSceneSparkle-4" />
                </div>

                <div className="petRepoScenePet">
                  {previewUrl ? (
                    <img
                      className="petRepoScenePetImage"
                      src={previewUrl}
                      alt={getPetLabel(pet)}
                    />
                  ) : (
                    <div
                      className="petRepoCreatureCore petRepoCreatureCore--scene"
                      aria-label="Pet placeholder"
                    >
                      <span className="petRepoCreatureEye petRepoCreatureEyeLeft" />
                      <span className="petRepoCreatureEye petRepoCreatureEyeRight" />
                      <span className="petRepoCreatureSmile" />
                    </div>
                  )}
                </div>

                <div className="petRepoScenePlatformWrap" aria-hidden="true">
                  <div className="petRepoScenePlatformOuter" />
                  <div className="petRepoScenePlatformInner" />
                </div>
              </div>
            </div>

            {showPetSpeech && petSpeech ? (
              <div className="petRepoTalkBubble" aria-live="polite">
                <p>{petSpeech}</p>
              </div>
            ) : null}
            <div className="petRepoFarmButtonWrap">
              <Link to="/farm" className="btn btn-gold">
                Farm
              </Link>
            </div>
            <div className="petRepoEnergyPanel" aria-label="Energy level">
              <span className="petRepoEnergyTitle">Energy</span>

              <div className="petRepoEnergyTrack">
                <div
                  className="petRepoEnergyFill"
                  style={{ width: `${clampedEnergy}%` }}
                />
              </div>
            </div>

            <div className="petRepoVerticalInfo">
              <div className="petRepoStatStack">
                <InfoRow label="Species" value={pet.name || "--"} strong />
                <NicknameRow
                  canRenameNickname={canRenameNickname}
                  nicknameSaving={nicknameSaving}
                  busy={busy}
                  nicknameIsSet={nicknameIsSet}
                  pet={pet}
                  setNicknameDraft={setNicknameDraft}
                  setShowNicknameEditor={setShowNicknameEditor}
                />
                <InfoRow label="Level" value={String(safeNum(pet.level, 1))} />
                <InfoRow label="Gender" value={titleCase(pet.gender) || "--"} />
                <InfoRow label="Element" value={getDisplayedElement(pet)} />
                <InfoRow label="Stage" value={titleCase(pet.stage) || "--"} />
                <InfoRow label="Day or Night" value={stablePreference} />
                <InfoRow
                  label="Trait"
                  value={getDisplayedPersonality(pet, personalityName)}
                />
                <InfoRow
                  label="Passive Trait"
                  value={getDisplayedPassiveTrait(pet)}
                />
                <InfoRow
                  label="Mutation Trait"
                  value={getDisplayedMutationTraits(pet)}
                />
              </div>
            </div>
          </section>
        </div>

        <section className="petRepoCareStatusPanel" aria-label="Care status">
          <div className="petRepoCareStatusHeader">
            <strong className="petRepoCareStatusTitle">Care Status</strong>
          </div>

          <div className="petRepoBars">
            <MeterRow label="Hunger" value={hungerLevel} tone="blue" />
            <MeterRow label="Clean" value={cleanLevel} tone="purple" />
            <MeterRow label="Mood" value={moodLevel} tone="red" />
            <MeterRow label="Rest" value={restLevel} tone="green" />
            <MeterRow label="Comfort" value={comfortLevel} tone="gold" />
          </div>

          <div className="petRepoActionGrid">
            <button
              type="button"
              className="petRepoAction petRepoActionBlue"
              onClick={() => void runCareAction("feed")}
              disabled={busy || nicknameSaving || safeInventory.food <= 0}
            >
              Feed {safeInventory.food > 0 ? `· ${safeInventory.food}` : ""}
            </button>

            <button
              type="button"
              className="petRepoAction petRepoActionPurple"
              onClick={() => void runCareAction("clean")}
              disabled={busy || nicknameSaving || safeInventory.soap <= 0}
            >
              Clean {safeInventory.soap > 0 ? `· ${safeInventory.soap}` : ""}
            </button>

            <button
              type="button"
              className="petRepoAction petRepoActionRed"
              onClick={() => void runCareAction("play")}
              disabled={busy || nicknameSaving || safeInventory.toy <= 0}
            >
              Play {safeInventory.toy > 0 ? `· ${safeInventory.toy}` : ""}
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

          <div className="petRepoCareActionMessageSlot" aria-live="polite">
            {actionMsg ? (
              <div className="petRepoInlineMessage">{actionMsg}</div>
            ) : null}
          </div>
        </section>

        {starterMerchant?.show ? (
          <div className="petRepoRunawayBanner" role="alert">
            <div className="petRepoRunawayBanner__eyebrow">
              Emergency Access
            </div>
            <h3 className="petRepoRunawayBanner__title">
              {starterMerchant.title || "Pet Ran Away"}
            </h3>
            <p className="petRepoRunawayBanner__body">
              {starterMerchant.body ||
                "All of your Kith are gone. A quiet merchant has opened inside Kithna's tutorial market with lower-tier starter rescues so you can rebuild."}
            </p>

            <a
              className="petRepoRunawayBanner__cta"
              href={starterMerchant.href || "/hatchery"}
            >
              {starterMerchant.ctaLabel || "Visit the Kithna Merchant"}
            </a>
          </div>
        ) : null}
      </article>
    </>
  );
}
