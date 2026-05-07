import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { env } from "./env.server";

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV || "development",
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,
    profilesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,
  });
}
