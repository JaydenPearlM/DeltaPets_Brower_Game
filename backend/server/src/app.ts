import express from "express";
import fs from "node:fs";
import path from "node:path";
import helmet from "helmet";
import { healthRouter } from "./routes/health";
import { authRouter, publicAuthRouter, requireUser } from "./middleware/auth";
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

  app.use("/api/auth", authLimiter, publicAuthRouter, authRouter);
  app.use("/api/world", apiLimiter, apiSpeedLimiter, worldRouter);

  if (env.NODE_ENV === "development") {
    app.use("/api/debug", requireUser, debugRouter);
  }

  app.use("/api", apiLimiter, apiSpeedLimiter, requireUser, apiRouter);

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  const frontendDist = path.resolve(__dirname, "../../../frontend/web/dist");

  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));

    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) {
        return next();
      }

      return res.sendFile(path.join(frontendDist, "index.html"));
    });
  }

  app.use(errorHandler);

  return app;
}
