// backend/src/routes/api.ts
import { Router } from "express";

import { healthRouter } from "./health";
import { meRouter } from "./me";
import { authRouter } from "./auth";
import { petsRouter } from "./routePets/routePets";
import { dailyCareRouter } from "./dailyCare";
import { petActionsRouter } from "./petActions";
import { rewardsRouter } from "./rewards/rewards";

export const apiRouter = Router();

// Core routes
apiRouter.use(healthRouter);
apiRouter.use(meRouter);
apiRouter.use(authRouter);

// Gameplay routes
apiRouter.use("/pets", petsRouter);
apiRouter.use("/pets/actions", petActionsRouter);

// Daily care routes
apiRouter.use("/daily/care", dailyCareRouter);

// ✅ Daily Rewards routes
// GET  /api/rewards/status
// POST /api/rewards/claim
apiRouter.use("/rewards", rewardsRouter);
