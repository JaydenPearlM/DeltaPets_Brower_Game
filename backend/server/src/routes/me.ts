import { Router } from "express";
import { requireUser, type AuthedRequest } from "../middleware/auth";
import type { Response } from "express";

export const meRouter = Router();

/**
 * Returns the currently authenticated user.
 * Requires: Authorization: Bearer <access_token>
 */
meRouter.get("/me", requireUser, (req: AuthedRequest, res: Response) => {
  return res.json({ user: req.user });
});
