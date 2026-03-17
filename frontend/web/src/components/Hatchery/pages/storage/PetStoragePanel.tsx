import { useMemo, useState } from "react";
import {
  formatLineLabel,
  formatStageLabel,
  PARTY_SLOT_COUNT,
  type PartySlotView,
  type StoragePet,
  type StorageStageFilter,
  usePetStorage,
} from "./usePetStorage";
import "./PetStoragePanel.css";

type PetStoragePanelProps = {
  userId?: string;
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
  { key: "baby", label: "Baby" },
  { key: "child", label: "Child" },
  { key: "adult", label: "Adult" },
  { key: "legion", label: "Legion" },
  { key: "mythical", label: "Mythical" },
];

const STAT_ROWS = [
  { key: "hp", label: "HP" },
  { key: "atk", label: "ATK" },
  { key: "magi", label: "MAGI" },
  { key: "def", label: "DEF" },
  { key: "spd", label: "SPD" },
  { key: "mana", label: "MANA" },
] as const;

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
  event: React.DragEvent<HTMLElement>,
  payload: DragPayload,
) {
  event.dataTransfer.setData("application/json", JSON.stringify(payload));
  event.dataTransfer.effectAllowed = "move";
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

        <div className="storagePetTooltipRow total">
          <span>TOTAL</span>
          <strong>{pet.base_total ?? 0}</strong>
        </div>
      </div>
    </div>
  );
}

function PartySlotCard(props: {
  slot: PartySlotView;
  isSelected: boolean;
  isWorking: boolean;
  isDragOver: boolean;
  onSelect: () => void;
  onDragStartPet: (
    event: React.DragEvent<HTMLDivElement>,
    pet: StoragePet,
    slotIndex: number,
  ) => void;
  onDragEndPet: () => void;
  onDragOverSlot: (event: React.DragEvent<HTMLElement>) => void;
  onDragEnterSlot: () => void;
  onDragLeaveSlot: () => void;
  onDropOnSlot: (
    event: React.DragEvent<HTMLElement>,
    slotIndex: number,
  ) => void;
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

  return (
    <article
      className={[
        "partySlotCard",
        pet ? getToneClass(pet.line) : "tone-default",
        isSelected ? "selected" : "",
        isDragOver ? "dragOver" : "",
        !pet ? "partySlotCardEmpty" : "",
      ].join(" ")}
      onDragOver={onDragOverSlot}
      onDragEnter={onDragEnterSlot}
      onDragLeave={onDragLeaveSlot}
      onDrop={(event) => onDropOnSlot(event, slot.slotIndex)}
    >
      <button
        type="button"
        className="partySlotSelectBtn"
        onClick={onSelect}
        title={`Party Slot ${slot.slotIndex}`}
      >
        <div className="partySlotNumber">{slot.slotIndex}</div>

        <div
          className={[
            "partySlotPortrait",
            pet ? "isFilled" : "isEmpty",
            isWorking ? "isWorking" : "",
          ].join(" ")}
        >
          <div className="partySlotPortraitInner">
            {pet ? pet.name?.trim()?.charAt(0).toUpperCase() || "D" : "+"}
          </div>
        </div>

        <div className="partySlotName">
          {pet ? pet.name?.trim() || "Unnamed Delta" : "Empty Slot"}
        </div>

        <div className="partySlotSub">
          {pet
            ? `${formatStageLabel(pet.stage)} • ${formatLineLabel(pet.line)}`
            : " "}
        </div>

        {pet?.is_active ? <div className="partySlotBadge">Active</div> : null}
      </button>

      {pet ? (
        <div
          className="dragHandleHint"
          draggable={!isWorking}
          onDragStart={(event) => onDragStartPet(event, pet, slot.slotIndex)}
          onDragEnd={onDragEndPet}
          title="Drag pet"
        >
          Drag
        </div>
      ) : (
        <div className="dragHandleHint emptyHint" aria-hidden="true">
          &nbsp;
        </div>
      )}
    </article>
  );
}

function StoragePetCard(props: {
  pet: StoragePet;
  isDragging: boolean;
  onDragStart: (event: React.DragEvent<HTMLElement>, pet: StoragePet) => void;
  onDragEnd: () => void;
  onMoveEggToIncubator?: (petId: string) => void;
  incubatorBusy: boolean;
}) {
  const {
    pet,
    isDragging,
    onDragStart,
    onDragEnd,
    onMoveEggToIncubator,
    incubatorBusy,
  } = props;

  const isEgg =
    String(pet.stage ?? "")
      .trim()
      .toLowerCase() === "egg";
  const draggable = !isEgg;

  return (
    <article
      className={[
        "storagePetCard",
        "storagePetCardWithTooltip",
        getToneClass(pet.line),
        pet.is_active ? "isActivePet" : "",
        isDragging ? "isDragging" : "",
      ].join(" ")}
      draggable={draggable}
      onDragStart={(event) => {
        if (!draggable) return;
        onDragStart(event, pet);
      }}
      onDragEnd={onDragEnd}
      title={
        isEgg
          ? "Eggs stay out of Main Team. Use the incubator button."
          : "Drag pet to team or move it back from team."
      }
    >
      <div className="storagePetTop">
        <div className="storagePetIdentity">
          <div className="storagePetName">
            {pet.name?.trim() || "Unnamed Delta"}
          </div>
          <div className="storagePetMeta">
            {formatLineLabel(pet.line)} • Lv. {pet.level ?? 1}
          </div>
        </div>

        <div className="storageBadgeStack">
          <span className="storageStageBadge">
            {formatStageLabel(pet.stage)}
          </span>

          <span className="storageLocationBadge stored">Stored</span>
        </div>
      </div>

      <div className="storagePetBody">
        <div className="storagePetOrb">
          <div className="storagePetOrbInner">
            {isEgg ? "🥚" : pet.name?.trim()?.charAt(0).toUpperCase() || "D"}
          </div>
        </div>

        <div className="storagePetLore">
          {isEgg
            ? incubatorBusy
              ? "An egg is already incubating. Current wiring still supports one incubating egg."
              : "This egg can be moved from storage into the incubator."
            : "Hover to inspect stats. Drag this pet into any Main Team slot."}
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
            {incubatorBusy ? "Incubator Busy" : "Move to Incubator"}
          </button>
        ) : (
          <div className="dragHandleHint">Drag to team</div>
        )}
      </div>

      {!isEgg ? <StoragePetStatsTooltip pet={pet} /> : null}
    </article>
  );
}

