import express from "express";
import apiRouter from "./routes";
import { apiLimiter, apiSpeedLimiter } from "./middleware/rateLimit";
import type { Request, Response, NextFunction } from "express";
import { AppError } from "./lib/AppError";
import helmet from "helmet";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");

  // Important for correct req.ip behind proxies (Render/Cloudflare/etc)
  app.set("trust proxy", 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );

  // Basic request shaping (avoid huge payload spam)
  app.use(express.json({ limit: "100kb" }));

  app.get("/", (_req, res) => {
    res.type("text").send("DeltaPets Backend\nTry GET /api/health");
  });

  // Single API mount point.
  // apiRouter should be the only place that mounts sub-routers.
  app.use("/api", apiLimiter, apiSpeedLimiter, apiRouter);

  app.use((req, res) => {
    res.status(404).json({ error: "Not found", path: req.path });
  });

  // Global error handler — must have 4 arguments to work in Express
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        ok: false,
        code: err.code,
        message: err.message,
        details: err.details ?? null,
      });
    }

    console.error("[unhandled error]", err);

    return res.status(500).json({
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Something went wrong.",
    });
  });

  return app;
}
