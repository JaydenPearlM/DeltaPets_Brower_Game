import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { slowDown } from "express-slow-down";
import * as Sentry from "@sentry/node";
import { env } from "./env.server";
import { errorHandler } from "./middleware/errorHandler";
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
  const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests, please try again later.",
  });

  const speedLimiter = slowDown({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    delayAfter: Math.floor(env.RATE_LIMIT_MAX / 2),
    delayMs: () => 500,
  });

  app.use(limiter);
  app.use(speedLimiter);

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
