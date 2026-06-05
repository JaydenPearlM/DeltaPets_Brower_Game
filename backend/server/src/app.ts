import express from "express";
import helmet from "helmet";
import { healthRouter } from "./routes/health";
import { publicAuthRouter, requireUser } from "./middleware/auth";
import {
  apiLimiter,
  apiSpeedLimiter,
  authLimiter,
} from "./middleware/rateLimit";
import { apiRouter } from "./routes";
import { worldRouter } from "./routes/world/world";
import { errorHandler } from "./middleware/errorHandler";
import { debugRouter } from "./routes/debug/debugRoutes";
import { env } from "./env.server";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(helmet());

  app.use(express.json());

  app.use(healthRouter);

  app.use("/api/auth", authLimiter, publicAuthRouter);
  app.use("/api/world", apiLimiter, apiSpeedLimiter, worldRouter);
  if (env.NODE_ENV === "development") {
    app.use("/api/debug", debugRouter);
  }
  app.use("/api", apiLimiter, apiSpeedLimiter, requireUser, apiRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use(errorHandler);

  return app;
}
