import type { CSSProperties, DragEvent } from "react";
import type {
  PartySlotView,
  StoragePet,
} from "../Hatchery/pages/storage/usePetStorage";
import "./mainTeam.css";

type MainTeamProps = {
  partySlots?: PartySlotView[];
  enableDragAndDrop?: boolean;
  selectedPartySlot: number | null;
  workingPetId: string | null;
  workingSlotIndex: number | null;
  dragOverSlotIndex: number | null;
  onSelectSlot: (slotIndex: number) => void;
  onDragStartPet: (
    event: DragEvent<HTMLDivElement>,
    pet: StoragePet,
    slotIndex: number,
  ) => void;
  onDragEndPet: () => void;
  onDragOverSlot: (event: DragEvent<HTMLElement>) => void;
  onDragEnterSlot: (slotIndex: number) => void;
  onDragLeaveSlot: (slotIndex: number) => void;
  onDropOnSlot: (event: DragEvent<HTMLElement>, slotIndex: number) => void;
  teamName?: string | null;
};

type PetStats = StoragePet & {
  nickname?: string | null;
  species?: string | null;
  stage?: string | null;
  level?: number | null;
  bond?: number | null;
  hp?: number | null;
  current_hp?: number | null;
  max_hp?: number | null;
  experience?: number | null;
  xp?: number | null;
  experience_to_next_level?: number | null;
  xp_to_next_level?: number | null;
  next_level_xp?: number | null;
  portrait_url?: string | null;
  image_url?: string | null;
  sprite_url?: string | null;
  atk?: number | null;
  def?: number | null;
  magi?: number | null;
  mana?: number | null;
  spd?: number | null;
  personality_key?: string | null;
};

const STARTER_DISPLAY_NAMES: Record<string, string> = {
  water_starter: "Mizu",
  fire_starter: "Kindlekin",
  earth_starter: "Twiglet",
  air_starter: "Wistpip",
  ice_starter: "Cribi",
  storm_starter: "Volb",
  light_starter: "Solen",
  shadow_night_bad: "Esperon",
  shadow_day_good: "Esperon",
};

function resolveSpeciesLabel(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  return STARTER_DISPLAY_NAMES[raw.toLowerCase()] ?? raw;
}

function getPetDisplayName(pet: StoragePet) {
  const source = pet as PetStats;

  return (
    source.nickname?.trim() ||
    resolveSpeciesLabel(source.species) ||
    resolveSpeciesLabel(pet.name) ||
    "Unnamed Kith"
  );
}

function clampStat(value: number | null | undefined, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(100, value));
}

