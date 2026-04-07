import { createApp } from "./app";
import { env } from "./env.server";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`[server] listening on http://localhost:${env.PORT}`);
});
