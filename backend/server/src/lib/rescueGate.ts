import { env } from "../env.server";
import { logger } from "./logger";
import { createRescueMaintenance } from "./rescueMaintenance";

export const rescueGate = createRescueMaintenance(env.RESCUE_MAINTENANCE,
  (event, state) => logger.info(`[rescue] ${event}`, state));
