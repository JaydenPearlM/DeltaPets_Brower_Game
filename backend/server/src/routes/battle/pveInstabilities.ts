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
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!runId) {
        return res.status(400).json({ error: "Invalid run ID" });
      }

      // Complete the run and apply rewards atomically.
      // The server-only database function must be installed first.
      const { data, error } = await supabaseAdmin.rpc(
        "complete_pve_instability_run",
        {
          p_user_id: userId,
          p_run_id: runId,
        },
      );

      if (error) {
        logger.error("[pve-complete-run] completion RPC failed", error);
        return res.status(500).json({
          error: "Failed to complete run",
        });
      }

      // Validate the database response before processing it.
      if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data) ||
        typeof data.outcome !== "string"
      ) {
        logger.error("[pve-complete-run] invalid completion response", data);

        return res.status(500).json({
          error: "Invalid completion response",
        });
      }

      // Run does not exist, belongs to another player,
      // or is no longer eligible for completion.
      if (data.outcome === "not_found") {
        return res.status(404).json({
          error: "Run not found or already completed",
        });
      }

      // The required fights have not all been won.
      if (data.outcome === "incomplete") {
        return res.status(400).json({
          error: "Not all fights completed",
          completed: data.completed,
          total: data.total,
        });
      }

      // Safe retry: rewards were already applied.
      // Do not grant research or buffs again.
      if (data.outcome === "already_completed") {
        return res.status(200).json({
          success: true,
          alreadyCompleted: true,
        });
      }

      // Reject unexpected results instead of reporting success.
      if (data.outcome !== "completed") {
        logger.error("[pve-complete-run] unexpected completion outcome", data);

        return res.status(500).json({
          error: "Unexpected completion result",
        });
      }

      // Preserve the existing successful response structure.
      return res.json({
        success: true,
        rewards: data.rewards,
      });
    } catch (err) {
      logger.error("[pve-complete-run] unexpected error", err);

      return res.status(500).json({
        error: "Internal server error",
      });
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
