import express from "express";
import helmet from "helmet";
import { healthRouter } from "./routes/health";
import { requireUser } from "./middleware/auth";
import { apiLimiter, apiSpeedLimiter } from "./middleware/rateLimit";
import { apiRouter } from "./routes";
import { careRouter } from "./routes/care/care";
import { errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(helmet());

  app.use(express.json());

  app.use(healthRouter);

  app.use("/api/care", apiLimiter, apiSpeedLimiter, requireUser, careRouter);
  app.use("/api", apiLimiter, apiSpeedLimiter, requireUser, apiRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use(errorHandler);

  return app;
}
