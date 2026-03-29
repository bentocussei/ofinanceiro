"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV_ITEMS = [
  { href: "/", label: "Início", icon: "🏠" },
  { href: "/accounts", label: "Contas", icon: "💳" },
  { href: "/transactions", label: "Transacções", icon: "🔄" },
  { href: "/budget", label: "Orçamentos", icon: "📊" },
  { href: "/goals", label: "Metas", icon: "🎯" },
  { href: "/reports", label: "Relatórios", icon: "📈" },
  { href: "/settings", label: "Configurações", icon: "⚙️" },
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
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
