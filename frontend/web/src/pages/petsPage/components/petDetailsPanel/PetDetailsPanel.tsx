import { useEffect } from "react";
import { createPortal } from "react-dom";
import "./PetDetailsPanel.css";

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
};

type MeterTone = "blue" | "purple" | "red";

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
  energy: number;
  bond: number;
  actionMsg: string | null;
  setNicknameDraft: (value: string) => void;
  setShowNicknameEditor: (value: boolean) => void;
  saveNickname: () => Promise<void>;
  runCareAction: (action: "feed" | "clean" | "play" | "pet") => Promise<void>;
};

function titleCase(value: string | null | undefined) {
  if (!value) return "";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function safeNum(value: unknown, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

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
  return titleCase(pet.element || pet.line || "Null");
}

function getCareCondition(values: number[]) {
  const valid = values.filter((value) => Number.isFinite(value));
  const average = valid.length
    ? valid.reduce((sum, value) => sum + value, 0) / valid.length
    : 0;

  if (average >= 85) return "Excellent";
  if (average >= 70) return "Strong";
  if (average >= 50) return "Steady";
  if (average >= 30) return "Needs Care";
  return "Critical";
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
  energy,
  bond,
  actionMsg,
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

  const condition = getCareCondition([hunger, clean, happy, energy]);
  const nicknameIsSet = hasNickname(pet);

  const clampedBond = Math.max(0, Math.min(100, bond));
  const clampedEnergy = Math.max(0, Math.min(100, energy));

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
            <div>
              <span className="petRepoCareStatusEyebrow">Daily upkeep</span>
              <strong className="petRepoCareStatusTitle">Care status</strong>
            </div>

            <div className="petRepoCareConditionBadge">{condition}</div>
          </div>

          <div className="petRepoBars">
            <MeterRow label="Hunger" value={hunger} tone="blue" />
            <MeterRow label="Clean" value={clean} tone="purple" />
            <MeterRow label="Happy" value={happy} tone="red" />
          </div>
        </section>

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
            Bond
          </button>
        </div>

        {actionMsg ? (
          <div className="petRepoInlineMessage">{actionMsg}</div>
        ) : null}
      </article>
    </>
  );
}
