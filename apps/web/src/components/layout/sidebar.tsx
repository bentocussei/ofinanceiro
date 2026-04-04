"use client"

import {
  ArrowLeftRight,
  Banknote,
  BarChart3,
  Bell,
  Bot,
  Building2,
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
  Receipt,
  Repeat,
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
import { ContextSwitcher } from "@/components/layout/ContextSwitcher"
import { usePermissions } from "@/providers/PermissionProvider"

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
      { href: "/transactions", label: "Transacções", icon: ArrowLeftRight },
      { href: "/accounts", label: "Contas", icon: Wallet },
      { href: "/assistant", label: "Assistente", icon: Bot },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/budget", label: "Orçamentos", icon: PieChart },
      { href: "/goals", label: "Metas", icon: Target },
      { href: "/debts", label: "Dívidas", icon: CreditCard },
      { href: "/investments", label: "Investimentos", icon: TrendingUp },
      { href: "/assets", label: "Património", icon: Building2 },
      { href: "/income-sources", label: "Rendimentos", icon: Banknote },
      { href: "/bills", label: "Contas a Pagar", icon: Receipt },
      { href: "/recurring-rules", label: "Recorrentes", icon: Repeat },
    ],
  },
  {
    label: "Mais",
    items: [
      { href: "/reports", label: "Relatórios", icon: BarChart3 },
      { href: "/news", label: "Notícias", icon: Newspaper },
      { href: "/education", label: "Educação", icon: GraduationCap },
      { href: "/notifications", label: "Notificações", icon: Bell },
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

const MODULE_MAP: Record<string, string> = {
  "/dashboard": "",
  "/transactions": "transactions",
  "/accounts": "accounts",
  "/assistant": "ai",
  "/budget": "budgets",
  "/goals": "goals",
  "/debts": "debts",
  "/investments": "investments",
  "/assets": "assets",
  "/income-sources": "income_sources",
  "/bills": "bills",
  "/recurring-rules": "recurring_rules",
  "/reports": "reports",
  "/news": "news",
  "/education": "education",
  "/notifications": "notifications",
}

export function Sidebar() {
  const pathname = usePathname()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const { theme, setTheme } = useTheme()
  const { hasModuleAccess } = usePermissions()

  useEffect(() => {
    getCurrentUser().then(setUser)
  }, [])

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  const filteredSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      const module = MODULE_MAP[item.href]
      if (module === undefined) return true
      if (module === "") return true
      return hasModuleAccess(module)
    }),
  })).filter((section) => section.items.length > 0)

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
      {/* Header — Context Switcher + collapse toggle */}
      <div className={`flex items-center h-14 px-2 ${collapsed ? "justify-center" : "justify-between gap-1"}`}>
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            title="Expandir menu"
          >
            <PanelLeftOpen className="h-[18px] w-[18px]" />
          </button>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <ContextSwitcher collapsed={collapsed} />
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="flex items-center justify-center h-8 w-8 shrink-0 rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
              title="Recolher menu"
            >
              <PanelLeftClose className="h-[18px] w-[18px]" />
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {filteredSections.map((section) => (
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
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name || "Avatar"}
                className="h-8 w-8 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {user?.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
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
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {user?.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {user?.name || "Utilizador"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.phone || ""}
                </p>
              </div>
            </div>

            {/* Settings link */}
            <div className="p-1">
              <Link
                href="/settings"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
              >
                <Settings className="h-4 w-4" />
                Configurações
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
                Terminar sessão
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </aside>
  )
}
