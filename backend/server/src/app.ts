import express from "express";
import helmet from "helmet";
import * as Sentry from "@sentry/node";
import { env } from "./env.server";
import { errorHandler } from "./middleware/errorHandler";

// Import routers
import { careRouter } from "./routes/care/care";
import { petsRouter } from "./routes/routePets/routePets";
import { petActionsRouter } from "./routes/petActions";
import { dailyCareRouter } from "./routes/care/dailyCare";

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

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // TEMPORARY TEST - Remove after verifying Sentry works
  app.get("/debug-sentry", async (_req, res) => {
    const error = new Error("Manual Sentry Test");

    Sentry.captureException(error);

    await Sentry.flush(2000);

    res.status(500).json({
      message: "Sentry test sent",
    });
  });

  // Mount API routes
  app.use("/api/pets", petsRouter);
  app.use("/api/pet/actions", petActionsRouter);
  app.use("/api/care", careRouter);
  app.use("/api/daily/care", dailyCareRouter);

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
