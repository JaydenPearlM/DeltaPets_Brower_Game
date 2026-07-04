import { Router } from "express";
import { getLogBuffer, logger, type LogLevel } from "../../lib/logger";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { env } from "../../env.server";
import type { AuthedRequest } from "../../middleware/auth";
import type { Response } from "express";

export const debugRouter = Router();

debugRouter.get("/logs", (_req, res) => {
  res.json({
    logs: getLogBuffer(),
  });
});

debugRouter.post("/client-log", (req, res) => {
  const { level = "info", tag = "client", message = "", data } = req.body ?? {};

  const safeLevel: LogLevel =
    level === "error" || level === "warn" || level === "debug" ? level : "info";

  logger[safeLevel](`[${tag}] ${message}`, data);

  res.json({ ok: true });
});

// ============================================================
// POST /api/debug/self-destruct
//
// Lets the currently authenticated user wipe their own account
// and every row that belongs to it, then delete their auth login
// so the same email can sign up fresh. For local test accounts only.
//
// Safety, three layers, all must pass:
//   1) This router is only mounted at all when NODE_ENV === "development"
//      (see app.ts). Re-checked here too in case that ever changes.
//   2) The caller's own email must match the known test-account pattern.
//      Update TEST_ACCOUNT_EMAIL_PATTERN below if your pattern changes.
//   3) The request body must include the exact confirm string, so no
//      accidental or automated call can trigger this.
//
// Deletes in FK-safe order, same order proven out in the manual SQL
// reset script: run children before runs, pet children before pets,
// eggs/profile-linked rows before profiles, pets before profiles,
// auth.users last of all.
// ============================================================

const TEST_ACCOUNT_EMAIL_PATTERN =
  /^jaydenauthentication6790\+test[0-9]+@gmail\.com$/i;

const SELF_DESTRUCT_CONFIRM_PHRASE = "RESET_MY_TEST_ACCOUNT";

debugRouter.post(
  "/self-destruct",
  async (req: AuthedRequest, res: Response) => {
    if (env.NODE_ENV !== "development") {
      return res
        .status(403)
        .json({ error: "Not available outside development." });
    }

    const userId = req.user?.id;
    const email = req.user?.email ?? "";

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!TEST_ACCOUNT_EMAIL_PATTERN.test(email)) {
      logger.warn(
        "[debug/self-destruct] blocked, email did not match test pattern",
        {
          userId,
          email,
        },
      );
      return res.status(403).json({
        error:
          "This account's email does not match the known test-account pattern.",
      });
    }

    if (req.body?.confirm !== SELF_DESTRUCT_CONFIRM_PHRASE) {
      return res.status(400).json({
        error: `Send { "confirm": "${SELF_DESTRUCT_CONFIRM_PHRASE}" } in the request body to proceed.`,
      });
    }

    try {
      logger.warn("[debug/self-destruct] resetting test account", {
        userId,
        email,
      });

      const { data: ownedPets } = await supabaseAdmin
        .from("pets")
        .select("id")
        .eq("user_id", userId);
      const petIds = (ownedPets ?? []).map((p) => p.id);

      const { data: ownedBattleRuns } = await supabaseAdmin
        .from("battle_runs")
        .select("id")
        .eq("user_id", userId);
      const battleRunIds = (ownedBattleRuns ?? []).map((r) => r.id);

      const { data: ownedPveRuns } = await supabaseAdmin
        .from("pve_instability_runs")
        .select("id")
        .eq("user_id", userId);
      const pveRunIds = (ownedPveRuns ?? []).map((r) => r.id);

      await supabaseAdmin
        .from("signup_trigger_errors")
        .delete()
        .or(`user_id.eq.${userId},email.eq.${email}`);

      if (battleRunIds.length) {
        await supabaseAdmin
          .from("battle_run_fights")
          .delete()
          .in("run_id", battleRunIds);
      }

      if (pveRunIds.length) {
        await supabaseAdmin
          .from("pve_instability_fights")
          .delete()
          .in("run_id", pveRunIds);
      }

      if (petIds.length) {
        await supabaseAdmin.from("pet_mutations").delete().in("pet_id", petIds);
        await supabaseAdmin.from("pet_awards").delete().in("pet_id", petIds);
        await supabaseAdmin
          .from("pet_element_affinities")
          .delete()
          .in("pet_id", petIds);
        await supabaseAdmin.from("pet_elements").delete().in("pet_id", petIds);
        await supabaseAdmin.from("pet_skills").delete().in("pet_id", petIds);
        await supabaseAdmin
          .from("pet_stat_allocations")
          .delete()
          .in("pet_id", petIds);
        await supabaseAdmin.from("pet_stats").delete().in("pet_id", petIds);
      }

      await supabaseAdmin.from("trainer_awards").delete().eq("user_id", userId);
      await supabaseAdmin.from("daily_login_rewards").delete().eq("id", userId);
      await supabaseAdmin
        .from("hatchery_shelf_slots")
        .delete()
        .eq("user_id", userId);
      await supabaseAdmin.from("hatchery_slots").delete().eq("user_id", userId);
      await supabaseAdmin.from("party_slots").delete().eq("user_id", userId);
      await supabaseAdmin.from("home_objects").delete().eq("user_id", userId);
      await supabaseAdmin.from("inventory").delete().eq("user_id", userId);
      await supabaseAdmin.from("eggs").delete().eq("user_id", userId);
      await supabaseAdmin.from("wallet_ledger").delete().eq("user_id", userId);
      await supabaseAdmin.from("battle_runs").delete().eq("user_id", userId);
      await supabaseAdmin
        .from("pve_instability_runs")
        .delete()
        .eq("user_id", userId);
      await supabaseAdmin
        .from("pve_active_buffs")
        .delete()
        .eq("user_id", userId);
      await supabaseAdmin
        .from("pve_research_stats")
        .delete()
        .eq("user_id", userId);
      await supabaseAdmin.from("daily_care").delete().eq("user_id", userId);
      await supabaseAdmin.from("user_resources").delete().eq("user_id", userId);
      await supabaseAdmin.from("wallets").delete().eq("user_id", userId);

      // Pets after all pet children are gone.
      await supabaseAdmin.from("pets").delete().eq("user_id", userId);

      // Profile after eggs are gone.
      await supabaseAdmin.from("profiles").delete().eq("user_id", userId);

      // Finally, remove the login itself so this email can sign up fresh.
      const { error: authDeleteError } =
        await supabaseAdmin.auth.admin.deleteUser(userId);

      if (authDeleteError) {
        logger.error(
          "[debug/self-destruct] auth user delete failed",
          authDeleteError,
        );
        return res.status(500).json({
          error:
            "All game data was wiped, but the login itself failed to delete.",
          details: authDeleteError.message,
        });
      }

      logger.warn("[debug/self-destruct] reset complete", { userId, email });

      return res.json({ ok: true, message: `Reset complete for ${email}.` });
    } catch (err: any) {
      logger.error("[debug/self-destruct] failed", err);
      return res.status(500).json({ error: err?.message ?? "Reset failed." });
    }
  },
);