function formatStage(stage?: string | null) {
  const raw = String(stage ?? "").trim();
  if (!raw) return "Hatchling";

  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getHpNumbers(pet: PetStats | null) {
  const currentHp = pet?.current_hp ?? pet?.hp ?? 0;
  const maxHp = pet?.max_hp ?? pet?.hp ?? currentHp;

  return {
    currentHp,
    maxHp,
    hpPercent:
      maxHp > 0 ? Math.max(0, Math.min(100, (currentHp / maxHp) * 100)) : 0,
  };
}

function getXpNumbers(pet: PetStats | null) {
  const currentXp = pet?.experience ?? pet?.xp ?? 0;
  const nextXp =
    pet?.experience_to_next_level ??
    pet?.xp_to_next_level ??
    pet?.next_level_xp ??
    100;

  return {
    currentXp,
    nextXp,
    xpPercent:
      nextXp > 0 ? Math.max(0, Math.min(100, (currentXp / nextXp) * 100)) : 0,
  };
}

function getPetImage(pet: PetStats | null) {
  return pet?.portrait_url || pet?.image_url || pet?.sprite_url || "";
}

function getToneClass(line?: string | null) {
  const value = String(line ?? "")
    .trim()
    .toLowerCase();

  switch (value) {
    case "fire":
      return "tone-fire";
    case "water":
      return "tone-water";
    case "earth":
      return "tone-earth";
    case "air":
      return "tone-air";
    case "ice":
      return "tone-ice";
    case "storm":
      return "tone-storm";
    case "light":
      return "tone-light";
    case "shadow":
      return "tone-shadow";
    default:
      return "tone-default";
  }
}

export default function MainTeam(props: MainTeamProps) {
  const {
    partySlots = [],
    enableDragAndDrop = true,
    selectedPartySlot,
    workingPetId,
    workingSlotIndex,
    dragOverSlotIndex,
    onSelectSlot,
    onDragStartPet,
    onDragEndPet,
    onDragOverSlot,
    onDragEnterSlot,
    onDragLeaveSlot,
    onDropOnSlot,
    teamName,
  } = props;

  const teamDisplayName = teamName?.trim() || "Kith Team";

  return (
    <section className="mainTeamPanel" aria-label={teamDisplayName}>
      <div className="mainTeamHeader">
        <div className="mainTeamHeaderLine" aria-hidden="true">
          <span className="mainTeamHeaderDot" />
          <span className="mainTeamHeaderDash" />
          <span className="mainTeamTitleDelta">△</span>
        </div>

        <div className="mainTeamTitleShell">
          <svg
            className="mainTeamRainbowOrb"
            viewBox="0 0 100 86.6"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id="mainTeamDeltaGradient"
                x1="0%"
                y1="100%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="var(--element-fire, #ff5b3d)" />
                <stop offset="25%" stopColor="var(--element-light, #ffd66b)" />
                <stop offset="50%" stopColor="var(--element-water, #38dfff)" />
                <stop offset="75%" stopColor="var(--element-storm, #9d6bff)" />
                <stop
                  offset="100%"
                  stopColor="var(--element-shadow, #7b4dff)"
                />
              </linearGradient>
            </defs>

            <polygon
              points="50 4, 94 80, 6 80"
              fill="none"
              stroke="url(#mainTeamDeltaGradient)"
              strokeWidth="4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>

          <div className="mainTeamTitleRow">
            <h2 className="mainTeamTitle">
              <span>Kith</span>
              <span>Team</span>
            </h2>
          </div>
        </div>

        <div
          className="mainTeamHeaderLine mainTeamHeaderLineRight"
          aria-hidden="true"
        >
          <span className="mainTeamTitleDelta">△</span>
          <span className="mainTeamHeaderDash" />
          <span className="mainTeamHeaderDot" />
        </div>

        <p className="mainTeamSubtitle">Your trusted companions</p>
      </div>

      <div className="mainTeamGrid">
        {partySlots.map((slot) => {
          const pet = slot.pet;
          const source = pet as PetStats | null;
          const displayName = pet ? getPetDisplayName(pet) : "No Pet";
          const bond = clampStat(source?.bond ?? 0, 0);
          const hp = getHpNumbers(source);
          const xp = getXpNumbers(source);
          const petImage = getPetImage(source);
          const isWorking =
            workingSlotIndex === slot.slotIndex ||
            (slot.petId != null && workingPetId === slot.petId);

          return (
            <article
              key={slot.slotIndex}
              className={[
                "mainTeamSlotCard",
                pet ? getToneClass(pet.line) : "tone-default",
                selectedPartySlot === slot.slotIndex ? "selected" : "",
                dragOverSlotIndex === slot.slotIndex ? "dragOver" : "",
                !pet ? "empty" : "",
                isWorking ? "isWorking" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onDragOver={onDragOverSlot}
              onDragEnter={() => onDragEnterSlot(slot.slotIndex)}
              onDragLeave={() => onDragLeaveSlot(slot.slotIndex)}
              onDrop={(event) => onDropOnSlot(event, slot.slotIndex)}
            >
              <button
                type="button"
                className="mainTeamSlotButton"
                onClick={() => onSelectSlot(slot.slotIndex)}
              >
                <div
                  className="mainTeamPetArt"
                  draggable={enableDragAndDrop && Boolean(pet) && !isWorking}
                  onDragStart={(event) => {
                    if (pet) {
                      onDragStartPet(event, pet, slot.slotIndex);
                    }
                  }}
                  onDragEnd={onDragEndPet}
                >
                  {petImage ? (
                    <img src={petImage} alt={displayName} />
                  ) : (
                    <span className="mainTeamNoImageBadge">
                      {pet ? (
                        <>
                          <span
                            className="mainTeamNoImageDelta"
                            aria-hidden="true"
                          />
                          <span className="mainTeamNoImageText">
                            No image yet
                          </span>
                        </>
                      ) : (
                        <span className="mainTeamNoImageText">No Pet</span>
                      )}
                    </span>
                  )}
                </div>

                <div className="mainTeamInfo">
                  {pet ? (
                    <div className="mainTeamStatsGrid">
                      <div className="mainTeamLeftStats">
                        <div className="mainTeamStatLine">
                          LV. {source?.level ?? 1}
                        </div>

                        <div className="mainTeamStatLine">
                          HP {hp.currentHp} / {hp.maxHp}
                        </div>

                        <div className="mainTeamHpBar" aria-hidden="true">
                          <span
                            style={
                              {
                                "--main-team-hp": `${hp.hpPercent}%`,
                              } as CSSProperties
                            }
                          />
                        </div>
                      </div>

                      <div className="mainTeamCenterStage">
                        {formatStage(source?.stage)}
                      </div>

                      <div className="mainTeamRightStats">
                        <h3 className="mainTeamPetName">{displayName}</h3>

                        <div className="mainTeamXpBar" aria-hidden="true">
                          <span
                            style={
                              {
                                "--main-team-xp": `${xp.xpPercent}%`,
                              } as CSSProperties
                            }
                          />
                        </div>

                        <p className="mainTeamXp">
                          {xp.currentXp} / {xp.nextXp}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="mainTeamPetName">{displayName}</h3>
                      <p className="mainTeamStage">No Pet</p>
                    </>
                  )}
                </div>

                {pet ? (
                  <div
                    className="mainTeamCircleWrap"
                    style={
                      {
                        "--main-team-bond": `${bond}%`,
                        "--main-team-bond-color": "var(--main-team-element)",
                      } as CSSProperties
                    }
                  >
                    <div className="mainTeamCircle">
                      <span className="mainTeamCircleValue">{bond}%</span>
                      <span className="mainTeamCircleLabel">Bond</span>
                    </div>
                  </div>
                ) : null}
              </button>

              {pet ? (
                <div className="mainTeamTooltip">
                  <div>
                    HP: {hp.currentHp} / {hp.maxHp}
                  </div>
                  <div>
                    EXP: {xp.currentXp} / {xp.nextXp}
                  </div>
                  <div>ATK: {source?.atk ?? "—"}</div>
                  <div>DEF: {source?.def ?? "—"}</div>
                  <div>MAGI: {source?.magi ?? "—"}</div>
                  <div>MANA: {source?.mana ?? "—"}</div>
                  <div>SPD: {source?.spd ?? "—"}</div>
                  <div>PERSONALITY: {source?.personality_key ?? "—"}</div>
                  <div>BOND: {bond}%</div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
