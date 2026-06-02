import { createApp } from "./app";
import { env } from "./env.server";
import { logger } from "./lib/logger";
import { setCareDecayLogger } from "./shared/pets/care/CareDecay";

setCareDecayLogger((kind, payload) => {
  logger.debug(`[care/decay] ${kind}`, payload);
});

const app = createApp();

app.listen(env.PORT, () => {
  logger.info("[server] listening", { url: `http://localhost:${env.PORT}` });
});
