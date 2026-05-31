// backend/server/src/routes/index.ts

import { Router } from "express";

import { meRouter } from "./me";
import { authRouter } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimit";

import { petsRouter } from "./routePets/routePets";
import { petActionsRouter } from "./petActions";
import { rewardsRouter } from "./rewards/rewards";

import { dailyCareRouter } from "./care/dailyCare";
import { careRouter } from "./care/care";

import { battleRouter } from "./battle";

const apiRouter = Router();

/* ===============================
   CORE SYSTEM ROUTES
=============================== */

apiRouter.use(meRouter);
apiRouter.use("/auth", authLimiter, authRouter);

/* ===============================
   PET GAMEPLAY ROUTES
=============================== */

apiRouter.use("/pets", petsRouter);
apiRouter.use("/pets/actions", petActionsRouter);
apiRouter.use("/battle", battleRouter);

/* ===============================
   CARE ROOM SYSTEM
=============================== */

apiRouter.use("/care", careRouter);

/* ===============================
   DAILY CARE / STREAK SYSTEM
=============================== */

apiRouter.use("/daily/care", dailyCareRouter);

/* ===============================
   REWARDS SYSTEM
=============================== */

apiRouter.use("/rewards", rewardsRouter);

export { apiRouter };
