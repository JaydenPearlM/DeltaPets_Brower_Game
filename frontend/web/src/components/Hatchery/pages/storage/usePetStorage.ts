import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type StorageStageFilter =
  | "all"
  | "egg"
  | "hatchling"
  | "lowform"
  | "highform"
  | "legion"
  | "mythical_legendary";

export type StoragePet = {
  id: string;
  user_id: string;
  name: string | null;
  nickname?: string | null;
  species?: string | null;
  energy?: number | null;
  bond?: number | null;
  stage: string | null;
  line: string | null;
  level: number | null;
  location: string | null;
  is_active: boolean | null;
  created_at: string | null;
  hatched_at: string | null;
  hatch_ends_at?: string | null;

  hp?: number | null;
  atk?: number | null;
  magi?: number | null;
  def?: number | null;
  spd?: number | null;
  mana?: number | null;
  personality_key?: string | null;
  base_total?: number | null;
};

type PartySlotRow = {
  id: string;
  user_id: string;
  slot_index: number;
  pet_id: string;
};

export type PartySlotView = {
  slotIndex: number;
  entryId: string | null;
  petId: string | null;
  pet: StoragePet | null;
};

type UsePetStorageOptions = {
  userId?: string;
};

export const PARTY_SLOT_COUNT = 4;
const STORAGE_TOTAL_CAP = 50;
const STORAGE_EGG_CAP = 20;
const STORAGE_PET_CAP = 30;

function normalizeStageInternal(stage?: string | null): StorageStageFilter {
  const raw = String(stage ?? "")
    .trim()
    .toLowerCase();

  if (raw === "egg") return "egg";
  if (raw === "hatchling") return "hatchling";
  if (raw === "lowform") return "lowform";
  if (raw === "adult" || raw === "highform") return "highform";
  if (raw === "legion") return "legion";

  if (
    raw === "mythical_legendary" ||
    raw === "mythical_legendary" ||
    raw === "mythic" ||
    raw === "legendary"
  ) {
    return "mythical_legendary";
  }

  return "highform";
}

function isEggStage(stage?: string | null) {
  return normalizeStageInternal(stage) === "egg";
}

function isUsableActivePet(pet?: StoragePet | null) {
  if (!pet) return false;
  return !isEggStage(pet.stage);
}

function sortPetsNewestFirst(a: StoragePet, b: StoragePet) {
  const aTime = Date.parse(a.hatched_at ?? a.created_at ?? "");
  const bTime = Date.parse(b.hatched_at ?? b.created_at ?? "");

  if (Number.isFinite(aTime) && Number.isFinite(bTime)) {
    return bTime - aTime;
  }

  return String(a.name ?? "").localeCompare(String(b.name ?? ""));
}

export function formatStageLabel(stage?: string | null) {
  const bucket = normalizeStageInternal(stage);

  switch (bucket) {
    case "egg":
      return "Egg";
    case "hatchling":
      return "Hatchling";
    case "lowform":
      return "Lowform";
    case "highform":
      return "Highform";
    case "legion":
      return "Legion";
    case "mythical_legendary":
      return "Mythical Legendary";
    default:
      return "Unknown";
  }
}

