import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import { env } from "../env.server";

export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/health",
});

export const apiSpeedLimiter = slowDown({
  windowMs: env.SLOW_DOWN_WINDOW_MS,
  delayAfter: env.SLOW_DOWN_AFTER,
  delayMs: (_used: number) => env.SLOW_DOWN_DELAY_MS,
  skip: (req) => req.path === "/health",
});

export const authLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});
