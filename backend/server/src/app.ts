import express, { Request, Response, NextFunction } from "express";
import { requireUser } from "./middleware/auth";
import { apiRouter } from "./routes";

const app = express();

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api", requireUser, apiRouter);

// Global error handler - MUST be defined with 4 parameters
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Error]", err);

  // Don't leak stack traces in production
  const isDev = process.env.NODE_ENV === "development";
  res.status(500).json({
    error: "Internal server error",
    ...(isDev && { details: err.message, stack: err.stack }),
  });
});

// 404 handler - MUST come after error handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default app;