export function formatLineLabel(line?: string | null) {
  if (!line) return "Unknown";
  const cleaned = line.replace(/_/g, " ").trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function usePetStorage(options: UsePetStorageOptions) {
  const { userId } = options;

  const [pets, setPets] = useState<StoragePet[]>([]);
  const [partyRows, setPartyRows] = useState<PartySlotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingPetId, setWorkingPetId] = useState<string | null>(null);
  const [workingSlotIndex, setWorkingSlotIndex] = useState<number | null>(null);
  const [error, setError] = useState("");

  const loadAll = useCallback(async () => {
    if (!userId) {
      setPets([]);
      setPartyRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const [petsResult, partyResult] = await Promise.all([
      supabase
        .from("pets")
        .select(
          `
    id,
    user_id,
    name,
    nickname,
    species,
    energy,
    bond,
    hp_max,
    atk,
    def,
    spd,
    magi,
    mana,
    personality_key,
    stage,
    line,
    level,
    location,
    is_active,
    created_at,
    hatched_at,
    hatch_ends_at
  `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),

      supabase
        .from("party_slots")
        .select("id,user_id,slot_index,pet_id")
        .eq("user_id", userId)
        .order("slot_index", { ascending: true }),
    ]);

    if (petsResult.error) {
      setError(petsResult.error.message);
      setLoading(false);
      return;
    }

    if (partyResult.error) {
      setError(partyResult.error.message);
      setLoading(false);
      return;
    }

    const normalizedPets: StoragePet[] = ((petsResult.data ?? []) as any[]).map(
      (pet) => {
        return {
          id: pet.id,
          user_id: pet.user_id,
          name: pet.name,
          nickname: pet.nickname,
          species: pet.species,
          energy: pet.energy,
          bond: pet.bond,
          stage: pet.stage,
          line: pet.line,
          level: pet.level,
          location: pet.location,
          is_active: pet.is_active,
          created_at: pet.created_at,
          hatched_at: pet.hatched_at,
          hatch_ends_at: pet.hatch_ends_at,
          hp: pet.hp_max ?? null,
          atk: pet.atk ?? null,
          magi: pet.magi ?? null,
          def: pet.def ?? null,
          spd: pet.spd ?? null,
          mana: pet.mana ?? null,
          personality_key: pet.personality_key ?? null,
          base_total: null,
        };
      },
    );

    setPets(normalizedPets);
    setPartyRows((partyResult.data ?? []) as PartySlotRow[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const petsById = useMemo(() => {
    const map = new Map<string, StoragePet>();
    for (const pet of pets) {
      map.set(pet.id, pet);
    }
    return map;
  }, [pets]);

  const partyPetIds = useMemo(() => {
    return new Set(partyRows.map((row) => row.pet_id));
  }, [partyRows]);

  const partySlots = useMemo<PartySlotView[]>(() => {
    const rowsByIndex = new Map<number, PartySlotRow>();

    for (const row of partyRows) {
      rowsByIndex.set(row.slot_index, row);
    }

    return Array.from({ length: PARTY_SLOT_COUNT }, (_, idx) => {
      const slotIndex = idx + 1;
      const row = rowsByIndex.get(slotIndex) ?? null;
      const pet = row ? (petsById.get(row.pet_id) ?? null) : null;

      return {
        slotIndex,
        entryId: row?.id ?? null,
        petId: row?.pet_id ?? null,
        pet,
      };
    });
  }, [partyRows, petsById]);

  const firstEmptyPartySlot = useMemo(() => {
    const empty = partySlots.find((slot) => !slot.petId);
    return empty?.slotIndex ?? null;
  }, [partySlots]);

  const storedPets = useMemo(() => {
    return pets
      .filter((pet) => {
        if (pet.location === "storage") return true;
        if (pet.location === "active" && !partyPetIds.has(pet.id)) return true;
        return false;
      })
      .sort(sortPetsNewestFirst);
  }, [pets, partyPetIds]);

  const incubatingEggs = useMemo(() => {
    return pets
      .filter((pet) => pet.location === "hatchery")
      .filter((pet) => isEggStage(pet.stage))
      .sort(sortPetsNewestFirst);
  }, [pets]);

  const storageCounts = useMemo(() => {
    const eggs = storedPets.filter((pet) => isEggStage(pet.stage)).length;
    const nonEggs = storedPets.filter((pet) => !isEggStage(pet.stage)).length;

    return {
      total: storedPets.length,
      eggs,
      pets: nonEggs,
    };
  }, [storedPets]);

  const counts = useMemo(() => {
    const base = {
      all: 0,
      egg: 0,
      hatchling: 0,
      lowform: 0,
      highform: 0,
      legion: 0,
      mythical_legendary: 0,
    } satisfies Record<StorageStageFilter, number>;

    for (const pet of storedPets) {
      base.all += 1;
      const bucket = normalizeStageInternal(pet.stage);
      base[bucket] += 1;
    }

    return base;
  }, [storedPets]);

  function assertCanStorePet(pet: StoragePet) {
    const nextTotal = storageCounts.total + 1;
    const nextEggs = storageCounts.eggs + (isEggStage(pet.stage) ? 1 : 0);
    const nextPets = storageCounts.pets + (isEggStage(pet.stage) ? 0 : 1);

    if (nextTotal > STORAGE_TOTAL_CAP) {
      throw new Error(
        `Storage is full. Max ${STORAGE_TOTAL_CAP} stored creatures.`,
      );
    }

    if (isEggStage(pet.stage) && nextEggs > STORAGE_EGG_CAP) {
      throw new Error(
        `Egg storage is full. Max ${STORAGE_EGG_CAP} stored eggs.`,
      );
    }

    if (!isEggStage(pet.stage) && nextPets > STORAGE_PET_CAP) {
      throw new Error(
        `Pet storage is full. Max ${STORAGE_PET_CAP} stored pets.`,
      );
    }
  }

  async function setOnlyActivePet(nextPetId: string | null) {
    if (!userId) throw new Error("Missing user.");

    const { error: clearError } = await supabase
      .from("pets")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("is_active", true);

    if (clearError) throw clearError;

    if (!nextPetId) return;

    const { error: activateError } = await supabase
      .from("pets")
      .update({
        location: "active",
        is_active: true,
      })
      .eq("user_id", userId)
      .eq("id", nextPetId);

    if (activateError) throw activateError;
  }

  function chooseFallbackActivePetId(options?: {
    preferredPetId?: string | null;
    excludePetIds?: string[];
    nextPartyRows?: PartySlotRow[];
  }) {
    const preferredPetId = options?.preferredPetId ?? null;
    const excludePetIds = new Set(options?.excludePetIds ?? []);
    const effectivePartyRows = options?.nextPartyRows ?? partyRows;

    if (preferredPetId && !excludePetIds.has(preferredPetId)) {
      const preferredPet = petsById.get(preferredPetId) ?? null;
      if (isUsableActivePet(preferredPet)) {
        return preferredPetId;
      }
    }

    const sortedPartyRows = [...effectivePartyRows].sort(
      (a, b) => a.slot_index - b.slot_index,
    );

    for (const row of sortedPartyRows) {
      if (excludePetIds.has(row.pet_id)) continue;
      const pet = petsById.get(row.pet_id) ?? null;
      if (isUsableActivePet(pet)) return row.pet_id;
    }

    const storedUsablePets = pets
      .filter((pet) => !excludePetIds.has(pet.id))
      .filter((pet) => pet.location === "storage")
      .filter(isUsableActivePet)
      .sort(sortPetsNewestFirst);

    if (storedUsablePets.length > 0) {
      return storedUsablePets[0].id;
    }

    return null;
  }

  async function runMutation(
    options: {
      petId?: string | null;
      slotIndex?: number | null;
    },
    fn: () => Promise<void>,
  ) {
    setWorkingPetId(options.petId ?? null);
    setWorkingSlotIndex(options.slotIndex ?? null);
    setError("");

    try {
      await fn();
      await loadAll();
    } catch (err: any) {
      setError(err?.message ?? "Storage update failed.");
    } finally {
      setWorkingPetId(null);
      setWorkingSlotIndex(null);
    }
  }

  const assignPetToParty = useCallback(
    async (petId: string, slotIndex: number) => {
      await runMutation({ petId, slotIndex }, async () => {
        if (!userId) throw new Error("Missing user.");
        if (slotIndex < 1 || slotIndex > PARTY_SLOT_COUNT) {
          throw new Error(
            `Party slot must be between 1 and ${PARTY_SLOT_COUNT}.`,
          );
        }

        const pet = pets.find((entry) => entry.id === petId) ?? null;
        if (!pet) throw new Error("Pet not found.");
        if (isEggStage(pet.stage)) {
          throw new Error("Eggs cannot join the Main Team.");
        }

        const currentSlotForPet =
          partyRows.find((row) => row.pet_id === petId) ?? null;
        const currentOccupant =
          partyRows.find((row) => row.slot_index === slotIndex) ?? null;
        const currentActivePet = pets.find((entry) => entry.is_active) ?? null;

        if (currentSlotForPet?.slot_index === slotIndex) {
          const { error: updatePetError } = await supabase
            .from("pets")
            .update({ location: "active" })
            .eq("user_id", userId)
            .eq("id", petId);

          if (updatePetError) throw updatePetError;
          return;
        }

        if (currentSlotForPet && currentOccupant) {
          const { error: deleteRowsError } = await supabase
            .from("party_slots")
            .delete()
            .eq("user_id", userId)
            .in("id", [currentSlotForPet.id, currentOccupant.id]);

          if (deleteRowsError) throw deleteRowsError;

          const { error: insertSwapError } = await supabase
            .from("party_slots")
            .insert([
              {
                user_id: userId,
                slot_index: slotIndex,
                pet_id: petId,
              },
              {
                user_id: userId,
                slot_index: currentSlotForPet.slot_index,
                pet_id: currentOccupant.pet_id,
              },
            ]);

          if (insertSwapError) throw insertSwapError;

          const { error: updatePetError } = await supabase
            .from("pets")
            .update({ location: "active" })
            .eq("user_id", userId)
            .in("id", [petId, currentOccupant.pet_id]);

          if (updatePetError) throw updatePetError;

          return;
        }

        if (currentSlotForPet && !currentOccupant) {
          const { error: moveError } = await supabase
            .from("party_slots")
            .update({ slot_index: slotIndex })
            .eq("user_id", userId)
            .eq("id", currentSlotForPet.id);

          if (moveError) throw moveError;

          const { error: updatePetError } = await supabase
            .from("pets")
            .update({ location: "active" })
            .eq("user_id", userId)
            .eq("id", petId);

          if (updatePetError) throw updatePetError;

          return;
        }

        if (!currentSlotForPet && currentOccupant) {
          const displacedPet = petsById.get(currentOccupant.pet_id) ?? null;
          if (!displacedPet) throw new Error("Target slot pet not found.");

          assertCanStorePet(displacedPet);

          const { error: deleteTargetError } = await supabase
            .from("party_slots")
            .delete()
            .eq("user_id", userId)
            .eq("id", currentOccupant.id);

          if (deleteTargetError) throw deleteTargetError;

          const { error: insertNewError } = await supabase
            .from("party_slots")
            .insert({
              user_id: userId,
              slot_index: slotIndex,
              pet_id: petId,
            });

          if (insertNewError) throw insertNewError;

          const { error: petLocationError } = await supabase
            .from("pets")
            .update({ location: "active" })
            .eq("user_id", userId)
            .eq("id", petId);

          if (petLocationError) throw petLocationError;

          const { error: displacedStoreError } = await supabase
            .from("pets")
            .update({
              location: "storage",
              is_active: false,
            })
            .eq("user_id", userId)
            .eq("id", displacedPet.id);

          if (displacedStoreError) throw displacedStoreError;

          const shouldPromoteNewPet =
            !currentActivePet || currentActivePet.id === displacedPet.id;

          if (shouldPromoteNewPet) {
            await setOnlyActivePet(petId);
          }

          return;
        }

        const { error: insertError } = await supabase
          .from("party_slots")
          .insert({
            user_id: userId,
            slot_index: slotIndex,
            pet_id: petId,
          });

        if (insertError) throw insertError;

        const { error: activateLocationError } = await supabase
          .from("pets")
          .update({
            location: "active",
          })
          .eq("user_id", userId)
          .eq("id", petId);

        if (activateLocationError) throw activateLocationError;

        if (!currentActivePet) {
          await setOnlyActivePet(petId);
        }
      });
    },
    [partyRows, pets, petsById, storageCounts, userId],
  );

  const returnPartyPetToStorage = useCallback(
    async (slotIndex: number) => {
      await runMutation({ slotIndex }, async () => {
        if (!userId) throw new Error("Missing user.");

        const slot = partySlots.find((entry) => entry.slotIndex === slotIndex);
        if (!slot?.petId || !slot.pet) return;

        const filledPartyCount = partySlots.filter(
          (entry) => entry.petId,
        ).length;
        if (filledPartyCount <= 1) {
          throw new Error("Your Main Team must always keep at least 1 Delta.");
        }

        assertCanStorePet(slot.pet);

        const wasActive = Boolean(slot.pet.is_active);
        const nextPartyRows = partyRows.filter(
          (row) => row.slot_index !== slotIndex,
        );

        const { error: deleteError } = await supabase
          .from("party_slots")
          .delete()
          .eq("user_id", userId)
          .eq("slot_index", slotIndex);

        if (deleteError) throw deleteError;

        const { error: updatePetError } = await supabase
          .from("pets")
          .update({
            location: "storage",
            is_active: false,
          })
          .eq("user_id", userId)
          .eq("id", slot.petId);

        if (updatePetError) throw updatePetError;

        if (wasActive) {
          const fallbackPetId = chooseFallbackActivePetId({
            excludePetIds: [slot.petId],
            nextPartyRows,
          });
          await setOnlyActivePet(fallbackPetId);
        }
      });
    },
    [partyRows, partySlots, userId],
  );

  const setActivePet = useCallback(
    async (petId: string) => {
      await runMutation({ petId }, async () => {
        if (!userId) throw new Error("Missing user.");

        const pet = pets.find((entry) => entry.id === petId) ?? null;
        if (!pet) throw new Error("Pet not found.");
        if (isEggStage(pet.stage)) {
          throw new Error("Eggs cannot become the active Delta.");
        }

        await setOnlyActivePet(petId);
      });
    },
    [pets, userId],
  );

  const moveEggToIncubator = useCallback(
    async (petId: string) => {
      await runMutation({ petId }, async () => {
        if (!userId) throw new Error("Missing user.");

        const pet = pets.find((entry) => entry.id === petId) ?? null;
        if (!pet) throw new Error("Pet not found.");
        if (!isEggStage(pet.stage)) {
          throw new Error("Only eggs can go into the incubator.");
        }

        const existingIncubatingEgg = pets.find(
          (entry) =>
            entry.location === "hatchery" &&
            isEggStage(entry.stage) &&
            entry.id !== petId,
        );

        if (existingIncubatingEgg) {
          throw new Error(
            "Your current backend only supports 1 incubating egg right now. Multi-incubator wiring is the next pass.",
          );
        }

        const { error } = await supabase
          .from("pets")
          .update({
            location: "hatchery",
            is_active: false,
          })
          .eq("user_id", userId)
          .eq("id", petId);

        if (error) throw error;
      });
    },
    [pets, userId],
  );

  const moveEggToStorage = useCallback(
    async (petId: string) => {
      await runMutation({ petId }, async () => {
        if (!userId) throw new Error("Missing user.");

        const pet = pets.find((entry) => entry.id === petId) ?? null;
        if (!pet) throw new Error("Pet not found.");
        if (!isEggStage(pet.stage)) {
          throw new Error(
            "Only eggs can be sent from the incubator back to storage.",
          );
        }

        assertCanStorePet(pet);

        const { error } = await supabase
          .from("pets")
          .update({
            location: "storage",
            is_active: false,
          })
          .eq("user_id", userId)
          .eq("id", petId);

        if (error) throw error;
      });
    },
    [pets, storageCounts, userId],
  );

  const storePet = useCallback(
    async (petId: string) => {
      await runMutation({ petId }, async () => {
        if (!userId) throw new Error("Missing user.");

        const pet = pets.find((entry) => entry.id === petId) ?? null;
        if (!pet) throw new Error("Pet not found.");

        const existingPartyRow = partyRows.find((row) => row.pet_id === petId);
        if (existingPartyRow) {
          const filledPartyCount = partySlots.filter(
            (entry) => entry.petId,
          ).length;
          if (filledPartyCount <= 1) {
            throw new Error(
              "Your Main Team must always keep at least 1 Delta.",
            );
          }
        }

        assertCanStorePet(pet);

        const wasActive = Boolean(pet.is_active);
        const nextPartyRows = partyRows.filter((row) => row.pet_id !== petId);

        if (existingPartyRow) {
          const { error: deleteSlotError } = await supabase
            .from("party_slots")
            .delete()
            .eq("user_id", userId)
            .eq("pet_id", petId);

          if (deleteSlotError) throw deleteSlotError;
        }

        const { error } = await supabase
          .from("pets")
          .update({
            location: "storage",
            is_active: false,
          })
          .eq("id", petId)
          .eq("user_id", userId);

        if (error) throw error;

        if (wasActive) {
          const fallbackPetId = chooseFallbackActivePetId({
            excludePetIds: [petId],
            nextPartyRows,
          });
          await setOnlyActivePet(fallbackPetId);
        }
      });
    },
    [partyRows, partySlots, pets, userId],
  );

  return {
    pets: storedPets,
    allPets: pets,
    partySlots,
    firstEmptyPartySlot,
    counts,
    loading,
    error,
    workingPetId,
    workingSlotIndex,
    storageCounts,
    incubatingEggs,
    reload: loadAll,
    assignPetToParty,
    returnPartyPetToStorage,
    storePet,
    setActivePet,
    moveEggToIncubator,
    moveEggToStorage,
    normalizeStage: normalizeStageInternal,
    caps: {
      total: STORAGE_TOTAL_CAP,
      eggs: STORAGE_EGG_CAP,
      pets: STORAGE_PET_CAP,
      party: PARTY_SLOT_COUNT,
    },
  };
}
