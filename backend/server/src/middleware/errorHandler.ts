import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

type ErrorWithDetails = {
  status?: number;
  statusCode?: number;
  message?: string;
  code?: string;
  details?: unknown;
  stack?: string;
};

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  logger.error("[errorHandler]", err);

  const error = err as ErrorWithDetails;

  const statusCode = error.status || error.statusCode || 500;
  const message = error.message || "Internal server error";

  res.status(statusCode).json({
    error: message,
    code: error.code ?? null,
    details: error.details ?? null,
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
}
