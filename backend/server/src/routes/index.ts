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

// Gameplay / data routes
apiRouter.use("/pets", petsRouter);

// dailyCareRouter should be mounted at "/daily/care" if it defines "/status" + "/complete"
// Result:
// GET  /api/daily/care/status
// POST /api/daily/care/complete
apiRouter.use("/daily/care", dailyCareRouter);

// petActionsRouter should be mounted once, without double "/api"
// Result:
// POST /api/pets/actions/do
apiRouter.use("/pets/actions", petActionsRouter);

// NOTE: rewardsDaily router exists, but it's intentionally NOT mounted yet
// until the corresponding DB table is added to the migration.

apiRouter.use("/rewards", rewardsRouter);

export default apiRouter;
