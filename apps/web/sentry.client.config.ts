// Sentry initialisation for the browser bundle.
// Loaded automatically by @sentry/nextjs.
import * as Sentry from "@sentry/nextjs"

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_APP_ENV_LABEL || "production",
    // 10% of sessions are sampled for performance traces — keeps quota safe
    tracesSampleRate: 0.1,
    // Replay only when an error happens — saves quota dramatically
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Never send PII (we collect financial data — must be conservative)
    sendDefaultPii: false,
  })
}
