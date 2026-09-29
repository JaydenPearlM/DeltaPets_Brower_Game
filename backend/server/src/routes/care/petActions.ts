import { Router } from "express";
import { requireUser } from "../../middleware/auth";
import { ownedCareHandler } from "./ownedCare";

export const petActionsRouter = Router();
petActionsRouter.post("/do", requireUser, ownedCareHandler());
