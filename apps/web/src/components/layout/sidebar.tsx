"use client"

import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  CreditCard,
  GraduationCap,
  Home,
  LogOut,
  Monitor,
  Moon,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  Settings,
  Sun,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState, type ElementType } from "react"
import { getCurrentUser, logout, type UserProfile } from "@/lib/auth"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface NavItem {
  href: string
  label: string
  icon: ElementType
}

interface NavSection {
  label: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Principal",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Home },
      { href: "/transactions", label: "Transaccoes", icon: ArrowLeftRight },
      { href: "/accounts", label: "Contas", icon: Wallet },
    ],
  },
  {
    label: "Gestao",
    items: [
      { href: "/budget", label: "Orcamentos", icon: PieChart },
      { href: "/goals", label: "Metas", icon: Target },
      { href: "/debts", label: "Dividas", icon: CreditCard },
      { href: "/investments", label: "Investimentos", icon: TrendingUp },
    ],
  },
  {
    label: "Mais",
    items: [
      { href: "/family", label: "Familia", icon: Users },
      { href: "/reports", label: "Relatorios", icon: BarChart3 },
      { href: "/news", label: "Noticias", icon: Newspaper },
      { href: "/education", label: "Educacao", icon: GraduationCap },
      { href: "/notifications", label: "Notificacoes", icon: Bell },
    ],
  },
]

type Theme = "light" | "dark" | "system"

function useTheme() {
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

export function Sidebar() {
  const pathname = usePathname()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    getCurrentUser().then(setUser)
  }, [])

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  const themeOptions: { value: Theme; label: string; icon: ElementType }[] = [
    { value: "light", label: "Claro", icon: Sun },
    { value: "dark", label: "Escuro", icon: Moon },
    { value: "system", label: "Sistema", icon: Monitor },
  ]

  return (
    <aside
      className={`hidden md:flex flex-col bg-sidebar border-r border-sidebar-border h-full transition-all duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Header */}
      <div className={`flex items-center h-14 px-3 ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && (
          <h1 className="text-base font-bold tracking-tight text-sidebar-foreground pl-2">
            O Financeiro
          </h1>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-[18px] w-[18px]" />
          ) : (
            <PanelLeftClose className="h-[18px] w-[18px]" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            {!collapsed && (
              <p className="px-3 mb-1 text-[12px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                {section.label}
              </p>
            )}
            {collapsed && <div className="mb-1" />}
            {section.items.map((item) => {
              const active = isActive(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`relative flex items-center gap-3 rounded-md h-[38px] text-sm font-medium transition-colors mb-0.5 ${
                    collapsed ? "justify-center px-0" : "px-3"
                  } ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-sm bg-primary" />
                  )}
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User section with popover */}
      <div className="border-t border-sidebar-border px-2 py-3">
        <Popover>
          <PopoverTrigger
            className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-sidebar-accent cursor-pointer ${collapsed ? "justify-center" : ""}`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {user?.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {user?.name || "Utilizador"}
                </p>
                <p className="truncate text-[12px] text-muted-foreground">
                  {user?.phone || ""}
                </p>
              </div>
            )}
          </PopoverTrigger>
          <PopoverContent
            side={collapsed ? "right" : "top"}
            align="start"
            className="w-56 p-0"
          >
            {/* User info */}
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-medium truncate">
                {user?.name || "Utilizador"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.phone || ""}
              </p>
            </div>

            {/* Settings link */}
            <div className="p-1">
              <Link
                href="/settings"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
              >
                <Settings className="h-4 w-4" />
                Configuracoes
              </Link>
            </div>

            {/* Theme toggle — single cycle button */}
            <div className="border-t border-border p-1">
              <button
                onClick={() => {
                  const order = ["system", "light", "dark"] as const
                  const idx = order.indexOf(theme as typeof order[number])
                  setTheme(order[(idx + 1) % 3])
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
              >
                {theme === "light" && <Sun className="h-4 w-4" />}
                {theme === "dark" && <Moon className="h-4 w-4" />}
                {theme === "system" && <Monitor className="h-4 w-4" />}
                Tema: {theme === "light" ? "Claro" : theme === "dark" ? "Escuro" : "Sistema"}
              </button>
            </div>

            {/* Logout */}
            <div className="border-t border-border p-1">
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Terminar sessao
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </aside>
  )
}
