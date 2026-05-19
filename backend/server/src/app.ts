import express from "express";
import helmet from "helmet";

import { env } from "./env.server";
import { errorHandler } from "./middleware/errorHandler";
import { apiLimiter, apiSpeedLimiter } from "./middleware/rateLimit";
import { apiRouter } from "./routes/index";

export function createApp() {
  const app = express();

  // Security headers
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );

  // Trust proxy
  app.set("trust proxy", 1);

  // Hide Express signature
  app.disable("x-powered-by");

  // Body parsing
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: true, limit: "100kb" }));

  // Global rate limiting
  app.use(apiLimiter);
  app.use(apiSpeedLimiter);

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Mount all API routes via centralized router
  app.use("/api", apiRouter);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
  });

  // Custom error handler
  app.use(errorHandler);

  return app;
}
