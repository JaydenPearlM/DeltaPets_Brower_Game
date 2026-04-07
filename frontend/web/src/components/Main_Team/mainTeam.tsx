import type { DragEvent } from "react";
import {
  formatStageLabel,
  type PartySlotView,
  type StoragePet,
} from "../Hatchery/pages/storage/usePetStorage";
import "./mainTeam.css";

type MainTeamProps = {
  partySlots: PartySlotView[];
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

type PetWithExtras = StoragePet & {
  nickname?: string | null;
  personality_key?: string | null;
  personality?: string | null;
  skill_1_name?: string | null;
  skill_2_name?: string | null;
  skill_3_name?: string | null;
  skill_4_name?: string | null;
  skills?: Array<string | null> | null;
};

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
    case "null":
      return "tone-null";
    default:
      return "tone-default";
  }
}

function getPetDisplayName(pet: StoragePet) {
  const source = pet as PetWithExtras;
  const nickname = source.nickname?.trim();
  const name = pet.name?.trim();
  return nickname || name || "Unnamed Delta";
}

function formatPersonality(pet: StoragePet) {
  const source = pet as PetWithExtras;
  const raw = source.personality_key || source.personality || "";
  if (!raw) return "Unknown Personality";

  return raw
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getPetSkills(pet: StoragePet) {
  const source = pet as PetWithExtras;

  const directSkills = [
    source.skill_1_name,
    source.skill_2_name,
    source.skill_3_name,
    source.skill_4_name,
  ];

  const arraySkills = Array.isArray(source.skills) ? source.skills : [];

  const merged = [...directSkills, ...arraySkills]
    .map((skill) => String(skill ?? "").trim())
    .filter(Boolean);

  return Array.from(new Set(merged)).slice(0, 4);
}

function MainTeamSlotCard(props: {
  slot: PartySlotView;
  isSelected: boolean;
  isWorking: boolean;
  isDragOver: boolean;
  onSelect: () => void;
  onDragStartPet: (
    event: DragEvent<HTMLDivElement>,
    pet: StoragePet,
    slotIndex: number,
  ) => void;
  onDragEndPet: () => void;
  onDragOverSlot: (event: DragEvent<HTMLElement>) => void;
  onDragEnterSlot: () => void;
  onDragLeaveSlot: () => void;
  onDropOnSlot: (event: DragEvent<HTMLElement>, slotIndex: number) => void;
}) {
  const {
    slot,
    isSelected,
    isWorking,
    isDragOver,
    onSelect,
    onDragStartPet,
    onDragEndPet,
    onDragOverSlot,
    onDragEnterSlot,
    onDragLeaveSlot,
    onDropOnSlot,
  } = props;

  const pet = slot.pet;
  const displayName = pet ? getPetDisplayName(pet) : "Empty Slot";
  const personality = pet ? formatPersonality(pet) : "";
  const skills = pet ? getPetSkills(pet) : [];

  return (
    <article
      className={[
        "mainTeamSlotCard",
        pet ? getToneClass(pet.line) : "tone-default",
        isSelected ? "selected" : "",
        isDragOver ? "dragOver" : "",
        !pet ? "mainTeamSlotCardEmpty" : "",
        isWorking ? "isWorking" : "",
      ].join(" ")}
      onDragOver={onDragOverSlot}
      onDragEnter={onDragEnterSlot}
      onDragLeave={onDragLeaveSlot}
      onDrop={(event) => onDropOnSlot(event, slot.slotIndex)}
    >
      {pet ? (
        <div
          className="mainTeamCardButton isFilled"
          draggable={!isWorking}
          onClick={onSelect}
          onDragStart={(event) => onDragStartPet(event, pet, slot.slotIndex)}
          onDragEnd={onDragEndPet}
          title={displayName}
        >
          <div className="mainTeamTopRow">
            <div className="mainTeamTopLeft">
              <div className="mainTeamSlotName">{displayName}</div>
              <div className="mainTeamLevelBadge">Lv. {pet.level ?? 1}</div>
            </div>

            <div className="mainTeamTopRight">
              {pet.is_active ? (
                <div className="mainTeamActiveBadge">Active</div>
              ) : null}

              <div className="mainTeamSlotPortrait">
                <div className="mainTeamSlotPortraitInner">
                  {displayName.charAt(0).toUpperCase() || "D"}
                </div>
              </div>
            </div>
          </div>

          <div className="mainTeamBottomInfo">
            <div className="mainTeamTraitLine">{personality}</div>
            <div className="mainTeamTraitLine">
              {formatStageLabel(pet.stage)}
            </div>

            {skills.length > 0 ? (
              <div className="mainTeamSkillsBlock">
                {skills.map((skill, index) => (
                  <div key={`${skill}-${index}`} className="mainTeamSkillLine">
                    {index + 1}. {skill}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mainTeamSkillsBlock empty">
                <div className="mainTeamSkillLine">No skills loaded</div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="mainTeamCardButton isEmpty"
          onClick={onSelect}
          title={`Main Team Slot ${slot.slotIndex}`}
        >
          <div className="mainTeamTopRow">
            <div className="mainTeamTopLeft">
              <div className="mainTeamSlotName">Empty Slot</div>
              <div className="mainTeamLevelBadge isEmpty">Lv. --</div>
            </div>

            <div className="mainTeamTopRight">
              <div className="mainTeamSlotPortrait isEmpty">
                <div className="mainTeamSlotPortraitInner">+</div>
              </div>
            </div>
          </div>

          <div className="mainTeamBottomInfo empty">
            <div className="mainTeamTraitLine emptyLine">&nbsp;</div>
            <div className="mainTeamTraitLine emptyLine">&nbsp;</div>
            <div className="mainTeamSkillsBlock empty">
              <div className="mainTeamSkillLine emptyLine">&nbsp;</div>
              <div className="mainTeamSkillLine emptyLine">&nbsp;</div>
            </div>
          </div>
        </button>
      )}
    </article>
  );
}

export default function MainTeam(props: MainTeamProps) {
  const {
    partySlots,
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

  const filledCount = partySlots.filter((slot) => slot.petId).length;

  return (
    <section className="mainTeamPanel">
      <div className="mainTeamHeader">
        <div>
          <div className="mainTeamTitle">Main Team</div>
          <div className="mainTeamSubtext">
            Your frontline squad. Drag stored pets into any slot.
          </div>
        </div>

        <div className="mainTeamHeaderMeta">
          <div className="mainTeamHeaderCount">{filledCount}/4 Filled</div>
          <div className="mainTeamHeaderGlow">Core Link Active</div>
        </div>
      </div>

      <div className="mainTeamGrid">
        {partySlots.map((slot) => (
          <MainTeamSlotCard
            key={slot.slotIndex}
            slot={slot}
            isSelected={selectedPartySlot === slot.slotIndex}
            isWorking={
              workingSlotIndex === slot.slotIndex ||
              (slot.petId != null && workingPetId === slot.petId)
            }
            isDragOver={dragOverSlotIndex === slot.slotIndex}
            onSelect={() => onSelectSlot(slot.slotIndex)}
            onDragStartPet={onDragStartPet}
            onDragEndPet={onDragEndPet}
            onDragOverSlot={onDragOverSlot}
            onDragEnterSlot={() => onDragEnterSlot(slot.slotIndex)}
            onDragLeaveSlot={() => onDragLeaveSlot(slot.slotIndex)}
            onDropOnSlot={onDropOnSlot}
          />
        ))}
      </div>
    </section>
  );
}
