import { Router } from "express";
import { env } from "../../env.server";

const alphaAccessRouter = Router();

alphaAccessRouter.post("/", (req, res) => {
  const password =
    typeof req.body?.password === "string" ? req.body.password.trim() : "";

  if (!env.ALPHA_ACCESS_PASSWORD) {
    return res.status(500).json({ error: "Alpha access is not configured." });
  }

  if (password !== env.ALPHA_ACCESS_PASSWORD) {
    return res.status(401).json({ error: "Incorrect alpha password." });
  }

  return res.json({ ok: true });
});

export { alphaAccessRouter };
