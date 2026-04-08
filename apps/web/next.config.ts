import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: "standalone",
};

// Wrap with Sentry. When SENTRY_DSN env vars are not set, runtime init
// becomes a noop — so this is safe to enable in all environments.
export default withSentryConfig(nextConfig, {
  // CI / build options — keep silent unless something fails
  silent: !process.env.CI,

  // Source maps: upload only when SENTRY_AUTH_TOKEN is set in CI
  // (otherwise build still works but stack traces stay minified).
  org: process.env.SENTRY_ORG || "gracy-suite-360-lda",
  project: process.env.SENTRY_PROJECT || "ofinanceiro-web",
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Strip source maps from the production bundle after upload
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  disableLogger: true,
});
