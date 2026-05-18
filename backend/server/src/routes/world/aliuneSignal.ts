import { Router } from "express";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

const router = Router();

router.get("/aliune-signal", async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("aliune_signal_reports")
      .select("*")
      .eq("enabled", true)
      .or("starts_at.is.null,starts_at.lte.now()")
      .or("ends_at.is.null,ends_at.gte.now()")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[aliune-signal] failed:", error.message);

      return res.status(500).json({
        error: "Failed to fetch Aliune Signal",
      });
    }

    if (!data) {
      return res.json({
        condition: "stable",
        region: "Kithna",
        corruption: "low",
        reportText: "No active Aliune Signal detected.",
      });
    }

    return res.json({
      condition: data.condition,
      region: data.region,
      corruption: data.corruption,
      reportText: data.report_text,
    });
  } catch (error) {
    console.error("[aliune-signal] unexpected error:", error);

    return res.status(500).json({
      error: "Unexpected server error",
    });
  }
});

export default router;
