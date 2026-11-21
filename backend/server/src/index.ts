import { createApp } from "./app";
import { env } from "./env.server";
import { logger } from "./lib/logger";
import { setCareDecayLogger } from "./shared/pets/care/CareDecay";
import { rescueGate } from "./lib/rescueGate";
import { createRescueShutdown } from "./lib/rescueMaintenance";

process.on("uncaughtException", (error) => {
  logger.error("[process] uncaughtException", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("[process] unhandledRejection", reason);
  process.exit(1);
});

setCareDecayLogger((kind, payload) => {
  logger.debug(`[care/decay] ${kind}`, payload);
});

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info("[server] listening", { url: `http://localhost:${env.PORT}` });
});

const shutdown = createRescueShutdown(server, rescueGate,
  (event, state) => logger.info(`[shutdown] ${event}`, state), code => process.exit(code));
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
// Operator-only Linux signal: close rescue admission without restarting the server.
process.on("SIGUSR2", () => {
  rescueGate.begin();
  void rescueGate.drained().then(() => logger.info("[rescue] maintenance_drained", rescueGate.state()));
});
