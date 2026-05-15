import express from "express";
import helmet from "helmet";
import * as Sentry from "@sentry/node";
import aliuneSignalRoutes from "./routes/world/aliuneSignal";
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

  //Aliune Signal
  app.use("/api/world", aliuneSignalRoutes);

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Debug Sentry endpoint - gated to development only
  if (env.NODE_ENV !== "production") {
    app.get("/debug-sentry", async (_req, res) => {
      const error = new Error("Manual Sentry Test");

      Sentry.captureException(error);

      await Sentry.flush(2000);

      res.status(500).json({
        message: "Sentry test sent",
      });
    });
  }

  // Mount all API routes via centralized router
  app.use("/api", apiRouter);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
  });

  // Sentry error handler
  if (env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
  }

  // Custom error handler
  app.use(errorHandler);

  return app;
}
