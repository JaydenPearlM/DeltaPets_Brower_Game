import { Router } from "express";
import type { Request, Response } from "express";
import { requireUser, type AuthedRequest } from "../../middleware/auth";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { logger } from "../../lib/logger";

export const pveInstabilitiesRouter = Router();

// GET /pve/instabilities - List active instabilities (no auth required)
pveInstabilitiesRouter.get(
  "/instabilities",
  async (req: Request<{}, {}, {}, { region?: string }>, res: Response) => {
    const region = req.query.region || "Kithna";

    try {
      const { data: instabilities, error } = await supabaseAdmin
        .from("pve_instabilities")
        .select("*")
        .eq("enabled", true)
        .eq("region", region)
        .gt("expires_at", new Date().toISOString())
        .order("spawned_at", { ascending: false })
        .limit(10);

      if (error) {
        logger.error("[pve-instabilities] fetch failed", error);
        return res.status(500).json({ error: "Failed to fetch instabilities" });
      }

      return res.json({ instabilities: instabilities || [] });
    } catch (err) {
      logger.error("[pve-instabilities] unexpected error", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

// POST /pve/instabilities/:id/start - Start an instability run
pveInstabilitiesRouter.post(
  "/instabilities/:id/start",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    const userId = req.user?.id;
    const instabilityId = req.params.id;
    const { petId } = req.body;

    if (!petId) {
      return res.status(400).json({ error: "petId is required" });
    }

    try {
      // Verify instability exists and is active
      const { data: instability, error: instabilityError } = await supabaseAdmin
        .from("pve_instabilities")
        .select("*")
        .eq("id", instabilityId)
        .eq("enabled", true)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (instabilityError || !instability) {
        return res
          .status(404)
          .json({ error: "Instability not found or expired" });
      }

      // Verify pet ownership
      const { data: pet, error: petError } = await supabaseAdmin
        .from("pets")
        .select("id, name, level")
        .eq("id", petId)
        .eq("user_id", userId)
        .single();

      if (petError || !pet) {
        return res.status(404).json({ error: "Pet not found" });
      }

      // Check if user already has an active run for this instability
      const { data: existingRun } = await supabaseAdmin
        .from("pve_instability_runs")
        .select("id, status")
        .eq("user_id", userId)
        .eq("instability_id", instabilityId)
        .eq("status", "in_progress")
        .single();

      if (existingRun) {
        return res.status(400).json({
          error: "You already have an active run for this instability",
          runId: existingRun.id,
        });
      }

      // Create new run
      const { data: run, error: runError } = await supabaseAdmin
        .from("pve_instability_runs")
        .insert({
          user_id: userId,
          instability_id: instabilityId,
          pet_id: petId,
          status: "in_progress",
          current_fight: 1,
        })
        .select()
        .single();

      if (runError || !run) {
        logger.error("[pve-start-run] insert failed", runError);
        return res.status(500).json({ error: "Failed to create run" });
      }

      return res.json({
        run,
        instability,
        pet,
      });
    } catch (err) {
      logger.error("[pve-start-run] unexpected error", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

// GET /pve/runs/:id - Get run details
pveInstabilitiesRouter.get(
  "/runs/:id",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    const userId = req.user?.id;
    const runId = req.params.id;

    try {
      const { data: run, error: runError } = await supabaseAdmin
        .from("pve_instability_runs")
        .select(
          "*, instability:pve_instabilities(*), pet:pets(id, name, level)",
        )
        .eq("id", runId)
        .eq("user_id", userId)
        .single();

      if (runError || !run) {
        return res.status(404).json({ error: "Run not found" });
      }

      const { data: fights } = await supabaseAdmin
        .from("pve_instability_fights")
        .select("*")
        .eq("run_id", runId)
        .order("fight_number", { ascending: true });

      return res.json({
        run,
        fights: fights || [],
      });
    } catch (err) {
      logger.error("[pve-get-run] unexpected error", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

// POST /pve/runs/:id/complete - Complete an instability run
pveInstabilitiesRouter.post(
  "/runs/:id/complete",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    const userId = req.user?.id;
    const runId = req.params.id;

    try {
      // Verify run ownership and status
      const { data: run, error: runError } = await supabaseAdmin
        .from("pve_instability_runs")
        .select("*, instability:pve_instabilities(*)")
        .eq("id", runId)
        .eq("user_id", userId)
        .eq("status", "in_progress")
        .single();

      if (runError || !run) {
        return res
          .status(404)
          .json({ error: "Run not found or already completed" });
      }

      // Verify all fights are completed
      const instability = run.instability as any;
      const totalFights = instability.total_fights;

      const { count: completedFights } = await supabaseAdmin
        .from("pve_instability_fights")
        .select("*", { count: "exact", head: true })
        .eq("run_id", runId)
        .eq("result", "victory");

      if (completedFights !== totalFights) {
        return res.status(400).json({
          error: "Not all fights completed",
          completed: completedFights,
          total: totalFights,
        });
      }

      // Mark run as completed
      const { error: updateError } = await supabaseAdmin
        .from("pve_instability_runs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId);

      if (updateError) {
        logger.error("[pve-complete-run] update failed", updateError);
        return res.status(500).json({ error: "Failed to complete run" });
      }

      // Update research stats
      await supabaseAdmin.rpc("increment_pve_research_stats", {
        p_user_id: userId,
        p_instabilities_cleared: 1,
        p_fights_won: totalFights,
        p_bosses_defeated: instability.has_boss ? 1 : 0,
      });

      // Apply buffs if any
      const rewardBuffs = instability.reward_buffs || [];
      if (Array.isArray(rewardBuffs) && rewardBuffs.length > 0) {
        const buffInserts = rewardBuffs.map((buff: any) => ({
          user_id: userId,
          buff_type: buff.type,
          strength: buff.strength || 1.0,
          description: buff.description,
          expires_at: new Date(
            Date.now() + (buff.duration_hours || 2) * 60 * 60 * 1000,
          ).toISOString(),
        }));

        await supabaseAdmin.from("pve_active_buffs").insert(buffInserts);
      }

      return res.json({
        success: true,
        rewards: {
          xp: instability.reward_xp,
          materials: instability.reward_materials,
          buffs: rewardBuffs,
        },
      });
    } catch (err) {
      logger.error("[pve-complete-run] unexpected error", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

// GET /pve/buffs - Get active buffs for user
pveInstabilitiesRouter.get(
  "/buffs",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    const userId = req.user?.id;

    try {
      const { data: buffs, error } = await supabaseAdmin
        .from("pve_active_buffs")
        .select("*")
        .eq("user_id", userId)
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false });

      if (error) {
        logger.error("[pve-buffs] fetch failed", error);
        return res.status(500).json({ error: "Failed to fetch buffs" });
      }

      return res.json({ buffs: buffs || [] });
    } catch (err) {
      logger.error("[pve-buffs] unexpected error", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

// GET /pve/research - Get research stats
pveInstabilitiesRouter.get(
  "/research",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    const userId = req.user?.id;

    try {
      const { data: stats, error } = await supabaseAdmin
        .from("pve_research_stats")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        logger.error("[pve-research] fetch failed", error);
        return res
          .status(500)
          .json({ error: "Failed to fetch research stats" });
      }

      // Create stats if they don't exist
      if (!stats) {
        const { data: newStats, error: insertError } = await supabaseAdmin
          .from("pve_research_stats")
          .insert({ user_id: userId })
          .select()
          .single();

        if (insertError) {
          logger.error("[pve-research] insert failed", insertError);
          return res
            .status(500)
            .json({ error: "Failed to create research stats" });
        }

        return res.json({ stats: newStats });
      }

      return res.json({ stats });
    } catch (err) {
      logger.error("[pve-research] unexpected error", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);