export function PetStoragePanel(props: PetStoragePanelProps) {
  const { userId } = props;

  const [filter, setFilter] = useState<StorageStageFilter>("all");
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
    counts,
    loading,
    error,
    workingPetId,
    workingSlotIndex,
    storageCounts,
    incubatingEggs,
    assignPetToParty,
    storePet,
    moveEggToIncubator,
    normalizeStage,
    caps,
  } = usePetStorage({ userId });

  const filteredPets = useMemo(() => {
    const q = search.trim().toLowerCase();

    return pets.filter((pet) => {
      const stageMatch =
        filter === "all" || normalizeStage(pet.stage) === filter;

      if (!stageMatch) return false;
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
  }, [filter, normalizeStage, pets, search]);

  const partyCount = partySlots.filter((slot) => slot.petId).length;
  const targetSlot = selectedPartySlot ?? firstEmptyPartySlot;
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
    } catch {
      // hook owns error state
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
    } catch {
      // hook owns error state
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
            Selected Slot: <strong>{targetSlot ?? "—"}</strong>
          </div>
        </div>
      </div>

      <div className="panelBody storagePanelBody storagePanelBodyEnhanced">
        <section className="mainPartyInlineSection">
          <div className="storedPetsSectionHeader">
            <div className="panelTitle panelTitleSmall">Main Team</div>
            <div className="panelSubtext">
              Drag stored pets into any slot. Drag team pets back into storage
              to return them.
            </div>
          </div>

          <div className="partyTeamGrid">
            {partySlots.map((slot) => (
              <PartySlotCard
                key={slot.slotIndex}
                slot={slot}
                isSelected={selectedPartySlot === slot.slotIndex}
                isWorking={
                  workingSlotIndex === slot.slotIndex ||
                  (slot.petId != null && workingPetId === slot.petId)
                }
                isDragOver={dragOverSlotIndex === slot.slotIndex}
                onSelect={() => setSelectedPartySlot(slot.slotIndex)}
                onDragStartPet={handleTeamDragStart}
                onDragEndPet={clearDragState}
                onDragOverSlot={allowDrop}
                onDragEnterSlot={() => setDragOverSlotIndex(slot.slotIndex)}
                onDragLeaveSlot={() => {
                  if (dragOverSlotIndex === slot.slotIndex) {
                    setDragOverSlotIndex(null);
                  }
                }}
                onDropOnSlot={handleDropToTeam}
              />
            ))}
          </div>
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
          <div className="storedPetsSectionHeader">
            <div className="panelTitle panelTitleSmall">Storage</div>
            <div className="panelSubtext">
              {storageCounts.total}/{caps.total} total stored.{" "}
              {storageCounts.eggs}/{caps.eggs} egg spaces. {storageCounts.pets}/
              {caps.pets} pet spaces.
            </div>
          </div>

          <div className="storageTopSummary">
            <div className="storageHeroCard">
              <div className="storageHeroLabel">Stored Total</div>
              <div className="storageHeroValue">
                {storageCounts.total}/{caps.total}
              </div>
            </div>

            <div className="storageHeroCard">
              <div className="storageHeroLabel">Stored Eggs</div>
              <div className="storageHeroValue">
                {storageCounts.eggs}/{caps.eggs}
              </div>
            </div>

            <div className="storageHeroCard">
              <div className="storageHeroLabel">Stored Pets</div>
              <div className="storageHeroValue">
                {storageCounts.pets}/{caps.pets}
              </div>
            </div>

            <div className="storageHeroCard">
              <div className="storageHeroLabel">Incubator</div>
              <div className="storageHeroValue">
                {incubatingEgg ? "1/1" : "0/1"}
              </div>
            </div>
          </div>

          <div className="storageSearchWrap">
            <input
              type="text"
              className="storageSearchInput"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search stored pets, eggs, stages, or elements..."
            />
          </div>

          {incubatingEgg ? (
            <div className="storageIncubatorNotice">
              Incubating now:{" "}
              <strong>{incubatingEgg.name?.trim() || "Mystery Egg"}</strong>
              {" • "}
              {formatStageLabel(incubatingEgg.stage)}
            </div>
          ) : (
            <div className="storageIncubatorNotice">
              No egg is in the incubator right now.
            </div>
          )}

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
                    incubatorBusy={Boolean(incubatingEgg)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="storageBottomFilters">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={[
                  "storageFilterChip",
                  filter === item.key ? "active" : "",
                ].join(" ")}
                onClick={() => setFilter(item.key)}
              >
                <span>{item.label}</span>
                <strong>{counts[item.key]}</strong>
              </button>
            ))}
          </div>

          {error ? (
            <div className="storageErrorText">Error: {error}</div>
          ) : null}
        </section>
      </div>
    </aside>
  );
}
