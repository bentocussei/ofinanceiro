"use client"

import {
  ArrowLeftRight,
  BarChart3,
  Home,
  PieChart,
  Settings,
  Target,
  Users,
  Wallet,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ElementType } from "react"

const NAV_ITEMS: { href: string; label: string; icon: ElementType }[] = [
  { href: "/", label: "Início", icon: Home },
  { href: "/accounts", label: "Contas", icon: Wallet },
  { href: "/transactions", label: "Transacções", icon: ArrowLeftRight },
  { href: "/budget", label: "Orçamentos", icon: PieChart },
  { href: "/goals", label: "Metas", icon: Target },
  { href: "/family", label: "Família", icon: Users },
  { href: "/reports", label: "Relatórios", icon: BarChart3 },
  { href: "/settings", label: "Configurações", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex md:w-64 flex-col border-r border-border bg-card h-full">
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tight">O Financeiro</h1>
      </div>

      <nav className="flex-1 px-3">
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
    </aside>
  )
}
