// backend/server/src/routes/index.ts

import { Router } from "express";
import { level2Router } from "./pets/level2";
import { localAllocationEnabled } from "../pets/level2/contracts";
import { env } from "../env.server";

import { meRouter } from "./me";

import { petsRouter } from "./routePets/routePets";
import { resonanceEvolutionRouter } from "./routePets/resonanceEvolution";
import { storageActionsRouter } from "./pets/storageActions";
import { petActionsRouter } from "./care/petActions";
import { rewardsRouter } from "./rewards/rewards";

import { dailyCareRouter } from "./care/dailyCare";
import { careRouter } from "./care/care";

import { battleRouter } from "./battle";
import { kithnaRouter } from "./cities/kithna/kithnaEncounter";
import { wildwoodRouter } from "./cities/kithna/wildwood";
import { inventoryRouter } from "./inventory/inventory";

import { kithnaMerchantsRouter } from "./merchants/kithnaMerchants";
import { kennithRouter } from "./merchants/kennith";
import { poeTayToeRouter } from "./alphaAccess/poeTayToe/poeTayToe";

const apiRouter = Router();

/* ===============================
   CORE SYSTEM ROUTES
=============================== */

apiRouter.use(meRouter);

/* ===============================
   PET GAMEPLAY ROUTES
=============================== */

apiRouter.use("/pets/actions", petActionsRouter);
apiRouter.use("/pets", resonanceEvolutionRouter);
apiRouter.use("/pets", storageActionsRouter);
// Explicitly local-only until production schema/security review is approved.
if (localAllocationEnabled(env.NODE_ENV, process.env.ENABLE_STARTER_ALLOCATION, env.SUPABASE_URL)) {
  apiRouter.use("/pets/progression", level2Router);
}
apiRouter.use("/pets", petsRouter);
apiRouter.use("/battle", battleRouter);

/* ===============================
   KITHNA ROAM ENCOUNTER
=============================== */

apiRouter.use("/kithna", kithnaRouter);
apiRouter.use("/kithna/wildwood", wildwoodRouter);

/* ===============================
   CARE ROOM SYSTEM 
=============================== */

apiRouter.use("/care", careRouter);

/* ===============================
   Daily Care System
=============================== */
apiRouter.use("/daily-care", dailyCareRouter);

/* ===============================
   Merchant Stores
=============================== */

apiRouter.use("/merchants/kithna", kithnaMerchantsRouter);
apiRouter.use("/merchants/kithna/kennith", kennithRouter);

/* ===============================
   REWARDS SYSTEM
=============================== */

apiRouter.use("/rewards", rewardsRouter);

/* ===============================
   INVENTORY (backend item_defs / inventory tables)
=============================== */

apiRouter.use("/inventory", inventoryRouter);
apiRouter.use("/poe-tay-toe", poeTayToeRouter);
export { apiRouter };
