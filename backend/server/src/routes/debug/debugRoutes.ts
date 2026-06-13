import { Router } from "express";
import { getLogBuffer, logger } from "../../lib/logger";

export const debugRouter = Router();

debugRouter.get("/logs", (_req, res) => {
  res.json({
    logs: getLogBuffer(),
  });
});

debugRouter.post("/client-log", (req, res) => {
  const { level = "info", tag = "client", message = "", data } = req.body ?? {};

  const safeLevel =
    level === "error" || level === "warn" || level === "debug" ? level : "info";

  logger[safeLevel](`[${tag}] ${message}`, data);

  res.json({ ok: true });
});
