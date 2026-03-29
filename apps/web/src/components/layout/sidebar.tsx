"use client"

import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  CreditCard,
  GraduationCap,
  Home,
  LogOut,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  Settings,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState, type ElementType } from "react"
import { getCurrentUser, logout, type UserProfile } from "@/lib/auth"

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
      { href: "/", label: "Dashboard", icon: Home },
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

const SETTINGS_ITEM: NavItem = {
  href: "/settings",
  label: "Configuracoes",
  icon: Settings,
}

export function Sidebar() {
  const pathname = usePathname()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    getCurrentUser().then(setUser)
  }, [])

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
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
                  className={`relative flex items-center gap-3 rounded-lg h-10 text-sm font-medium transition-colors mb-0.5 ${
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

      {/* Settings */}
      <div className="px-2 pb-1">
        {(() => {
          const active = isActive(SETTINGS_ITEM.href)
          const Icon = SETTINGS_ITEM.icon
          return (
            <Link
              href={SETTINGS_ITEM.href}
              title={collapsed ? SETTINGS_ITEM.label : undefined}
              className={`relative flex items-center gap-3 rounded-lg h-10 text-sm font-medium transition-colors ${
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
              {!collapsed && <span>{SETTINGS_ITEM.label}</span>}
            </Link>
          )
        })()}
      </div>

      {/* User section */}
      <div className="border-t border-sidebar-border px-2 py-3">
        <div className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${collapsed ? "justify-center" : ""}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {user?.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {user?.name || "Utilizador"}
              </p>
              <p className="truncate text-[12px] text-muted-foreground">
                {user?.phone || ""}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={logout}
          title={collapsed ? "Terminar sessao" : undefined}
          className={`mt-1 flex w-full items-center gap-3 rounded-lg h-10 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground ${
            collapsed ? "justify-center px-0" : "px-3"
          }`}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>Terminar sessao</span>}
        </button>
      </div>
    </aside>
  )
}
