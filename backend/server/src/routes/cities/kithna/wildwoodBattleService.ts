import { randomInt, randomUUID } from "node:crypto";
import { z } from "zod";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { getDeltaTime } from "../../../lib/deltaTime";
import { rollIV } from "../../../lib/stats/individualValues";
import { createBattle, previewBattleOrder, resolveBattleAction } from "../../../battle/battleEngine";
import type { BattleParticipantInput, BattleState } from "../../../battle/battleTypes";
import type { WildwoodExploreRequest, WildwoodRoomView, WildwoodSession, WildwoodTeamMember } from "../../../shared/battle/wildwoodTypes";
import { findPetSpeciesById } from "../../../shared/pets/species/all-species";
import { getKithnaEggsForTime } from "../../../shared/pets/species/kithna-species";
import { VELUNE } from "../../../shared/pets/species/legendary-species";
import { getWildwoodState, selectProceduralEvent, SOMETHINGS_AFOOT_KEY, SOMETHINGS_AFOOT_TARGET } from "./wildwoodState";

export class WildwoodError extends Error {
  constructor(message: string, public readonly status: number = 409) { super(message); }
}

export const exploreSchema = z.object({
  requestId: z.uuid(),
  previousRoomId: z.uuid().nullable(),
  formation: z.array(z.object({ petId: z.uuid(), row: z.enum(["front", "middle", "back"]) }).strict()).min(1).max(4),
}).strict();

type RoomPayload = {
  version: 1;
  revision: number;
  requestId: string;
  message: string;
  battle: BattleState | null;
  images: Record<string, string | null>;
  questProgressTarget: number | null;
};
type Room = { id: string; sequence_number: number; event_payload: RoomPayload; status: string };
const roomColumns = "id, sequence_number, event_payload, status";

// The room payload is server-written, versioned state. Never accept it in a request.
function payload(room: Room): RoomPayload {
  if (room.event_payload?.version !== 1) throw new WildwoodError("This expedition uses an unsupported room version. Please contact support.");
  return room.event_payload;
}
function view(room: Room | null): WildwoodRoomView | null {
  if (!room) return null;
  const data = payload(room);
  return { id: room.id, sequence: room.sequence_number, message: data.message, battle: data.battle, turnOrder: data.battle ? previewBattleOrder(data.battle) : [], corrupted: data.battle !== null, images: data.images, questProgressTarget: data.questProgressTarget };
}

async function activeExpedition(userId: string, create: boolean): Promise<string | null> {
  const state = await getWildwoodState(userId);
  if (!state.wildwoodUnlocked) {
    if (create) throw new WildwoodError("Accept Somethings Afoot before exploring Wildwood.", 403);
    return null;
  }
  if (state.expedition) return state.expedition.id;
  if (!create) return null;
  const inserted = await supabaseAdmin.from("wildwood_expeditions").insert({ user_id: userId }).select("id").single();
  if (!inserted.error) return inserted.data.id;
  // The unique active-expedition index handles simultaneous first visits.
  if (inserted.error.code !== "23505") throw inserted.error;
  const refreshed = await getWildwoodState(userId);
  if (!refreshed.expedition) throw new WildwoodError("Expedition changed. Reload Wildwood.");
  return refreshed.expedition.id;
}

async function latestRoom(expeditionId: string): Promise<Room | null> {
  const result = await supabaseAdmin.from("wildwood_rooms").select(roomColumns)
    .eq("expedition_id", expeditionId).order("sequence_number", { ascending: false }).limit(1).returns<Room[]>().maybeSingle();
  if (result.error) throw result.error;
  return result.data;
}

/** A persisted victory carries an absolute target, never a repeatable +1 request. */
async function settleQuest(userId: string, room: Room | null) {
  if (!room) return;
  const data = payload(room);
  if (data.battle?.status !== "victory" || data.questProgressTarget === null) return;
  const target = Math.min(SOMETHINGS_AFOOT_TARGET, data.questProgressTarget);
  const result = await supabaseAdmin.from("player_quests").update({
    progress: target,
    status: target === SOMETHINGS_AFOOT_TARGET ? "ready_to_turn_in" : "active",
  }).eq("user_id", userId).eq("quest_key", SOMETHINGS_AFOOT_KEY)
    .eq("status", "active").lt("progress", target);
  if (result.error) throw result.error;
}

