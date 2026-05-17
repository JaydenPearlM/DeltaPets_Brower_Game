import { Router } from "express";
import { battlePveRouter } from "./battlePve";
import { pveInstabilitiesRouter } from "./pveInstabilities";

export const battleRouter = Router();

battleRouter.use("/pve", battlePveRouter);
battleRouter.use("/pve/instabilities", pveInstabilitiesRouter);
