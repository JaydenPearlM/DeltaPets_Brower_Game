// backend/server/src/routes/index.ts

import { Router } from "express";

import { meRouter } from "./me";

import { petsRouter } from "./routePets/routePets";
import { petActionsRouter } from "./petActions";
import { rewardsRouter } from "./rewards/rewards";

import { dailyCareRouter } from "./care/dailyCare";
import { careRouter } from "./care/care";

import { battleRouter } from "./battle";
import { kithnaRouter } from "./cities/kithna/kithnaEncounter";

const apiRouter = Router();

/* ===============================
   CORE SYSTEM ROUTES
=============================== */

apiRouter.use(meRouter);

/* ===============================
   PET GAMEPLAY ROUTES
=============================== */

apiRouter.use("/pets/actions", petActionsRouter);
apiRouter.use("/pets", petsRouter);
apiRouter.use("/battle", battleRouter);

/* ===============================
   KITHNA ROAM ENCOUNTER
=============================== */

apiRouter.use("/kithna", kithnaRouter);

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
