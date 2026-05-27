import type { CSSProperties, DragEvent } from "react";
import type {
  PartySlotView,
  StoragePet,
} from "../Hatchery/pages/storage/usePetStorage";
import "./mainTeam.css";

type MainTeamProps = {
  partySlots?: PartySlotView[];
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
};

type PetStats = StoragePet & {
  nickname?: string | null;
  species?: string | null;
  energy?: number | null;
  bond?: number | null;
  hp?: number | null;
  atk?: number | null;
  def?: number | null;
  magi?: number | null;
  mana?: number | null;
  spd?: number | null;
  trait?: string | null;
};

// Keep this helper as-is. It already does nickname → species → name fallback.
function getPetDisplayName(pet: StoragePet) {
  const source = pet as PetStats;
  return (
    source.nickname?.trim() ||
    source.species?.trim() ||
    pet.name?.trim() ||
    "Unnamed Kith"
  );
}

function clampStat(value: number | null | undefined, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(100, value));
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
  } = props;

  return (
    <section className="mainTeamPanel">
      <div className="mainTeamHeader">
        <h2 className="mainTeamTitle">Main Team</h2>
      </div>

      <div className="mainTeamGrid">
        {partySlots.map((slot) => {
          const pet = slot.pet;
          const source = pet as PetStats | null;
          const displayName = pet ? getPetDisplayName(pet) : "";
          const energy = clampStat(source?.energy ?? 100, 100);
          const bond = clampStat(source?.bond ?? 0, 0);
          const pathId = `main-team-name-${slot.slotIndex}-${pet?.id ?? "empty"}`;
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
              ].join(" ")}
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
                  className="mainTeamCircleWrap"
                  style={
                    {
                      "--main-team-energy": `${energy}%`,
                      "--main-team-bond": `${bond}%`,
                      "--main-team-bond-color":
                        bond <= 0
                          ? "transparent"
                          : bond < 34
                            ? "#ff334f"
                            : bond < 67
                              ? "#ffb340"
                              : "#45cf6f",
                    } as CSSProperties
                  }
                >
                  <div
                    className="mainTeamCircle"
                    draggable={Boolean(pet) && !isWorking}
                    onDragStart={(event) => {
                      if (pet) {
                        onDragStartPet(event, pet, slot.slotIndex);
                      }
                    }}
                    onDragEnd={onDragEndPet}
                  >
                    {pet ? (
                      <span className="mainTeamCircleInitial">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    ) : null}
                  </div>

                  {pet ? (
                    <div className="mainTeamStatTooltip">
                      <div>HP: {source?.hp ?? 0}</div>
                      <div>ATK: {source?.atk ?? 0}</div>
                      <div>DEF: {source?.def ?? 0}</div>
                      <div>MAGI: {source?.magi ?? 0}</div>
                      <div>MANA: {source?.mana ?? 0}</div>
                      <div>SPD: {source?.spd ?? 0}</div>
                      <div>TRAIT: {source?.trait ?? "None"}</div>
                    </div>
                  ) : null}

                  {pet ? (
                    <svg
                      className="mainTeamNameArc"
                      viewBox="0 0 150 150"
                      aria-hidden="true"
                    >
                      <defs>
                        <path
                          id={pathId}
                          d="M 24 72 A 51 51 0 0 1 126 72"
                          fill="none"
                        />
                      </defs>

                      <text>
                        <textPath
                          href={`#${pathId}`}
                          startOffset="50%"
                          textAnchor="middle"
                        >
                          {displayName}
                        </textPath>
                      </text>
                    </svg>
                  ) : null}
                </div>
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
