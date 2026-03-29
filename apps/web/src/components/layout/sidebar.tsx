"use client"

import {
  ArrowLeftRight,
  BarChart3,
  CreditCard,
  GraduationCap,
  Home,
  LogOut,
  Newspaper,
  PieChart,
  Bell,
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

const NAV_ITEMS: { href: string; label: string; icon: ElementType }[] = [
  { href: "/", label: "Início", icon: Home },
  { href: "/accounts", label: "Contas", icon: Wallet },
  { href: "/transactions", label: "Transacções", icon: ArrowLeftRight },
  { href: "/budget", label: "Orçamentos", icon: PieChart },
  { href: "/goals", label: "Metas", icon: Target },
  { href: "/debts", label: "Dividas", icon: CreditCard },
  { href: "/investments", label: "Investimentos", icon: TrendingUp },
  { href: "/news", label: "Noticias", icon: Newspaper },
  { href: "/education", label: "Educacao", icon: GraduationCap },
  { href: "/family", label: "Família", icon: Users },
  { href: "/reports", label: "Relatórios", icon: BarChart3 },
  { href: "/notifications", label: "Notificações", icon: Bell },
  { href: "/settings", label: "Configurações", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [user, setUser] = useState<UserProfile | null>(null)

  useEffect(() => {
    getCurrentUser().then(setUser)
  }, [])

  return (
    <aside className="hidden md:flex md:w-64 flex-col border-r border-border bg-card h-full">
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tight">O Financeiro</h1>
      </div>

      <nav className="flex-1 px-3 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors mb-1 ${
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {user?.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {user?.name || "Utilizador"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.phone || ""}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Terminar sessao
        </button>
      </div>
    </aside>
  )
}
