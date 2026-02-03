// backend/src/routes/api.ts
import { Router } from "express";

import { healthRouter } from "./health";
import { meRouter } from "./me";
import { authRouter } from "./auth";
import { petsRouter } from "./pets";
import { dailyCareRouter } from "./dailyCare";
import { petActionsRouter } from "./petActions";

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
