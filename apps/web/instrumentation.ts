// Next.js instrumentation hook. @sentry/nextjs uses this to bootstrap
// the appropriate Sentry runtime per environment.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

export const onRequestError = async (
  ...args: Parameters<typeof import("@sentry/nextjs").captureRequestError>
) => {
  const Sentry = await import("@sentry/nextjs")
  return Sentry.captureRequestError(...args)
}
