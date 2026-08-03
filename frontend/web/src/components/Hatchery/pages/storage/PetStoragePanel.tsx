import { useEffect, useMemo, useState } from "react";
import {
  formatLineLabel,
  formatStageLabel,
  PARTY_SLOT_COUNT,
  type StoragePet,
  type StorageStageFilter,
  usePetStorage,
} from "./usePetStorage";
import MainTeam from "../../../Main_Team/mainTeam";
import { ELEMENT_EGG_NAMES, SHARED_SPECIES } from "@shared/pets/species";
import prismaticEggPng from "@/Pets_Creation/assets/eggs/prismatic_egg.png";
import tideEggPng from "@/Pets_Creation/assets/eggs/tide_egg.png";
import emberEggPng from "@/Pets_Creation/assets/eggs/ember_egg.png";
import groveEggPng from "@/Pets_Creation/assets/eggs/grove_egg.png";
import zephyrEggPng from "@/Pets_Creation/assets/eggs/zephr_egg.png";
import frostveilEggPng from "@/Pets_Creation/assets/eggs/frostviel_egg.png";
import stormEggPng from "@/Pets_Creation/assets/eggs/storm.png";
import dawnshardEggPng from "@/Pets_Creation/assets/eggs/light.png";
import eclipseEggPng from "@/Pets_Creation/assets/eggs/eclipse_egg.png";
import voidborneEggPng from "@/Pets_Creation/assets/eggs/Voidborne_egg.png";
import "./PetStoragePanel.css";
type PetStoragePanelProps = {
  userId?: string;
  refreshSignal?: number;
  onStorageChanged?: () => void;
};

type DragPayload = {
  petId: string;
  source: "team" | "storage";
  fromSlotIndex?: number | null;
  isEgg: boolean;
};

const FILTERS: Array<{ key: StorageStageFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "egg", label: "Egg" },
  { key: "hatchling", label: "Hatchling" },
  { key: "lowform", label: "Lowform" },
  { key: "highform", label: "Highform" },
  { key: "legion", label: "Legion" },
  { key: "mythical_legendary", label: "Mythical Legendary" },
];

const STAT_ROWS = [
  { key: "hp", label: "HP" },
  { key: "atk", label: "ATK" },
  { key: "magi", label: "MAGI" },
  { key: "def", label: "DEF" },
  { key: "spd", label: "SPD" },
  { key: "mana", label: "MANA" },
] as const;

const ELEMENT_LINE_KEYS = new Set<string>(Object.keys(ELEMENT_EGG_NAMES));
const STARTER_SPECIES_IDS = new Set<string>(
  SHARED_SPECIES.map((species) => species.id),
);

const ELEMENT_EGG_IMAGES: Record<string, string> = {
  null: voidborneEggPng,
  null_element: voidborneEggPng,
  water: tideEggPng,
  fire: emberEggPng,
  earth: groveEggPng,
  air: zephyrEggPng,
  ice: frostveilEggPng,
  storm: stormEggPng,
  light: dawnshardEggPng,
  shadow: eclipseEggPng,
};

function resolveEggIdentity(
  egg?: { line?: string | null; species?: string | null } | null,
): {
  label: string;
  toneClass: string;
} {
  if (STARTER_SPECIES_IDS.has(String(egg?.species ?? "").trim())) {
    return { label: "Prismatic Egg", toneClass: "tone-default" };
  }

  const value = String(egg?.line ?? "")
    .trim()
    .toLowerCase();

  if (ELEMENT_LINE_KEYS.has(value)) {
    return {
      label: ELEMENT_EGG_NAMES[value as keyof typeof ELEMENT_EGG_NAMES],
      toneClass: getToneClass(value),
    };
  }

  return { label: "Prismatic Egg", toneClass: "tone-default" };
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
    case "null":
      return "tone-null";
    default:
      return "tone-default";
  }
}

