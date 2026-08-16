// backend/server/src/middleware/validateRequest.ts

import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";
import { AppError } from "../lib/AppError";

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return next(
        new AppError(
          "Invalid request body",
          400,
          "VALIDATION_ERROR",
          result.error.flatten(),
        ),
      );
    }

    req.body = result.data;
    next();
  };
}
