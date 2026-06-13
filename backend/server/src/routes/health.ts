import { Router } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  const { error } = await supabaseAdmin.from("profiles").select("id").limit(1);

  if (error) {
    res.status(503).json({
      ok: false,
      uptime: Math.floor(process.uptime()),
      database: "down",
      error: error.message,
    });
    return;
  }

  res.json({
    ok: true,
    uptime: Math.floor(process.uptime()),
    database: "up",
  });
});
