import { Router } from "express";
import { battlePveRouter } from "./battlePve";
import { pveInstabilitiesRouter } from "./pveInstabilities";

export const battleRouter = Router();

// Turn-based PvE battles
battleRouter.use("/pve", battlePveRouter);

// PvE Instability system
battleRouter.use("/pve", pveInstabilitiesRouter);

// Future reminder:
// battleRouter.use("/pvp", battlePvpRouter);
