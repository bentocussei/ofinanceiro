// O Financeiro — Service Worker
// Strategy:
//   - Static assets (/_next/static, icons, fonts): cache-first
//   - Navigation requests: network-first with cache fallback (offline page support)
//   - API requests: network-only (financial data must always be fresh)

const CACHE_VERSION = "v1"
const STATIC_CACHE = `static-${CACHE_VERSION}`
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`

const STATIC_ASSETS = [
  "/",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/favicon.svg",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle GET requests
  if (request.method !== "GET") return

  // Skip cross-origin (e.g. analytics, fonts CDN)
  if (url.origin !== self.location.origin) return

  // Never cache API calls — financial data must be fresh
  if (url.pathname.startsWith("/api/")) {
    return // let the browser handle it normally
  }

  // Static assets: cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/favicon.svg" ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".woff")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone()
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy))
            return response
          })
        )
      })
    )
    return
  }

  // Navigation requests: network-first with cache fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches
            .open(RUNTIME_CACHE)
            .then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() => caches.match(request).then((c) => c || caches.match("/")))
    )
    return
  }
})
