import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api/baseClient";
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
  rarity?: string | null;
  energy?: number | null;
  bond?: number | null;
  stage: string | null;
  line: string | null;
  level: number | null;
  location: string | null;
  is_active: boolean | null;
  runaway_at?: string | null;
  ran_away?: boolean | null;
  created_at: string | null;
  hatched_at: string | null;
  hatch_ends_at?: string | null;
  portrait_url?: string | null;
  current_hp?: number | null;
  max_hp?: number | null;

  hp?: number | null;
  atk?: number | null;
  magi?: number | null;
  def?: number | null;
  spd?: number | null;
  mana?: number | null;
  personality_key?: string | null;
  passive_trait_id?: string | null;
  passive_trait_key?: string | null;
  passive_trait_name?: string | null;
  passive_trait_rarity?: string | null;
  passive_trait_description?: string | null;
  passive_trait_effect_summary?: string | null;
  passive_trait_effects?: Record<string, unknown> | null;
  passive_trait_stat_key?: string | null;
  base_total?: number | null;
  pending_hatch_minutes?: number | null;
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
  refreshSignal?: number;
  onMutated?: () => void;
};
type StorageAction =
  | "assign_party"
  | "return_party"
  | "store_pet"
  | "set_active"
  | "incubate_storage"
  | "incubate_inventory"
  | "store_inventory_egg"
  | "store_hatchery_egg";
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

function isRunawayPet(pet?: StoragePet | null) {
  if (!pet) return false;
  return Boolean(pet.runaway_at ?? pet.ran_away);
}

function isPartyEligible(pet?: StoragePet | null) {
  if (!pet) return false;
  if (isRunawayPet(pet)) return false;
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
  const { userId, onMutated } = options;

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
    rarity,
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
    ran_away,
    runaway_at,
    created_at,
    hatched_at,
    hatch_ends_at,
    pending_hatch_minutes
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
          rarity: pet.rarity ?? null,
          energy: pet.energy,
          bond: pet.bond,
          stage: pet.stage,
          line: pet.line,
          level: pet.level,
          location: pet.location,
          is_active: pet.is_active,
          runaway_at: pet.runaway_at ?? null,
          ran_away: pet.ran_away ?? null,
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
          pending_hatch_minutes: pet.pending_hatch_minutes ?? null,
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
      const rawPet = row ? (petsById.get(row.pet_id) ?? null) : null;
      const pet = isPartyEligible(rawPet) ? rawPet : null;

      return {
        slotIndex,
        entryId: pet ? (row?.id ?? null) : null,
        petId: pet ? (row?.pet_id ?? null) : null,
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
        if (isRunawayPet(pet)) return false;
        if (pet.location === "storage") return true;
        if (pet.location === "active" && !partyPetIds.has(pet.id)) return true;
        if (pet.location === "party" && !partyPetIds.has(pet.id)) return true;
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

  // Eggs found while roaming Kithna land here first (location: "inventory")
  // instead of being auto-placed into the hatchery. The player chooses to
  // send each one to Storage or start incubating it.
  const inventoryEggs = useMemo(() => {
    return pets
      .filter((pet) => pet.location === "inventory")
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

  // The API validates ownership and applies the entire move in one transaction.
  // Reads stay here so the existing storage presentation remains unchanged.
  const runStorageAction = useCallback(
    async (action: StorageAction, petId?: string, slotIndex?: number) => {
      setWorkingPetId(petId ?? null);
      setWorkingSlotIndex(slotIndex ?? null);
      setError("");
      try {
        await apiFetch("/api/pets/storage/action", {
          method: "POST",
          json: {
            action,
            ...(petId ? { petId } : {}),
            ...(slotIndex !== undefined ? { slotIndex } : {}),
          },
        });
        await loadAll();
        onMutated?.();
      } catch (problem: unknown) {
        setError(problem instanceof Error ? problem.message : "Storage update failed.");
      } finally {
        setWorkingPetId(null);
        setWorkingSlotIndex(null);
      }
    },
    [loadAll, onMutated],
  );

  const assignPetToParty = (petId: string, slotIndex: number) =>
    runStorageAction("assign_party", petId, slotIndex);
  const returnPartyPetToStorage = (slotIndex: number) =>
    runStorageAction("return_party", undefined, slotIndex);
  const storePet = (petId: string) => runStorageAction("store_pet", petId);
  const setActivePet = (petId: string) => runStorageAction("set_active", petId);
  const moveEggToIncubator = (petId: string) => runStorageAction("incubate_storage", petId);
  const moveEggFromInventoryToHatchery = (petId: string) =>
    runStorageAction("incubate_inventory", petId);
  const moveEggFromInventoryToStorage = (petId: string) =>
    runStorageAction("store_inventory_egg", petId);
  const moveEggToStorage = (petId: string) =>
    runStorageAction("store_hatchery_egg", petId);
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
    inventoryEggs,
    reload: loadAll,
    assignPetToParty,
    returnPartyPetToStorage,
    storePet,
    setActivePet,
    moveEggToIncubator,
    moveEggToStorage,
    moveEggFromInventoryToStorage,
    moveEggFromInventoryToHatchery,
    normalizeStage: normalizeStageInternal,
    caps: {
      total: STORAGE_TOTAL_CAP,
      eggs: STORAGE_EGG_CAP,
      pets: STORAGE_PET_CAP,
      party: PARTY_SLOT_COUNT,
    },
  };
}
