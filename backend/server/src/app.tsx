import express from "express";
import { apiRouter } from "./routes";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json());

  app.get("/", (_req, res) => {
    res
      .status(200)
      .type("text")
      .send(
        [
          "DeltaPets Backend ✅",
          "",
          "Try:",
          "  GET /api/health",
          "  GET /api/me (Authorization: Bearer <token>)",
          "",
        ].join("\n")
      );
  });

  app.use("/api", apiRouter);

  app.use((req, res) => {
    res.status(404).json({ error: "Not found", path: req.path });
  });

  return app;
}
