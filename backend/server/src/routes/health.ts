import type { Request, Response } from "express";
import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/health", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: "deltapets-backend",
    ts: new Date().toISOString(),
  });
});
