import { Router } from "express";
import { healthRouter } from "./health";
import { meRouter } from "./me";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(meRouter);
