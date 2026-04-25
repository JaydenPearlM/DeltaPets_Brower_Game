import { useEffect } from "react";
import { createPortal } from "react-dom";
import { safeNum, titleCase } from "@/lib/petUtils";
import "./PetDetailsPanel.css";

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
  cleanliness?: number | null;
  happiness?: number | null;
  energy?: number | null;
  bond?: number | null;
  description?: string | null;
  is_active?: boolean | null;
  image_url?: string | null;
  sprite_url?: string | null;
  portrait_url?: string | null;
  hatch_time_alignment?: string | null;
};

type MeterTone = "blue" | "purple" | "red" | "green" | "gold";

type StarterMerchantState = {
  show: boolean;
  href: string;
  title: string;
  body: string;
  ctaLabel: string;
};

const CARE_MAX = 50;

type PetDetailsPanelProps = {
  pet: PetRecord;
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

function getPreviewUrl(pet: PetRecord) {
  return pet.portrait_url || pet.sprite_url || pet.image_url || null;
}

function getDisplayedElement(pet: PetRecord) {
  const value = String(pet.element || pet.line || "").toLowerCase();
  if (!value || value === "null" || value === "null_element")
    return "Voidborne";
  return titleCase(value);
}

function getStablePreference(pet: PetRecord) {
  const alignment = String(pet.hatch_time_alignment ?? "")
    .trim()
    .toLowerCase();

  if (alignment === "day") return "Day Pigeon";
  if (alignment === "night") return "Night Owl";

  return "--";
}

function getBehaviorLine(
  pet: PetRecord,
  hunger: number,
  clean: number,
  happy: number,
  bond: number,
) {
  const baseSeed = `${pet.id ?? ""}|${pet.name ?? ""}|${pet.element ?? ""}|${pet.stage ?? ""}|${pet.nickname ?? ""}`;
  let total = 0;

  for (let i = 0; i < baseSeed.length; i += 1) {
    total += baseSeed.charCodeAt(i);
  }

  const lowNeed = Math.min(hunger, clean, happy);

  if (lowNeed <= 20) {
    const harsh = [
      "Your pet looks upset and turns away from you.",
      "Your pet gives a grumpy stare and seems uncomfortable.",
      "Your pet looks irritated and clearly wants care.",
      "Your pet seems frustrated and refuses to settle down.",
    ];
    return harsh[total % harsh.length];
  }

  if (hunger <= 35) {
    const hungryLines = [
      "Your pet looks hungry and keeps glancing around for food.",
      "Your pet nudges the air like it wants something to eat.",
      "Your pet seems distracted by its stomach growling.",
    ];
    return hungryLines[total % hungryLines.length];
  }

  if (clean <= 35) {
    const dirtyLines = [
      "Your pet looks messy and a little uncomfortable.",
      "Your pet shakes itself off like it wants to be cleaned.",
      "Your pet seems bothered and could use a quick cleanup.",
    ];
    return dirtyLines[total % dirtyLines.length];
  }

  if (happy <= 35) {
    const moodyLines = [
      "Your pet looks moody and keeps to itself.",
      "Your pet seems restless and a little annoyed.",
      "Your pet watches you carefully but does not look impressed.",
    ];
    return moodyLines[total % moodyLines.length];
  }

  if (bond >= 80) {
    const warmLines = [
      "Your pet stays close and looks happy to be with you.",
      "Your pet seems relaxed and trustful around you.",
      "Your pet watches you warmly and looks completely at ease.",
      "Your pet leans in like it enjoys your company.",
    ];
    return warmLines[total % warmLines.length];
  }

  if (bond >= 55) {
    const neutralNiceLines = [
      "Your pet is watching quietly.",
      "Your pet seems calm and alert.",
      "Your pet looks comfortable being near you.",
      "Your pet watches the room with quiet curiosity.",
    ];
    return neutralNiceLines[total % neutralNiceLines.length];
  }

  const distantLines = [
    "Your pet is watching quietly from a short distance.",
    "Your pet seems cautious, but not unfriendly.",
    "Your pet keeps an eye on you and the room around it.",
    "Your pet looks curious, though still a little guarded.",
  ];
  return distantLines[total % distantLines.length];
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

function SectionPill({
  title,
  className = "",
}: {
  title: string;
  className?: string;
}) {
  return (
    <div className={`petRepoSectionHeader ${className}`.trim()}>
      <div className="petRepoSectionLine" />
      <div className="petRepoSectionPill">{title}</div>
      <div className="petRepoSectionLine" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PetDetailsPanel({
  pet,
  personalityName,
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
  const clampedEnergy = Math.max(0, Math.min(100, energy));

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

  const stablePreference = getStablePreference(pet);
  const behaviorLine = getBehaviorLine(
    pet,
    hungerLevel,
    cleanLevel,
    moodLevel,
    clampedBond,
  );

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
    showNicknameEditor && canRenameNickname
      ? createPortal(
          <div
            className="petRepoNicknameModalBackdrop"
            onClick={() => {
              if (nicknameSaving) return;
              setShowNicknameEditor(false);
            }}
          >
            <div
              className="petRepoNicknameModalWindow"
              role="dialog"
              aria-modal="true"
              aria-labelledby="pet-nickname-title"
              onClick={(event) => event.stopPropagation()}
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
                <p className="petRepoNicknameModalEyebrow">Delta Identity</p>
                <h3
                  id="pet-nickname-title"
                  className="petRepoNicknameModalTitle"
                >
                  Name This Pet
                </h3>
                <p className="petRepoNicknameModalCopy">
                  Create your nickname here. You can type your own or roll a
                  random one.
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
                      setNicknameDraft(
                        randomNickname(pet?.name?.trim() || "Delta"),
                      )
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
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {nicknameModal}

      <article className={`petRepoCareCard petRepoElement-${elementKey}`}>
        <SectionPill
          title="Pet Details"
          className="petRepoSectionHeader--careDetails"
        />

        <div className="petRepoCreatureTop">
          <section
            className="petRepoVerticalCard"
            aria-label="Pet scene and details"
          >
            <div className="petRepoBehaviorBanner">{behaviorLine}</div>

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

              <div className="petRepoSceneInner">
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
                <InfoRow label="Prefers" value={stablePreference} />
                <InfoRow
                  label="Trait"
                  value={getDisplayedPersonality(pet, personalityName)}
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
        </section>

        {starterMerchant?.show ? (
          <div className="petRepoRunawayBanner" role="alert">
            <div className="petRepoRunawayBanner__eyebrow">
              Emergency Access
            </div>
            <h3 className="petRepoRunawayBanner__title">
              {starterMerchant.title || "Pet Ran Away"}
            </h3>
            <p className="petRepoRunawayBanner__body">{starterMerchant.body}</p>

            <a
              className="petRepoRunawayBanner__cta"
              href={starterMerchant.href}
            >
              {starterMerchant.ctaLabel || "Visit the Kithna Merchant"}
            </a>
          </div>
        ) : null}

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

        {actionMsg ? (
          <div className="petRepoInlineMessage">{actionMsg}</div>
        ) : null}
      </article>
    </>
  );
}
