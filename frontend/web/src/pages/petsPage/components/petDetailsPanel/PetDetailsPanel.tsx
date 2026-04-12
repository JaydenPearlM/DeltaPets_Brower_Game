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

type MeterTone = "blue" | "purple" | "red" | "gold" | "green";

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
  if (!value) return "—";

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

  return (
    <article className={`petRepoCareCard petRepoElement-${elementKey}`}>
      <SectionPill
        title="Pet Details"
        className="petRepoSectionHeader--careDetails"
      />

      <section className="petRepoBondHero" aria-label="Bond and energy status">
        <div className="petRepoBondHeroSplit">
          <div className="petRepoBondHeroStat">
            <div className="petRepoBondHeroHeader">
              <div>
                <span className="petRepoBondHeroEyebrow">Core Bond</span>
                <strong className="petRepoBondHeroTitle">
                  Bond matters most
                </strong>
              </div>

              <div className="petRepoBondHeroValue">{bond}</div>
            </div>

            <div className="petRepoBondHeroTrack" aria-hidden="true">
              <div
                className="petRepoBondHeroFill"
                style={{ width: `${bond}%` }}
              />
            </div>
          </div>

          <div className="petRepoBondHeroStat petRepoBondHeroStatEnergy">
            <div className="petRepoBondHeroHeader">
              <div>
                <span className="petRepoBondHeroEyebrow">Vital Energy</span>
                <strong className="petRepoBondHeroTitle">Ready to play</strong>
              </div>

              <div className="petRepoBondHeroValue">{energy}</div>
            </div>

            <div
              className="petRepoBondHeroTrack petRepoBondHeroTrackEnergy"
              aria-hidden="true"
            >
              <div
                className="petRepoBondHeroFill petRepoBondHeroFillEnergy"
                style={{ width: `${energy}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="petRepoCreatureTop">
        <div className="petRepoCreatureArt">
          <div className="petRepoCreatureBackGlow" />

          <div className="petRepoCreatureFrame petRepoCreatureFrameShell">
            {previewUrl ? (
              <img
                className="petRepoCreatureFrameImage"
                src={previewUrl}
                alt={getPetLabel(pet)}
              />
            ) : (
              <div className="petRepoCreatureCore" aria-label="Pet placeholder">
                <span className="petRepoCreatureEye petRepoCreatureEyeLeft" />
                <span className="petRepoCreatureEye petRepoCreatureEyeRight" />
                <span className="petRepoCreatureSmile" />
              </div>
            )}
          </div>
        </div>

        <div className="petRepoCreatureInfo">
          <article className="petRepoCreatureDetailsPanel">
            <div className="petRepoStatList petRepoStatList--creatureDetails">
              <InfoRow label="Species:" value={pet.name || "—"} />

              <button
                type="button"
                className={`petRepoInfoRow petRepoInfoRowButton ${
                  canRenameNickname ? "is-clickable" : "is-locked"
                }`}
                onClick={() => {
                  if (!canRenameNickname) return;
                  setNicknameDraft(
                    pet?.nickname?.trim() || pet?.name?.trim() || "",
                  );
                  setShowNicknameEditor(true);
                }}
                disabled={!canRenameNickname || nicknameSaving || busy}
                title={
                  canRenameNickname
                    ? "Click to choose this Delta's nickname."
                    : "This Delta's nickname is already locked."
                }
              >
                <span>Nickname:</span>
                <span>{getPetLabel(pet)}</span>
              </button>

              {showNicknameEditor && canRenameNickname ? (
                <div className="petRepoNicknameEditor">
                  <label htmlFor="pet-nickname" className="petRepoInputLabel">
                    Set Nickname
                  </label>

                  <div className="petRepoNicknameRow">
                    <input
                      id="pet-nickname"
                      className="petRepoInput"
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
                      placeholder="Give your Delta a nickname"
                      autoFocus
                    />

                    <button
                      type="button"
                      className="petRepoSaveNickname"
                      onClick={() => void saveNickname()}
                      disabled={!canSaveNickname}
                    >
                      {nicknameSaving ? "Saving..." : "Save"}
                    </button>
                  </div>

                  <p className="petRepoNicknameHelp">
                    Pick carefully. After you save it once, that name is locked
                    in.
                  </p>
                </div>
              ) : null}

              <InfoRow label="Level:" value={String(safeNum(pet.level, 1))} />
              <InfoRow label="Gender:" value={titleCase(pet.gender)} />
              <InfoRow label="Element:" value={getDisplayedElement(pet)} />
              <InfoRow label="Stage:" value={titleCase(pet.stage)} />
              <InfoRow
                label="Personality:"
                value={getDisplayedPersonality(pet, personalityName)}
              />
            </div>
          </article>
        </div>
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
  );
}
