import { Router } from "express";

export const meRouter = Router();

meRouter.get("/me", (_req, res) => {
  res.json({ ok: true });
});
