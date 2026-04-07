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
  Menu,
  Monitor,
  Moon,
  Newspaper,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ContextSwitcher } from "@/components/layout/ContextSwitcher"
import { getCurrentUser, logout, type UserProfile } from "@/lib/auth"
import { hapticTap } from "@/lib/haptics"
import { useTheme, type Theme } from "@/lib/useTheme"

interface NavItem {
  href: string
  label: string
  icon: ElementType
}

interface NavSection {
  label: string
  items: NavItem[]
}

const PERSONAL_SECTIONS: NavSection[] = [
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

const FAMILY_SECTIONS: NavSection[] = [
  {
    label: "Principal",
    items: [
      { href: "/family/dashboard", label: "Dashboard", icon: Home },
      { href: "/family/accounts", label: "Contas partilhadas", icon: Wallet },
      { href: "/family/transactions", label: "Transacções", icon: ArrowLeftRight },
      { href: "/family/assistant", label: "Assistente", icon: Bot },
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
    label: "Família",
    items: [
      { href: "/family/members", label: "Membros", icon: Users },
      { href: "/family/expense-splits", label: "Divisão de despesas", icon: Percent },
      { href: "/family/reports", label: "Relatórios", icon: BarChart3 },
      { href: "/family/notifications", label: "Notificações", icon: Bell },
    ],
  },
]

const PERSONAL_TABS: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: Home },
  { href: "/transactions", label: "Transações", icon: ArrowLeftRight },
  { href: "/assistant", label: "Assistente", icon: Bot },
]

const FAMILY_TABS: NavItem[] = [
  { href: "/family/dashboard", label: "Início", icon: Home },
  { href: "/family/transactions", label: "Transações", icon: ArrowLeftRight },
  { href: "/family/assistant", label: "Assistente", icon: Bot },
]

export function MobileNav({ context }: { context: "personal" | "family" }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(null)
  const { theme, setTheme } = useTheme()

  const sections = context === "family" ? FAMILY_SECTIONS : PERSONAL_SECTIONS
  const tabs = context === "family" ? FAMILY_TABS : PERSONAL_TABS
  const contextLabel = context === "family" ? "Familiar" : "Pessoal"

  const isActive = (href: string) => pathname === href

  // Find the current page title from nav sections
  const currentPageTitle = (() => {
    for (const section of sections) {
      for (const item of section.items) {
        if (pathname === item.href || pathname?.startsWith(item.href + "/")) {
          return item.label
        }
      }
    }
    return null
  })()

  const headerTitle = currentPageTitle
    ? `${currentPageTitle} (${contextLabel})`
    : contextLabel

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => {})
  }, [])

  // Auto-close drawer when viewport reaches desktop breakpoint
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false)
    }
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  const cycleTheme = () => {
    const order: Theme[] = ["system", "light", "dark"]
    const idx = order.indexOf(theme)
    setTheme(order[(idx + 1) % order.length])
  }

  const themeLabel =
    theme === "light" ? "Claro" : theme === "dark" ? "Escuro" : "Sistema"
  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor

  return (
    <>
      {/* Top bar — mobile only */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-card border-b border-border">
        <Sheet open={open} onOpenChange={(v) => { if (v) hapticTap(); setOpen(v) }}>
          <SheetTrigger
            className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 flex flex-col">
            <SheetHeader className="px-2 py-2 border-b border-border">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <ContextSwitcher />
            </SheetHeader>
            <nav className="flex-1 overflow-y-auto px-2 py-3">
              {sections.map((section) => (
                <div key={section.label} className="mb-4">
                  <p className="px-3 py-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                    {section.label}
                  </p>
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-accent"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              ))}
            </nav>

            {/* Compact user section with popover — same pattern as desktop */}
            <div className="border-t border-border p-2">
              <Popover>
                <PopoverTrigger className="flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent transition-colors cursor-pointer">
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name || "Avatar"}
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {user?.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-medium truncate">
                      {user?.name || "Utilizador"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {user?.phone || ""}
                    </p>
                  </div>
                </PopoverTrigger>
                <PopoverContent side="top" align="start" className="w-60 p-0">
                  {/* Header — name + phone */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                    {user?.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover"
                      />
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
                      href={context === "family" ? "/family/settings" : "/settings"}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Configurações
                    </Link>
                  </div>

                  {/* Theme cycle */}
                  <div className="border-t border-border p-1">
                    <button
                      type="button"
                      onClick={cycleTheme}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                    >
                      <ThemeIcon className="h-4 w-4" />
                      Tema: {themeLabel}
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-border p-1">
                    <button
                      type="button"
                      onClick={() => { setOpen(false); logout() }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Terminar sessão
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </SheetContent>
        </Sheet>

        <span className="text-sm font-semibold tracking-tight truncate px-2">{headerTitle}</span>

        {/* Spacer to keep the title centred (mirrors the hamburger button width) */}
        <span className="h-9 w-9 shrink-0" aria-hidden="true" />
      </header>

      {/* Bottom tab bar — mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around h-14 bg-card border-t border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = isActive(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={() => hapticTap()}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
