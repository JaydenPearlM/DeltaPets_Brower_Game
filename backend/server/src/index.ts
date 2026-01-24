import { createApp } from "./app";
import { env } from "./env.server";
import { dailyCareRouter } from "./routes/dailyCare";
import { rewardsDaily } from "./routes/rewardsDaily";

const app = createApp();
app.use("/api/daily", dailyCareRouter);
app.use("/api/rewards", rewardsDaily);
app.listen(env.PORT, () => {
  console.log(`[server] listening on http://localhost:${env.PORT}`);
});
