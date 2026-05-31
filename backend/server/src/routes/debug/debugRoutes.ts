import { Router } from "express";
import { getLogBuffer } from "../../lib/logger";

export const debugRouter = Router();

debugRouter.get("/logs", (_req, res) => {
  res.json({
    logs: getLogBuffer(),
  });
});
