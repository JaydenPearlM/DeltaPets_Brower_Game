import { Router } from "express";
import { requireUser, type AuthedRequest } from "../middleware/auth";
import type { Response } from "express";

export const meRouter = Router();

meRouter.get("/me", requireUser, (req: AuthedRequest, res: Response) => {
  res.json({ user: req.user });
});
