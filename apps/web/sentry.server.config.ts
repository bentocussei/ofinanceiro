// Sentry initialisation for the Node.js server runtime (SSR, route handlers).
// Loaded automatically by @sentry/nextjs.
import * as Sentry from "@sentry/nextjs"

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_APP_ENV_LABEL || "production",
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  })
}
