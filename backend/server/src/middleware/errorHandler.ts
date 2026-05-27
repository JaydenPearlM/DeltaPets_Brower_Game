import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error("[errorHandler]", err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(statusCode).json({
    error: message,
    code: err.code ?? null,
    details: err.details ?? null,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}
