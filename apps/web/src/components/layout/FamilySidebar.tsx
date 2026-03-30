"use client"

import {
  ArrowLeftRight,
  Banknote,
  BarChart3,
  Bell,
  Building2,
  CreditCard,
  Home,
  LogOut,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Percent,
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
      { href: "/family/dashboard", label: "Dashboard", icon: Home },
      { href: "/family/accounts", label: "Contas partilhadas", icon: Wallet },
      { href: "/family/transactions", label: "Transacções", icon: ArrowLeftRight },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/family/budget", label: "Orçamento doméstico", icon: PieChart },
      { href: "/family/goals", label: "Metas familiar", icon: Target },
      { href: "/family/debts", label: "Dívidas", icon: CreditCard },
      { href: "/family/investments", label: "Investimentos", icon: TrendingUp },
      { href: "/family/assets", label: "Património", icon: Building2 },
      { href: "/family/income-sources", label: "Rendimentos", icon: Banknote },
      { href: "/family/bills", label: "Contas a pagar", icon: Receipt },
      { href: "/family/recurring-rules", label: "Recorrentes", icon: Repeat },
    ],
  },
  {
    label: "Mais",
    items: [
      { href: "/family/members", label: "Membros", icon: Users },
      { href: "/family/expense-splits", label: "Divisão de despesas", icon: Percent },
      { href: "/family/reports", label: "Relatórios", icon: BarChart3 },
      { href: "/family/notifications", label: "Notificações", icon: Bell },
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

export function FamilySidebar({ familyName }: { familyName: string }) {
  const pathname = usePathname()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    getCurrentUser().then(setUser)
  }, [])

  const isActive = (href: string) => {
    if (href === "/family/dashboard") return pathname === "/family/dashboard"
    return pathname.startsWith(href)
  }

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
            {familyName}
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

      {/* Context Switcher */}
      <div className="px-2 pb-2">
        <ContextSwitcher collapsed={collapsed} />
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
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-medium truncate">
                {user?.name || "Utilizador"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.phone || ""}
              </p>
            </div>

            <div className="p-1">
              <Link
                href="/family/settings"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
              >
                <Settings className="h-4 w-4" />
                Configurações
              </Link>
            </div>

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
