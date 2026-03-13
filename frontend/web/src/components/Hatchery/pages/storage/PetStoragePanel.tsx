import { useMemo, useState } from "react";
import {
  formatLineLabel,
  formatStageLabel,
  type PartySlotView,
  type StorageStageFilter,
  usePetStorage,
} from "./usePetStorage";

type PetStoragePanelProps = {
  userId?: string;
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

function PartySlotCard(props: {
  slot: PartySlotView;
  isSelected: boolean;
  isWorking: boolean;
  onSelect: () => void;
  onReturnToStorage: () => void;
  onSetActive: () => void;
}) {
  const {
    slot,
    isSelected,
    isWorking,
    onSelect,
    onReturnToStorage,
    onSetActive,
  } = props;

  const pet = slot.pet;

  return (
    <article
      className={[
        "partySlotCard",
        pet ? getToneClass(pet.line) : "tone-default",
        isSelected ? "selected" : "",
      ].join(" ")}
    >
      <button
        type="button"
        className="partySlotSelectBtn"
        onClick={onSelect}
        title={`Party Slot ${slot.slotIndex}`}
      >
        <div className="partySlotNumber">{slot.slotIndex}</div>

        <div className="partySlotPortrait">
          <div className="partySlotPortraitInner">
            {pet ? pet.name?.trim()?.charAt(0).toUpperCase() || "D" : "+"}
          </div>
        </div>

        <div className="partySlotName">
          {pet ? pet.name?.trim() || "Unnamed" : "Empty"}
        </div>

        <div className="partySlotSub">
          {pet
            ? `${formatStageLabel(pet.stage)} • ${formatLineLabel(pet.line)}`
            : "Open slot"}
        </div>
      </button>

      {pet ? (
        <div className="partySlotActions">
          <button
            type="button"
            className="btn btn-purple storageActionBtn"
            disabled={isWorking}
            onClick={onSetActive}
          >
            Active
          </button>

          <button
            type="button"
            className="btn btn-red storageActionBtn"
            disabled={isWorking}
            onClick={onReturnToStorage}
          >
            Store
          </button>
        </div>
      ) : null}
    </article>
  );
}

export function PetStoragePanel(props: PetStoragePanelProps) {
  const { userId } = props;

  const [filter, setFilter] = useState<StorageStageFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedPartySlot, setSelectedPartySlot] = useState<number | null>(1);

  const {
    pets,
    partySlots,
    firstEmptyPartySlot,
    counts,
    loading,
    error,
    workingPetId,
    workingSlotIndex,
    assignPetToParty,
    returnPartyPetToStorage,
    storePet,
    bringOutPet,
    setActivePet,
    normalizeStage,
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
        pet.is_active ? "active" : "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [filter, normalizeStage, pets, search]);

  const storedCount = pets.filter((pet) => pet.location === "storage").length;
  const activeCount = pets.filter((pet) => pet.location === "active").length;
  const eggCount = pets.filter(
    (pet) => normalizeStage(pet.stage) === "egg",
  ).length;
  const partyCount = partySlots.filter((slot) => slot.petId).length;

  async function handleAssignToTeam(petId: string) {
    const targetSlot = selectedPartySlot ?? firstEmptyPartySlot;

    if (!targetSlot) {
      window.alert("All 5 party slots are full. Pick a slot to replace first.");
      return;
    }

    await assignPetToParty(petId, targetSlot);
  }

  return (
    <aside className="storagePanel">
      <div className="panelHeader storageHeader">
        <div>
          <div className="panelTitle">Main Party Team</div>
          <div className="panelSubtext">
            Party team on top. Stored pets underneath in the same panel.
          </div>
        </div>

        <div className="storageHeaderMeta">
          <div className="storageHeaderMetaTop">{partyCount}/5 Filled</div>
          <div className="storageHeaderMetaBottom">
            Selected Slot:{" "}
            <strong>{selectedPartySlot ?? firstEmptyPartySlot ?? "—"}</strong>
          </div>
        </div>
      </div>

      <div className="panelBody storagePanelBody storagePanelBodyEnhanced">
        <section className="mainPartyInlineSection">
          <div className="partyTeamGrid">
            {partySlots.map((slot) => (
              <PartySlotCard
                key={slot.slotIndex}
                slot={slot}
                isSelected={selectedPartySlot === slot.slotIndex}
                isWorking={workingSlotIndex === slot.slotIndex}
                onSelect={() => setSelectedPartySlot(slot.slotIndex)}
                onReturnToStorage={() =>
                  void returnPartyPetToStorage(slot.slotIndex)
                }
                onSetActive={() =>
                  slot.pet ? void setActivePet(slot.pet.id) : undefined
                }
              />
            ))}
          </div>
        </section>

        <div className="storageSectionDivider" />

        <section className="storedPetsInlineSection">
          <div className="storedPetsSectionHeader">
            <div className="panelTitle panelTitleSmall">Stored Pets</div>
            <div className="panelSubtext">
              Storage for pets, eggs, sorting, and later box systems.
            </div>
          </div>

          <div className="storageTopSummary">
            <div className="storageHeroCard">
              <div className="storageHeroLabel">Stored</div>
              <div className="storageHeroValue">{storedCount}</div>
            </div>

            <div className="storageHeroCard">
              <div className="storageHeroLabel">Out</div>
              <div className="storageHeroValue">{activeCount}</div>
            </div>

            <div className="storageHeroCard">
              <div className="storageHeroLabel">Eggs</div>
              <div className="storageHeroValue">{eggCount}</div>
            </div>

            <div className="storageHeroCard">
              <div className="storageHeroLabel">Visible</div>
              <div className="storageHeroValue">{filteredPets.length}</div>
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

          <div className="storageGridScroll">
            {loading ? (
              <div className="storageEmptyState">
                <div className="storageEmptyTitle">Loading storage...</div>
                <div className="storageEmptyText">
                  Pulling your creatures out of the database cave.
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
                {filteredPets.map((pet) => {
                  const isWorking = workingPetId === pet.id;
                  const isEgg = normalizeStage(pet.stage) === "egg";
                  const isStored = pet.location === "storage";
                  const isActive = Boolean(pet.is_active);
                  const toneClass = getToneClass(pet.line);
                  const targetSlot = selectedPartySlot ?? firstEmptyPartySlot;

                  return (
                    <article
                      key={pet.id}
                      className={[
                        "storagePetCard",
                        toneClass,
                        isActive ? "isActivePet" : "",
                      ].join(" ")}
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

                          <span
                            className={[
                              "storageLocationBadge",
                              isStored ? "stored" : "active",
                            ].join(" ")}
                          >
                            {isStored ? "Stored" : isActive ? "Active" : "Out"}
                          </span>
                        </div>
                      </div>

                      <div className="storagePetBody">
                        <div className="storagePetOrb">
                          <div className="storagePetOrbInner">
                            {isEgg
                              ? "🥚"
                              : pet.name?.trim()?.charAt(0).toUpperCase() ||
                                "D"}
                          </div>
                        </div>

                        <div className="storagePetLore">
                          {isEgg
                            ? "Eggs can stay in storage, but they cannot join the main party team."
                            : targetSlot
                              ? `Ready to assign into Party Slot ${targetSlot}.`
                              : "All party slots are full. Select a slot above to replace one."}
                        </div>
                      </div>

                      <div className="storageActionRow">
                        {isEgg ? (
                          <>
                            <button
                              type="button"
                              className="btn btn-blue storageActionBtn"
                              disabled={isWorking || !isStored}
                              onClick={() => void bringOutPet(pet.id)}
                            >
                              Bring Out
                            </button>

                            <button
                              type="button"
                              className="btn btn-red storageActionBtn"
                              disabled={isWorking || isStored}
                              onClick={() => void storePet(pet.id)}
                            >
                              Store
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn btn-blue storageActionBtn"
                              disabled={isWorking || !targetSlot}
                              onClick={() => void handleAssignToTeam(pet.id)}
                            >
                              {targetSlot
                                ? `Assign ${targetSlot}`
                                : "Party Full"}
                            </button>

                            <button
                              type="button"
                              className="btn btn-purple storageActionBtn"
                              disabled={isWorking}
                              onClick={() => void setActivePet(pet.id)}
                            >
                              Set Active
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
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
