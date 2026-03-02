// backend/server/src/routes/api.ts
import { Router } from "express";

import { healthRouter } from "./health";
import { meRouter } from "./me";
import { authRouter } from "./auth";

import { petsRouter } from "./routePets/routePets";
import { petActionsRouter } from "./petActions";
import { rewardsRouter } from "./rewards/rewards";

import { dailyCareRouter } from "./care/dailyCare";
import { careRouter } from "./care/care";

export const apiRouter = Router();

// Core routes
apiRouter.use(healthRouter);
apiRouter.use(meRouter);
apiRouter.use(authRouter);

// Gameplay routes
apiRouter.use("/pets", petsRouter);
apiRouter.use("/pets/actions", petActionsRouter);

// Care Room API (used by CareRoom component on /pet)
apiRouter.use("/care", careRouter);

// Daily care/streak endpoints (if you’re using them)
apiRouter.use("/daily/care", dailyCareRouter);

// Rewards
apiRouter.use("/rewards", rewardsRouter);
