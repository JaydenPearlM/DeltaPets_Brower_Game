import { Router } from "express";
import { healthRouter } from "./health";
import { meRouter } from "./me";
import { abuseTestRouter } from "./abuseTest";
import { authRouter } from "./auth";
import { petsRouter } from "./pets";
import { dailyCareRouter } from "./dailyCare";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(meRouter);
apiRouter.use(abuseTestRouter);
apiRouter.use(authRouter);

// Gameplay / data routes
apiRouter.get("/health");
apiRouter.use("/pets", petsRouter);
apiRouter.use("/daily/care", dailyCareRouter);

// NOTE: rewardsDaily router exists, but it's intentionally NOT mounted yet
// until the corresponding DB table is added to the migration.
