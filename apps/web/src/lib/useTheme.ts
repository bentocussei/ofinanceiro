"use client"

import { useEffect, useState } from "react"

export type Theme = "light" | "dark" | "system"

function applyTheme(t: Theme) {
  const root = document.documentElement
  if (t === "dark") {
    root.classList.add("dark")
  } else if (t === "light") {
    root.classList.remove("dark")
  } else {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system")

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null
    if (stored) {
      setThemeState(stored)
      applyTheme(stored)
    }
  }, [])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem("theme", t)
    applyTheme(t)
  }

  return { theme, setTheme }
}