const petSchema = z.object({
  id: z.string(), name: z.string().nullable(), species: z.string(), line: z.string(),
  level: z.number().int().min(1).max(10), stage: z.string(), ran_away: z.boolean(),
  hp_max: z.number().int().positive(), hp_cur: z.number().int().nonnegative(),
  atk: z.number().int().nonnegative(), def: z.number().int().nonnegative(),
  magi: z.number().int().nonnegative(), spd: z.number().int().positive(),
  portrait_url: z.string().nullable().optional(), image_url: z.string().nullable().optional(), sprite_url: z.string().nullable().optional(),
});

async function loadTeam(userId: string): Promise<WildwoodTeamMember[]> {
  const slots = await supabaseAdmin.from("party_slots").select("pet_id, slot_index").eq("user_id", userId).order("slot_index");
  if (slots.error) throw slots.error;
  const ids: string[] = (slots.data ?? []).map((slot) => slot.pet_id);
  if (!ids.length) return [];
  if (ids.length > 4 || new Set(ids).size !== ids.length) throw new WildwoodError("Your team has invalid slots. Check the Hatchery.");
  const result = await supabaseAdmin.from("pets").select("*").eq("user_id", userId).in("id", ids);
  if (result.error) throw result.error;
  const parsed = z.array(petSchema).safeParse(result.data);
  if (!parsed.success || parsed.data.length !== ids.length) throw new WildwoodError("A team member has incomplete battle stats. Check your team in the Hatchery.");
  if (parsed.data.some((pet) => pet.species === VELUNE.id)) {
    const trainer = await supabaseAdmin.from("trainer_progression").select("trainer_level").eq("user_id", userId).maybeSingle();
    if (trainer.error) throw trainer.error;
    if ((trainer.data?.trainer_level ?? 1) < VELUNE.requiredTrainerLevel) throw new WildwoodError("Trainer Level 10 is required to battle with Velune.", 403);
  }
  return ids.map((id, index) => {
    const pet = parsed.data.find((entry) => entry.id === id)!;
    const species = findPetSpeciesById(pet.species);
    if (!species || pet.stage === "egg" || pet.ran_away) throw new WildwoodError("Only hatched, available Kith can enter battle.");
    const element = z.enum(["null_element", "fire", "water", "earth", "air", "ice", "storm", "light", "shadow"]).safeParse(pet.line);
    if (!element.success) throw new WildwoodError("A team member has an unsupported element.");
    return {
      id: pet.id, sourcePetId: pet.id, speciesId: pet.species,
      name: pet.name || ("displayName" in species ? species.displayName : species.evolution.hatchling),
      side: "player", row: index === 0 ? "front" : index === 3 ? "back" : "middle", element: element.data,
      level: pet.level, hpMax: pet.hp_max, hpCur: Math.min(pet.hp_cur, pet.hp_max),
      atk: pet.atk, def: pet.def, magi: pet.magi, spd: pet.spd,
      imageUrl: pet.portrait_url || pet.image_url || pet.sprite_url || null,
    };
  });
}

function corruptedEnemy(): BattleParticipantInput {
  const pool = getKithnaEggsForTime(getDeltaTime(new Date()).timeOfDay);
  if (!pool.length) throw new WildwoodError("No Wildwood encounters are available right now.");
  let roll = randomInt(pool.reduce((sum, species) => sum + species.rules.encounterWeight, 0));
  const species = pool.find((entry) => { roll -= entry.rules.encounterWeight; return roll < 0; })!;
  const base = species.eggBaseStats;
  const iv = rollIV();
  // First slice: a normal level-one Kith roll, with corruption as encounter metadata.
  return {
    id: randomUUID(), speciesId: species.id, name: `Corrupted ${species.evolution.hatchling}`,
    side: "enemy", row: "front", element: species.line, level: 1,
    hpMax: (base.hp + iv.hp) * 2, hpCur: (base.hp + iv.hp) * 2,
    atk: base.atk + iv.atk, def: base.def + iv.def, magi: base.magi + iv.magi, spd: base.spd + iv.spd,
  };
}

export async function getWildwoodSession(userId: string): Promise<WildwoodSession> {
  const expeditionId = await activeExpedition(userId, false);
  const room = expeditionId ? await latestRoom(expeditionId) : null;
  await settleQuest(userId, room);
  // An ongoing battle remains recoverable even if the party changed elsewhere.
  const team = room && payload(room).battle?.status === "active" ? [] : await loadTeam(userId);
  return { team, room: view(room) };
}

