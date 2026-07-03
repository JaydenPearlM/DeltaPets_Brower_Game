import { createApp } from "./app";
import { env } from "./env.server";
import { logger } from "./lib/logger";
import { setCareDecayLogger } from "./shared/pets/care/CareDecay";

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

app.listen(env.PORT, () => {
  logger.info("[server] listening", { url: `http://localhost:${env.PORT}` });
});
