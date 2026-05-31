import { createApp } from "./app";
import { env } from "./env.server";
import { logger } from "./lib/logger";
const app = createApp();

app.listen(env.PORT, () => {
  logger.info("[server] listening", { url: `http://localhost:${env.PORT}` });
});
