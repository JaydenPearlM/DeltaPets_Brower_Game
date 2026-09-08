// backend/server/src/routes/index.ts

import { Router } from "express";

import { meRouter } from "./me";

import { petsRouter } from "./routePets/routePets";
import { petActionsRouter } from "./care/petActions";
import { rewardsRouter } from "./rewards/rewards";

import { dailyCareRouter } from "./care/dailyCare";
import { careRouter } from "./care/care";

import { battleRouter } from "./battle";
import { kithnaRouter } from "./cities/kithna/kithnaEncounter";
import { wildwoodRouter } from "./cities/kithna/wildwood";
import { inventoryRouter } from "./inventory/inventory";

import { kithnaMerchantsRouter } from "./merchants/kithnaMerchants";
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
