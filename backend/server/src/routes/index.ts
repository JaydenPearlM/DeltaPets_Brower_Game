// backend/server/src/routes/index.ts

import { Router } from "express";

import { healthRouter } from "./health";
import { meRouter } from "./me";
import { authRouter } from "../middleware/auth";

import { petsRouter } from "./routePets/routePets";
import { petActionsRouter } from "./petActions";
import { rewardsRouter } from "./rewards/rewards";

import { dailyCareRouter } from "./care/dailyCare";
import { careRouter } from "./care/care";

const apiRouter = Router();

/* ===============================
   CORE SYSTEM ROUTES
=============================== */

// Health check
apiRouter.use(healthRouter);

// Current authenticated user
apiRouter.use(meRouter);

// Login / auth routes
apiRouter.use(authRouter);

/* ===============================
   PET GAMEPLAY ROUTES
=============================== */

// Pet data
apiRouter.use("/pets", petsRouter);

// Pet actions
// Example: POST /api/pets/actions/do
apiRouter.use("/pets/actions", petActionsRouter);

/* ===============================
   CARE ROOM SYSTEM
=============================== */

// Care room endpoints used by CareRoom component
// Example: GET /api/care/status
apiRouter.use("/care", careRouter);

/* ===============================
   DAILY CARE / STREAK SYSTEM
=============================== */

// Example:
// GET  /api/daily/care/status
// POST /api/daily/care/complete
apiRouter.use("/daily/care", dailyCareRouter);

/* ===============================
   REWARDS SYSTEM
=============================== */

apiRouter.use("/rewards", rewardsRouter);

/* ===============================
   EXPORT
=============================== */

export default apiRouter;
