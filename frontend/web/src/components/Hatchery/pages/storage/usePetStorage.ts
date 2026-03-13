import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../lib/supabase/client";

export type StorageStageFilter =
  | "all"
  | "egg"
  | "baby"
  | "child"
  | "adult"
  | "legion"
  | "mythical";

export type StoragePet = {
  id: string;
  user_id: string;
  name: string | null;
  stage: string | null;
  line: string | null;
  level: number | null;
  location: string | null;
  is_active: boolean | null;
  created_at: string | null;
  hatched_at: string | null;
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

function normalizeStageInternal(stage?: string | null): StorageStageFilter {
  const raw = String(stage ?? "")
    .trim()
    .toLowerCase();

  if (raw === "egg") return "egg";
  if (raw === "baby") return "baby";
  if (raw === "toddler" || raw === "child") return "child";
  if (raw === "teen" || raw === "adult") return "adult";
  if (raw === "legion") return "legion";
  if (
    raw === "mythical" ||
    raw === "mythic_legendary" ||
    raw === "mythic" ||
    raw === "legendary"
  ) {
    return "mythical";
  }

  return "adult";
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
    case "baby":
      return "Baby";
    case "child":
      return "Child";
    case "adult":
      return "Adult";
    case "legion":
      return "Legion";
    case "mythical":
      return "Mythical";
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
          "id,user_id,name,stage,line,level,location,is_active,created_at,hatched_at",
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

    setPets((petsResult.data ?? []) as StoragePet[]);
    setPartyRows((partyResult.data ?? []) as PartySlotRow[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const petsById = useMemo(() => {
    const map = new Map<string, StoragePet>();
    for (const pet of pets) map.set(pet.id, pet);
    return map;
  }, [pets]);

  const partyPetIds = useMemo(() => {
    return new Set(partyRows.map((row) => row.pet_id));
  }, [partyRows]);

  const partySlots = useMemo<PartySlotView[]>(() => {
    const rowsByIndex = new Map<number, PartySlotRow>();
    for (const row of partyRows) rowsByIndex.set(row.slot_index, row);

    return Array.from({ length: 5 }, (_, idx) => {
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

  const boxPets = useMemo(() => {
    return pets
      .filter((pet) => pet.location === "storage" || pet.location === "active")
      .filter((pet) => !partyPetIds.has(pet.id))
      .sort(sortPetsNewestFirst);
  }, [pets, partyPetIds]);

  const counts = useMemo(() => {
    const base = {
      all: 0,
      egg: 0,
      baby: 0,
      child: 0,
      adult: 0,
      legion: 0,
      mythical: 0,
    } satisfies Record<StorageStageFilter, number>;

    for (const pet of boxPets) {
      base.all += 1;
      const bucket = normalizeStageInternal(pet.stage);
      base[bucket] += 1;
    }

    return base;
  }, [boxPets]);

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

    const outPets = pets
      .filter((pet) => !excludePetIds.has(pet.id))
      .filter((pet) => !effectivePartyRows.some((row) => row.pet_id === pet.id))
      .filter((pet) => pet.location === "active")
      .filter(isUsableActivePet)
      .sort(sortPetsNewestFirst);

    if (outPets.length > 0) {
      return outPets[0].id;
    }

    const storedPets = pets
      .filter((pet) => !excludePetIds.has(pet.id))
      .filter((pet) => !effectivePartyRows.some((row) => row.pet_id === pet.id))
      .filter((pet) => pet.location === "storage")
      .filter(isUsableActivePet)
      .sort(sortPetsNewestFirst);

    if (storedPets.length > 0) {
      return storedPets[0].id;
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
        if (slotIndex < 1 || slotIndex > 5) {
          throw new Error("Party slot must be between 1 and 5.");
        }

        const pet = pets.find((entry) => entry.id === petId);
        if (!pet) throw new Error("Pet not found.");
        if (isEggStage(pet.stage)) {
          throw new Error("Eggs cannot join the party team.");
        }

        const currentActivePet = pets.find((entry) => entry.is_active) ?? null;
        const currentSlotForPet = partyRows.find((row) => row.pet_id === petId);
        const currentOccupant =
          partyRows.find((row) => row.slot_index === slotIndex) ?? null;

        if (currentSlotForPet) {
          const { error } = await supabase
            .from("party_slots")
            .delete()
            .eq("user_id", userId)
            .eq("pet_id", petId);

          if (error) throw error;
        }

        if (currentOccupant && currentOccupant.pet_id !== petId) {
          const { error: removeSlotError } = await supabase
            .from("party_slots")
            .delete()
            .eq("user_id", userId)
            .eq("slot_index", slotIndex);

          if (removeSlotError) throw removeSlotError;

          const { error: returnOldPetError } = await supabase
            .from("pets")
            .update({
              location: "storage",
              is_active: false,
            })
            .eq("user_id", userId)
            .eq("id", currentOccupant.pet_id);

          if (returnOldPetError) throw returnOldPetError;
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

        const shouldBecomeActive =
          !currentActivePet ||
          currentActivePet.id === petId ||
          currentOccupant?.pet_id === currentActivePet.id;

        if (shouldBecomeActive) {
          await setOnlyActivePet(petId);
        }
      });
    },
    [partyRows, pets, userId],
  );

  const returnPartyPetToStorage = useCallback(
    async (slotIndex: number) => {
      await runMutation({ slotIndex }, async () => {
        if (!userId) throw new Error("Missing user.");

        const slot = partySlots.find((entry) => entry.slotIndex === slotIndex);
        if (!slot?.petId) return;

        const pet = petsById.get(slot.petId) ?? null;
        const wasActive = Boolean(pet?.is_active);

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
    [partyRows, partySlots, petsById, userId],
  );

  const setActivePet = useCallback(
    async (petId: string) => {
      await runMutation({ petId }, async () => {
        if (!userId) throw new Error("Missing user.");

        const pet = pets.find((entry) => entry.id === petId);
        if (!pet) throw new Error("Pet not found.");
        if (isEggStage(pet.stage)) {
          throw new Error("Eggs cannot become the active pet.");
        }

        await setOnlyActivePet(petId);
      });
    },
    [pets, userId],
  );

  const bringOutPet = useCallback(
    async (petId: string) => {
      await runMutation({ petId }, async () => {
        if (!userId) throw new Error("Missing user.");

        const { error } = await supabase
          .from("pets")
          .update({
            location: "active",
            is_active: false,
          })
          .eq("id", petId)
          .eq("user_id", userId);

        if (error) throw error;
      });
    },
    [userId],
  );

  const storePet = useCallback(
    async (petId: string) => {
      await runMutation({ petId }, async () => {
        if (!userId) throw new Error("Missing user.");

        const pet = pets.find((entry) => entry.id === petId) ?? null;
        const wasActive = Boolean(pet?.is_active);

        const existingPartyRow = partyRows.find((row) => row.pet_id === petId);
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
    [partyRows, pets, userId],
  );

  return {
    pets: boxPets,
    partySlots,
    firstEmptyPartySlot,
    counts,
    loading,
    error,
    workingPetId,
    workingSlotIndex,
    reload: loadAll,
    assignPetToParty,
    returnPartyPetToStorage,
    storePet,
    bringOutPet,
    setActivePet,
    normalizeStage: normalizeStageInternal,
  };
}
