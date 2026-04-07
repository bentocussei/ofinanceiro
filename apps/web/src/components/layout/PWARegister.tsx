"use client"

import { useEffect } from "react"

/**
 * Registers the service worker on the client.
 * Mounted once in the root layout. Only runs in production builds where
 * the SW exists at /sw.js.
 */
export function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return
    if (process.env.NODE_ENV !== "production") return

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => {
          console.warn("[PWA] Service worker registration failed:", err)
        })
    }

    if (document.readyState === "complete") {
      onLoad()
    } else {
      window.addEventListener("load", onLoad)
      return () => window.removeEventListener("load", onLoad)
    }
  }, [])

  return null
}