export async function exploreWildwood(userId: string, request: WildwoodExploreRequest): Promise<WildwoodSession> {
  const expeditionId = await activeExpedition(userId, true);
  if (!expeditionId) throw new WildwoodError("No active expedition.");
  const previous = await latestRoom(expeditionId);
  if (previous && payload(previous).requestId === request.requestId) return getWildwoodSession(userId);
  if ((previous?.id ?? null) !== request.previousRoomId) throw new WildwoodError("Wildwood changed in another tab. Reload before exploring.");
  if (previous && payload(previous).battle?.status === "active") throw new WildwoodError("Finish your current battle before exploring.");
  await settleQuest(userId, previous);
  const team = await loadTeam(userId);
  if (!team.length || !team.some((pet) => pet.hpCur > 0)) throw new WildwoodError("Your team needs a living Kith before exploring.");
  const chosen = new Map(request.formation.map((entry) => [entry.petId, entry.row]));
  if (chosen.size !== team.length || request.formation.length !== team.length || team.some((pet) => !chosen.has(pet.id))) throw new WildwoodError("Your team changed. Reload your formation.");
  const quest = (await getWildwoodState(userId)).quest;
  const event = selectProceduralEvent(0, true);
  const profile = await supabaseAdmin.from("profiles").select("active_title").eq("user_id", userId).maybeSingle();
  if (profile.error) throw profile.error;
  const players = team.map(({ imageUrl: _image, ...pet }) => ({ ...pet, row: chosen.get(pet.id)! }));
  const battle = event === "corrupted_battle" ? createBattle(randomUUID(), [...players, corruptedEnemy()], profile.data?.active_title === "Alpha Pro" ? 1.05 : 1) : null;
  const images = Object.fromEntries(team.map((pet) => [pet.id, pet.imageUrl]));
  const data: RoomPayload = {
    version: 1, revision: 0, requestId: request.requestId, battle, images,
    message: battle ? "A corrupted Kith blocks the path." : "You follow the woodland path. No corrupted Kith appeared this time.",
    questProgressTarget: battle && quest.status === "active" ? Math.min(quest.progress + 1, SOMETHINGS_AFOOT_TARGET) : null,
  };
  const inserted = await supabaseAdmin.from("wildwood_rooms").insert({
    expedition_id: expeditionId, sequence_number: (previous?.sequence_number ?? 0) + 1,
    event_kind: event, event_payload: data, battle_id: battle?.id ?? null,
    status: battle?.status === "active" ? "unresolved" : "resolved",
    resolved_at: battle?.status === "active" ? null : new Date().toISOString(),
  }).select(roomColumns).returns<Room[]>().single();
  if (inserted.error) {
    if (inserted.error.code === "23505") throw new WildwoodError("Another exploration was already processed. Reload Wildwood.");
    throw inserted.error;
  }
  await settleQuest(userId, inserted.data);
  return { team, room: view(inserted.data) };
}

export async function actInWildwood(userId: string, battleId: string, input: unknown): Promise<WildwoodSession> {
  const expeditionId = await activeExpedition(userId, false);
  const room = expeditionId ? await latestRoom(expeditionId) : null;
  if (!room || payload(room).battle?.id !== battleId) throw new WildwoodError("Battle not found.", 404);
  const data = payload(room);
  if (!data.battle) throw new WildwoodError("Battle not found.", 404);
  const next = resolveBattleAction(data.battle, input);
  const updated = await supabaseAdmin.from("wildwood_rooms").update({
    event_payload: { ...data, revision: data.revision + 1, battle: next },
    status: next.status === "active" ? "unresolved" : "resolved",
    resolved_at: next.status === "active" ? null : new Date().toISOString(),
  }).eq("id", room.id).eq("expedition_id", expeditionId)
    .eq("event_payload->>revision", String(data.revision)).select(roomColumns).returns<Room[]>().maybeSingle();
  if (updated.error) throw updated.error;
  if (!updated.data) throw new WildwoodError("That turn was already processed. Reload the battle.");
  await settleQuest(userId, updated.data);
  return { team: [], room: view(updated.data) };
}