function normalizeDragPayload(raw: string): DragPayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<DragPayload>;

    if (!parsed.petId || !parsed.source) return null;
    if (parsed.source !== "team" && parsed.source !== "storage") return null;

    return {
      petId: parsed.petId,
      source: parsed.source,
      fromSlotIndex:
        typeof parsed.fromSlotIndex === "number" ? parsed.fromSlotIndex : null,
      isEgg: Boolean(parsed.isEgg),
    };
  } catch {
    return null;
  }
}

function writeDragPayload(
  event: React.DragEvent<HTMLElement | HTMLDivElement>,
  payload: DragPayload,
) {
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("application/json", JSON.stringify(payload));
}

function StoragePetStatsTooltip(props: { pet: StoragePet }) {
  const { pet } = props;

  return (
    <div className="storagePetTooltip" role="tooltip">
      <div className="storagePetTooltipTitle">
        {pet.name?.trim() || "Unnamed Delta"}
      </div>

      <div className="storagePetTooltipMeta">
        {formatStageLabel(pet.stage)} • {formatLineLabel(pet.line)}
      </div>

      <div className="storagePetTooltipGrid">
        {STAT_ROWS.map((row) => (
          <div key={row.key} className="storagePetTooltipRow">
            <span>{row.label}</span>
            <strong>{pet[row.key] ?? 0}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function StoragePetCard(props: {
  pet: StoragePet;
  isDragging: boolean;
  onDragStart: (event: React.DragEvent<HTMLElement>, pet: StoragePet) => void;
  onDragEnd: () => void;
  onMoveEggToIncubator?: (petId: string) => void;
  onMovePetToParty?: (petId: string) => void;
  onSelectPet?: (petId: string) => void;
  targetSlot: number | null;
  isWorking: boolean;
  incubatorBusy: boolean;
}) {
  const {
    pet,
    isDragging,
    onDragStart,
    onDragEnd,
    onMoveEggToIncubator,
    onMovePetToParty,
    onSelectPet,
    targetSlot,
    isWorking,
    incubatorBusy,
  } = props;

  const isEgg =
    String(pet.stage ?? "")
      .trim()
      .toLowerCase() === "egg";
  const draggable = !isEgg;
  const eggIdentity = isEgg ? resolveEggIdentity(pet) : null;
  const isStarterEgg = isEgg && eggIdentity?.label === "Prismatic Egg";

  return (
    <article
      className={[
        "storagePetCard",
        "storagePetCardWithTooltip",
        isEgg ? eggIdentity!.toneClass : getToneClass(pet.line),
        pet.is_active ? "isActivePet" : "",
        isDragging ? "isDragging" : "",
      ].join(" ")}
      draggable={draggable}
      onDragStart={(event) => {
        if (!draggable) return;
        onDragStart(event, pet);
      }}
      onDragEnd={onDragEnd}
      onClick={(event) => {
        if (
          isEgg ||
          (event.target instanceof Element && event.target.closest("button"))
        ) {
          return;
        }
        onSelectPet?.(pet.id);
      }}
      title={
        isEgg
          ? "Eggs stay out of Main Team. Use the incubator button."
          : "Drag pet to team or move it back from team."
      }
    >
      <div className="storagePetTop">
        <div className="storagePetIdentity">
          <div className="storagePetName">
            {isEgg ? eggIdentity!.label : pet.name?.trim() || "Unnamed Delta"}
          </div>
          {!isEgg ? (
            <div className="storagePetMeta">
              {formatLineLabel(pet.line)} • Lv. {pet.level ?? 1}
            </div>
          ) : null}
        </div>

        <div className="storageBadgeStack">
          <span className="storageStageBadge">
            {isEgg ? formatLineLabel(pet.line) : formatStageLabel(pet.stage)}
          </span>

          {isStarterEgg ? (
            <span className="storageRarityBadge epic">Epic</span>
          ) : null}
        </div>
      </div>

      <div className="storagePetBody">
        <div className="storagePetOrb">
          {isEgg ? (
            <img
              className="storageEggImage"
              src={
                isStarterEgg
                  ? prismaticEggPng
                  : (ELEMENT_EGG_IMAGES[
                      String(pet.line ?? "")
                        .trim()
                        .toLowerCase()
                    ] ?? prismaticEggPng)
              }
              alt={eggIdentity!.label}
            />
          ) : (
            <div className="storagePetOrbInner">
              {pet.name?.trim()?.charAt(0).toUpperCase() || "D"}
            </div>
          )}
        </div>

        <div className="storagePetStats">
          {STAT_ROWS.map((row) => (
            <div key={row.key} className="storagePetStat">
              <span>{row.label}</span>
              <strong>{pet[row.key] ?? 0}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="storageActionRow">
        {isEgg ? (
          <button
            type="button"
            className="btn btn-blue storageActionBtn"
            disabled={incubatorBusy}
            onClick={() => onMoveEggToIncubator?.(pet.id)}
          >
            {incubatorBusy ? "Incubator Busy" : "Incubate"}
          </button>
        ) : (
          <>
            <div className="dragHandleHint">Drag to team</div>

            <button
              type="button"
              className="btn btn-blue storageActionBtn"
              disabled={!targetSlot || isWorking}
              onClick={() => onMovePetToParty?.(pet.id)}
            >
              {isWorking
                ? "Moving..."
                : targetSlot
                  ? `Move to Slot ${targetSlot}`
                  : "Main Team Full"}
            </button>
          </>
        )}
      </div>

      {!isEgg ? <StoragePetStatsTooltip pet={pet} /> : null}
    </article>
  );
}

export function PetStoragePanel(props: PetStoragePanelProps) {
  const { userId, refreshSignal, onStorageChanged } = props;
  const [filter, setFilter] = useState<StorageStageFilter>("all");
  const [elementFilter, setElementFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedPartySlot, setSelectedPartySlot] = useState<number | null>(1);

  const [draggingPetId, setDraggingPetId] = useState<string | null>(null);
  const [dragOverSlotIndex, setDragOverSlotIndex] = useState<number | null>(
    null,
  );
  const [isStorageDragOver, setIsStorageDragOver] = useState(false);

  const {
    pets,
    partySlots,
    firstEmptyPartySlot,
    loading,
    error,
    workingPetId,
    workingSlotIndex,
    incubatingEggs,
    assignPetToParty,
    storePet,
    moveEggToIncubator,
    normalizeStage,
    reload,
  } = usePetStorage({ userId, onMutated: onStorageChanged });

  useEffect(() => {
    if (!refreshSignal) return;
    void reload();
  }, [refreshSignal, reload]);

  const filteredPets = useMemo(() => {
    const q = search.trim().toLowerCase();

    return pets.filter((pet) => {
      const stageMatch =
        filter === "all" || normalizeStage(pet.stage) === filter;

      if (!stageMatch) return false;

      const elementMatch =
        elementFilter === "all" ||
        String(pet.line ?? "")
          .trim()
          .toLowerCase() === elementFilter;

      if (!elementMatch) return false;
      if (!q) return true;

      const haystack = [
        pet.name ?? "",
        pet.stage ?? "",
        pet.line ?? "",
        pet.location ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [elementFilter, filter, normalizeStage, pets, search]);

  const partyCount = partySlots.filter((slot) => slot.petId).length;
  const targetSlot = firstEmptyPartySlot ?? selectedPartySlot;
  const incubatingEgg = incubatingEggs[0] ?? null;

  function clearDragState() {
    setDraggingPetId(null);
    setDragOverSlotIndex(null);
    setIsStorageDragOver(false);
  }

  function handleStorageDragStart(
    event: React.DragEvent<HTMLElement>,
    pet: StoragePet,
  ) {
    setDraggingPetId(pet.id);

    writeDragPayload(event, {
      petId: pet.id,
      source: "storage",
      fromSlotIndex: null,
      isEgg: normalizeStage(pet.stage) === "egg",
    });
  }

  function handleTeamDragStart(
    event: React.DragEvent<HTMLDivElement>,
    pet: StoragePet,
    slotIndex: number,
  ) {
    setDraggingPetId(pet.id);

    writeDragPayload(event, {
      petId: pet.id,
      source: "team",
      fromSlotIndex: slotIndex,
      isEgg: normalizeStage(pet.stage) === "egg",
    });
  }

  async function handleMoveStoredPetToTeam(petId: string) {
    if (!targetSlot) return;

    await assignPetToParty(petId, targetSlot);
    setSelectedPartySlot(targetSlot);
  }

  async function handleTeamPetSelect(pet: StoragePet, slotIndex: number) {
    if (!window.matchMedia("(max-width: 430px)").matches) return;

    const choice = window.prompt(
      `Move ${pet.name?.trim() || "this pet"}: enter 1, 2, 3, 4, or S for Storage.`,
    );

    if (!choice) return;

    const normalizedChoice = choice.trim().toLowerCase();
    if (normalizedChoice === "s" || normalizedChoice === "storage") {
      await storePet(pet.id);
      return;
    }

    const targetSlotIndex = Number(normalizedChoice);
    if (targetSlotIndex < 1 || targetSlotIndex > PARTY_SLOT_COUNT) {
      window.alert("Enter 1, 2, 3, 4, or S for Storage.");
      return;
    }

    await assignPetToParty(pet.id, targetSlotIndex);
    setSelectedPartySlot(targetSlotIndex);
  }

  async function handleStoredPetSelect(petId: string) {
    if (!window.matchMedia("(max-width: 430px)").matches) return;

    const choice = window.prompt(
      "Choose a Kith Team slot: enter 1, 2, 3, or 4.",
    );

    if (!choice) return;

    const targetSlotIndex = Number(choice.trim());
    if (targetSlotIndex < 1 || targetSlotIndex > PARTY_SLOT_COUNT) {
      window.alert("Enter a slot number from 1 to 4.");
      return;
    }

    await assignPetToParty(petId, targetSlotIndex);
    setSelectedPartySlot(targetSlotIndex);
  }

  async function handleDropToTeam(
    event: React.DragEvent<HTMLElement>,
    slotIndex: number,
  ) {
    event.preventDefault();

    const payload = normalizeDragPayload(
      event.dataTransfer.getData("application/json"),
    );

    clearDragState();

    if (!payload) return;

    if (payload.isEgg) {
      window.alert("Eggs cannot be dragged into the Main Team.");
      return;
    }

    try {
      await assignPetToParty(payload.petId, slotIndex);
      setSelectedPartySlot(slotIndex);
    } catch (dropError) {
      window.alert(
        dropError instanceof Error
          ? dropError.message
          : "Failed to move pet to Main Team.",
      );
    }
  }

  async function handleDropToStorage(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();

    const payload = normalizeDragPayload(
      event.dataTransfer.getData("application/json"),
    );

    clearDragState();

    if (!payload) return;
    if (payload.source !== "team") return;

    try {
      await storePet(payload.petId);
    } catch (dropError) {
      window.alert(
        dropError instanceof Error
          ? dropError.message
          : "Failed to move pet to storage.",
      );
    }
  }

  function allowDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  return (
    <aside className="storagePanel">
      <div className="panelHeader storageHeader">
        <div>
          <div className="panelTitle">Main Team + Storage</div>
          <div className="panelSubtext">
            Drag pets between Main Team and Storage. Eggs never enter the Main
            Team.
          </div>
        </div>

        <div className="storageHeaderMeta">
          <div className="storageHeaderMetaTop">
            {partyCount}/{PARTY_SLOT_COUNT} Filled
          </div>
          <div className="storageHeaderMetaBottom">
            Selected Slot: <strong>{targetSlot ?? ""}</strong>
          </div>
        </div>
      </div>

      <section className="mainPartyInlineSection">
        <MainTeam
          partySlots={partySlots}
          selectedPartySlot={selectedPartySlot}
          workingPetId={workingPetId}
          workingSlotIndex={workingSlotIndex}
          dragOverSlotIndex={dragOverSlotIndex}
          onSelectSlot={setSelectedPartySlot}
          onSelectPet={(pet, slotIndex) =>
            void handleTeamPetSelect(pet, slotIndex)
          }
          onDragStartPet={handleTeamDragStart}
          onDragEndPet={clearDragState}
          onDragOverSlot={allowDrop}
          onDragEnterSlot={(slotIndex) => setDragOverSlotIndex(slotIndex)}
          onDragLeaveSlot={(slotIndex) => {
            if (dragOverSlotIndex === slotIndex) {
              setDragOverSlotIndex(null);
            }
          }}
          onDropOnSlot={handleDropToTeam}
        />
      </section>

      <div className="storageSectionDivider" />

      <section
        className={[
          "storedPetsInlineSection",
          isStorageDragOver ? "dragOverStorage" : "",
        ].join(" ")}
        onDragOver={allowDrop}
        onDragEnter={() => setIsStorageDragOver(true)}
        onDragLeave={() => setIsStorageDragOver(false)}
        onDrop={handleDropToStorage}
      >
        <div className="storageSectionTop">
          <div className="storedPetsSectionHeader storageSectionCopy">
            <div className="panelTitle panelTitleSmall">Storage</div>
            <div className="panelSubtext">
              Pets and eggs currently held in storage.
            </div>
          </div>

          <details className="storageMenu">
            <summary aria-label="Open storage filters">☰</summary>
            <div className="storageMenuPanel">
              <label className="storageMenuLabel" htmlFor="storage-type-filter">
                Type or stage
              </label>
              <select
                id="storage-type-filter"
                className="storageMenuSelect"
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as StorageStageFilter)
                }
              >
                {FILTERS.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>

              <label
                className="storageMenuLabel"
                htmlFor="storage-element-filter"
              >
                Element
              </label>
              <select
                id="storage-element-filter"
                className="storageMenuSelect"
                value={elementFilter}
                onChange={(event) => setElementFilter(event.target.value)}
              >
                <option value="all">All elements</option>
                {Array.from(ELEMENT_LINE_KEYS).map((element) => (
                  <option key={element} value={element}>
                    {formatLineLabel(element)}
                  </option>
                ))}
              </select>
            </div>
          </details>
        </div>

        <div className="storageSearchWrap">
          <input
            type="text"
            className="storageSearchInput"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search pets or eggs..."
          />
        </div>

        <div className="storageIncubatorNotice">
          Incubating now:{" "}
          <strong>
            {incubatingEgg
              ? incubatingEgg.name?.trim() ||
                resolveEggIdentity(incubatingEgg).label
              : "None"}
          </strong>
        </div>

        <div className="storageGridScroll">
          {loading ? (
            <div className="storageEmptyState">
              <div className="storageEmptyTitle">Loading storage...</div>
              <div className="storageEmptyText">
                Pulling your Deltas out of the database cave.
              </div>
            </div>
          ) : filteredPets.length === 0 ? (
            <div className="storageEmptyState">
              <div className="storageEmptyTitle">
                Nothing matches that filter.
              </div>
              <div className="storageEmptyText">
                Try a different search or stage filter.
              </div>
            </div>
          ) : (
            <div className="storagePetGrid">
              {filteredPets.map((pet) => (
                <StoragePetCard
                  key={pet.id}
                  pet={pet}
                  isDragging={draggingPetId === pet.id}
                  onDragStart={handleStorageDragStart}
                  onDragEnd={clearDragState}
                  onMoveEggToIncubator={(petId) =>
                    void moveEggToIncubator(petId)
                  }
                  onMovePetToParty={(petId) =>
                    void handleMoveStoredPetToTeam(petId)
                  }
                  onSelectPet={(petId) => void handleStoredPetSelect(petId)}
                  targetSlot={targetSlot}
                  isWorking={workingPetId === pet.id}
                  incubatorBusy={Boolean(incubatingEgg)}
                />
              ))}
            </div>
          )}
        </div>

        {error ? <div className="storageErrorText">Error: {error}</div> : null}
      </section>
    </aside>
  );
}
