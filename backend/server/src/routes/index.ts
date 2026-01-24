import { Router } from "express";
import { healthRouter } from "./health";
import { meRouter } from "./me";
import { abuseTestRouter } from "./abuseTest";
import { authRouter } from "./auth";
import { petsRouter } from "./pets"; // ✅ add

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(meRouter);
apiRouter.use(abuseTestRouter);
apiRouter.use(authRouter);

// ✅ mount pets routes
apiRouter.use(petsRouter);
