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

      // Keep pet children and pet deletion in one transaction with Favorite locks.
      const { error: resetError } = await supabaseAdmin.rpc("reset_test_account_game_data", {
        p_user_id: userId,
        p_email: email,
        p_confirm: req.body.confirm,
      });
      if (resetError) {
        if (resetError.code === "P0001") return res.status(409).json({ error: resetError.message });
        throw new Error("Account reset failed. No game data was changed.");
      }

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
