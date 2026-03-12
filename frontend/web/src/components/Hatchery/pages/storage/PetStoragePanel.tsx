import { useMemo, useState } from "react";
import {
  formatLineLabel,
  formatStageLabel,
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

export function PetStoragePanel(props: PetStoragePanelProps) {
  const { userId } = props;

  const [filter, setFilter] = useState<StorageStageFilter>("all");

  const {
    pets,
    counts,
    loading,
    error,
    workingPetId,
    storePet,
    bringOutPet,
    setActivePet,
    normalizeStage,
  } = usePetStorage({ userId });

  const filteredPets = useMemo(() => {
    if (filter === "all") return pets;
    return pets.filter((pet) => normalizeStage(pet.stage) === filter);
  }, [filter, normalizeStage, pets]);

  const activeCount = pets.filter((pet) => pet.location === "active").length;
  const storedCount = pets.filter((pet) => pet.location === "storage").length;

  return (
    <aside className="storagePanel">
      <div className="panelHeader storageHeader">
        <div>
          <div className="panelTitle">Pet Storage</div>
          <div className="storageSubtext">
            Repository column for sorting, storing, and swapping your bonded
            crew.
          </div>
        </div>
      </div>

      <div className="panelBody storagePanelBody">
        <div className="storageHeroStrip">
          <div className="storageHeroCard">
            <div className="storageHeroLabel">Active Pets</div>
            <div className="storageHeroValue">{activeCount}</div>
          </div>

          <div className="storageHeroCard">
            <div className="storageHeroLabel">Stored Pets</div>
            <div className="storageHeroValue">{storedCount}</div>
          </div>

          <div className="storageHeroCard">
            <div className="storageHeroLabel">Visible</div>
            <div className="storageHeroValue">{filteredPets.length}</div>
          </div>
        </div>

        <div className="storageFilterRow">
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

        {loading ? (
          <div className="storageEmptyState">
            <div className="storageEmptyTitle">Loading repository...</div>
            <div className="storageEmptyText">
              Summoning your little monsters from the database abyss.
            </div>
          </div>
        ) : filteredPets.length === 0 ? (
          <div className="storageEmptyState">
            <div className="storageEmptyTitle">No pets in this category.</div>
            <div className="storageEmptyText">
              Hatch more, evolve more, or swap pets into storage to fill this
              shelf.
            </div>
          </div>
        ) : (
          <div className="storagePetGrid">
            {filteredPets.map((pet) => {
              const isWorking = workingPetId === pet.id;
              const isStored = pet.location === "storage";
              const isActive = Boolean(pet.is_active);

              return (
                <article
                  key={pet.id}
                  className={[
                    "storagePetCard",
                    isActive ? "isActivePet" : "",
                  ].join(" ")}
                >
                  <div className="storagePetTop">
                    <div>
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
                        {pet.name?.trim()?.charAt(0).toUpperCase() || "D"}
                      </div>
                    </div>

                    <div className="storagePetLore">
                      {isStored
                        ? "This pet is resting in storage and can be brought back out any time."
                        : isActive
                          ? "This pet is currently your main active companion."
                          : "This pet is out of storage and available for future rooms, teams, or swaps."}
                    </div>
                  </div>

                  <div className="storageActionRow">
                    {isStored ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-blue storageActionBtn"
                          disabled={isWorking}
                          onClick={() => void bringOutPet(pet.id)}
                        >
                          Bring Out
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
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-red storageActionBtn"
                          disabled={isWorking || isActive}
                          onClick={() => void storePet(pet.id)}
                        >
                          Store
                        </button>

                        <button
                          type="button"
                          className="btn btn-purple storageActionBtn"
                          disabled={isWorking || isActive}
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

        {error ? <div className="storageErrorText">Error: {error}</div> : null}
      </div>
    </aside>
  );
}
