import { Router } from "express";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { logger } from "../../lib/logger";

export const worldRouter = Router();

worldRouter.get("/aliune-signal", async (_req, res) => {
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("aliune_signal_reports")
    .select(
      "condition, region, corruption, report_text, starts_at, ends_at, created_at",
    )
    .eq("enabled", true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error("[aliune-signal] failed:", error.message);

    return res.status(500).json({
      error: "Failed to load Aliune Signal",
    });
  }

  if (!data) {
    return res.json({
      condition: "stable",
      region: "Kithna",
      corruption: "none",
      reportText: "Kithna is calm. No major instabilities detected.",
    });
  }

  return res.json({
    condition: data.condition,
    region: data.region,
    corruption: data.corruption,
    reportText: data.report_text,
  });
});
