import { Router } from "express";
import { healthRouter } from "./health";
import { meRouter } from "./me";
import { abuseTestRouter } from "./abuseTest";
import { authRouter } from "./auth";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(meRouter);
apiRouter.use(abuseTestRouter);

// ✅ Turnstile-protected placeholder route now actually mounted
apiRouter.use(authRouter);
