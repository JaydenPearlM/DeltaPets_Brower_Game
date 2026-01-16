import { Router } from "express";

export const abuseTestRouter = Router();

abuseTestRouter.get("/abuse-test", (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});
