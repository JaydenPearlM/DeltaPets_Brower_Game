// backend/server/src/routes/care/care.ts

import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../../middleware/auth";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { fetchTotalPoints } from "../routePets/petsStats";

export const careRouter = Router();

careRouter.get("/current", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.id;

  try {
    const [
      { data: activePet, error: petError },
      { data: slotRows, error: slotError },
    ] = await Promise.all([
      supabaseAdmin
        .from("pets")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle(),

      supabaseAdmin
        .from("party_slots")
        .select("pet_id,slot_index")
        .eq("user_id", userId)
        .order("slot_index", { ascending: true }),
    ]);

    if (petError) {
      return res.status(500).json({ error: petError.message });
    }

    if (slotError) {
      return res.status(500).json({ error: slotError.message });
    }

    const normalizedSlots = (slotRows ?? [])
      .filter((row: any) => row?.pet_id && Number(row?.slot_index ?? 0) >= 1)
      .sort(
        (a: any, b: any) =>
          Number(a?.slot_index ?? 0) - Number(b?.slot_index ?? 0),
      )
      .slice(0, 4);

    const teamPetIds = normalizedSlots
      .map((row: any) => row.pet_id)
      .filter((value: unknown): value is string => typeof value === "string");

    let team: any[] = [];

    if (teamPetIds.length) {
      const { data: teamPets, error: teamError } = await supabaseAdmin
        .from("pets")
        .select("*")
        .in("id", teamPetIds);

      if (teamError) {
        return res.status(500).json({ error: teamError.message });
      }

      const petMap = new Map<string, any>(
        (teamPets ?? []).map((row: any) => [String(row.id), row]),
      );

      team = normalizedSlots
        .map((slot: any) => {
          const source = petMap.get(String(slot.pet_id));
          if (!source?.id) return null;

          const rawElement = String(source.element ?? source.line ?? "null")
            .trim()
            .toLowerCase();

          const rawStage = String(source.stage ?? "unknown")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "_");

          return {
            id: String(source.id),
            slotIndex: Number(slot.slot_index ?? 0),
            species: source.name?.trim() || "Unknown Delta",
            nickname:
              source.nickname?.trim() || source.name?.trim() || "Unnamed Delta",
            stage: String(source.stage ?? "Unknown")
              .replace(/_/g, " ")
              .replace(/\b\w/g, (char) => char.toUpperCase()),
            stageKey: rawStage,
            element: String(source.element ?? source.line ?? "Null")
              .replace(/_/g, " ")
              .replace(/\b\w/g, (char) => char.toUpperCase()),
            elementKey: rawElement === "null_element" ? "null" : rawElement,
            level: Number(source.level ?? 1),
            hunger: Math.max(0, Math.min(100, Number(source.hunger ?? 0))),
            cleanliness: Math.max(
              0,
              Math.min(100, Number(source.cleanliness ?? 0)),
            ),
            happiness: Math.max(
              0,
              Math.min(100, Number(source.happiness ?? 0)),
            ),
            bond: Math.max(0, Math.min(100, Number(source.bond ?? 0))),
            isActive: Boolean(source.is_active),
            previewUrl:
              source.portrait_url ||
              source.sprite_url ||
              source.image_url ||
              null,
          };
        })
        .filter(Boolean);
    }

    if (!activePet) {
      return res.json({
        pet: null,
        stats: null,
        total_points: null,
        hp_display: null,
        elements: null,
        team,
      });
    }

    let stats: any = null;
    let total_points: number | null = null;
    let hp_display: number | null = null;

    const [pointsResult, elementsResult] = await Promise.all([
      fetchTotalPoints((activePet as any).id).catch(() => null),
      supabaseAdmin
        .from("pet_elements")
        .select("*")
        .eq("pet_id", (activePet as any).id)
        .maybeSingle(),
    ]);

    if (pointsResult) {
      stats = pointsResult.total ?? null;
      total_points = pointsResult.total_points ?? null;
      hp_display = pointsResult.hp_display ?? null;
    }

    if (elementsResult.error) {
      return res.json({
        pet: {
          ...activePet,
          personality_name:
            (activePet as any).personality_name ??
            (activePet as any).personality ??
            (activePet as any).personality_key ??
            null,
        },
        stats,
        total_points,
        hp_display,
        elements: null,
        team,
      });
    }

    const elementsRow = elementsResult.data;

    const elements =
      elementsRow && typeof elementsRow === "object"
        ? {
            null:
              (elementsRow as any).null ??
              (elementsRow as any).null_element ??
              0,
            water: (elementsRow as any).water ?? 0,
            fire: (elementsRow as any).fire ?? 0,
            earth: (elementsRow as any).earth ?? 0,
            air: (elementsRow as any).air ?? 0,
            ice: (elementsRow as any).ice ?? 0,
            storm: (elementsRow as any).storm ?? 0,
            light: (elementsRow as any).light ?? 0,
            shadow: (elementsRow as any).shadow ?? 0,
          }
        : null;

    return res.json({
      pet: {
        ...activePet,
        personality_name:
          (activePet as any).personality_name ??
          (activePet as any).personality ??
          (activePet as any).personality_key ??
          null,
      },
      stats,
      total_points,
      hp_display,
      elements,
      team,
    });
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to load pet page.",
    });
  }
});
