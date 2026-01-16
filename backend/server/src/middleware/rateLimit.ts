import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import { env } from "../env";

/**
 * Let express-rate-limit use its default keyGenerator (IPv6-safe).
 * Make sure app.set("trust proxy", 1) is set so req.ip is correct behind proxies.
 */

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
  delayMs: () => env.SLOW_DOWN_DELAY_MS, // new behavior
  skip: (req) => req.path === "/health",
});

export const authLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});
