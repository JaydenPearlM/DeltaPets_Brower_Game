import { Router } from "express";
import { battlePveRouter } from "./battlePve";

export const battleRouter = Router();

battleRouter.use("/pve", battlePveRouter);

// Future reminder:
// battleRouter.use("/pvp", battlePvpRouter);
