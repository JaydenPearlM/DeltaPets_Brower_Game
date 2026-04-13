import { Router } from "express";
import { env } from "../env.server";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({
    ok: true,
    env: env.NODE_ENV,
    uptime: Math.floor(process.uptime()),
  });
});
