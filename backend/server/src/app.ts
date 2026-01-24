import express from "express";
import { apiRouter } from "./routes";
import { apiLimiter, apiSpeedLimiter } from "./middleware/rateLimit";
import { petsRouter } from "./routes/pets";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");

  // Important for correct req.ip behind proxies (Render/Cloudflare/etc)
  app.set("trust proxy", 1);

  // Basic request shaping (avoid huge payload spam)
  app.use(express.json({ limit: "100kb" }));

  app.get("/", (_req, res) => {
    res.type("text").send("DeltaPets Backend ✅\nTry GET /api/health");
  });

  app.use("/api", petsRouter);

  // ✅ Rate limiting + request shaping applied to ALL /api routes
  app.use("/api", apiLimiter, apiSpeedLimiter, apiRouter);

  app.use((req, res) => {
    res.status(404).json({ error: "Not found", path: req.path });
  });

  return app;
}
