import { Router } from "express";
import { battlePveRouter } from "./battlePve";
import { pveInstabilitiesRouter } from "./pveInstabilities";

export const battleRouter = Router();

// These share /pve intentionally. Instability routes use fixed prefixes
// (/instabilities, /runs, /buffs, /research); battle routes use /start
// and /:battleId paths. Keep them non-overlapping when adding routes.
battleRouter.use("/pve", pveInstabilitiesRouter);
battleRouter.use("/pve", battlePveRouter);
