"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { ReferralCard } from "@/components/referral/ReferralCard"
import { FadeIn } from "@/components/common/FadeIn"
import { IconDisplay } from "@/components/common/IconDisplay"
import { SpeedDial } from "@/components/common/SpeedDial"
import { CreateTransactionDialog } from "@/components/transactions/CreateTransactionDialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useTour } from "@/lib/tours"
import { accountsApi, type AccountSummary } from "@/lib/api/accounts"
import { onboardingApi } from "@/lib/api/onboarding"
import { reportsApi, type PatrimonyData } from "@/lib/api/reports"
import { transactionsApi } from "@/lib/api/transactions"
import { budgetsApi } from "@/lib/api/budgets"
import { goalsApi } from "@/lib/api/goals"
import { formatKz } from "@/lib/format"
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Building2,
  CreditCard,
  Gift,
  PieChart,
  Plus,
  PlusCircle,
  Target,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const CHART_PALETTE = [
  "#0D9488",
  "#D97706",
  "#2563EB",
  "#7C3AED",
  "#15803D",
  "#EA580C",
  "#DB2777",
  "#B91C1C",
]

const REFERRAL_DISMISSED_KEY = "referral_banner_dismissed"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Transaction {
  id: string
  amount: number
  type: string
  description: string | null
  transaction_date: string
  category_name?: string | null
}

interface BudgetItem {
  id: string
  category_name: string
  limit_amount: number
  spent_amount: number
}

interface GoalItem {
  id: string
  name: string
  target_amount: number
  current_amount: number
}

interface SpendingCategory {
  category_name: string
  amount: number
  percentage: number
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  useTour("dashboard")
  const router = useRouter()
  const [summary, setSummary] = useState<AccountSummary | null>(null)
  const [patrimony, setPatrimony] = useState<PatrimonyData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<BudgetItem[]>([])
  const [goals, setGoals] = useState<GoalItem[]>([])
  const [monthIncome, setMonthIncome] = useState(0)
  const [monthExpense, setMonthExpense] = useState(0)
  const [spending, setSpending] = useState<SpendingCategory[]>([])
  const [referralDismissed, setReferralDismissed] = useState(false)
  const [txnDialogOpen, setTxnDialogOpen] = useState(false)

  // Read referral dismissal state from localStorage (mobile-only banner)
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      setReferralDismissed(window.localStorage.getItem(REFERRAL_DISMISSED_KEY) === "true")
    } catch {
      // ignore — default to not dismissed
    }
  }, [])

  function handleDismissReferral() {
    setReferralDismissed(true)
    try {
      window.localStorage.setItem(REFERRAL_DISMISSED_KEY, "true")
    } catch {
      // persistence unavailable — banner stays dismissed for this session
    }
  }

  // Per-section loading states — drive skeletons
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingPatrimony, setLoadingPatrimony] = useState(true)
  const [loadingTransactions, setLoadingTransactions] = useState(true)
  const [loadingBudgets, setLoadingBudgets] = useState(true)
  const [loadingGoals, setLoadingGoals] = useState(true)
  const [loadingMonthly, setLoadingMonthly] = useState(true)

  useEffect(() => {
    // Check onboarding status — redirect if not completed
    onboardingApi
      .getStatus()
      .then((status) => {
        if (!status.completed) {
          router.replace("/onboarding")
        }
      })
      .catch(() => {})

    accountsApi.summary()
      .then(setSummary)
      .catch(() => {})
      .finally(() => setLoadingSummary(false))

    reportsApi.patrimony()
      .then(setPatrimony)
      .catch(() => {})
      .finally(() => setLoadingPatrimony(false))

    transactionsApi.list("limit=5")
      .then((d) => setTransactions(d.items as Transaction[]))
      .catch(() => {})
      .finally(() => setLoadingTransactions(false))

    budgetsApi.list()
      .then(async (budgetList) => {
        // Fetch status for each active budget to get spent amounts per category
        const items: BudgetItem[] = []
        for (const b of (budgetList ?? []).slice(0, 2)) {
          try {
            const st = await budgetsApi.status(b.id)
            for (const item of (st.items ?? []).slice(0, 4)) {
              items.push({
                id: item.category_id,
                category_name: item.category_name,
                limit_amount: item.limit_amount,
                spent_amount: item.spent,
              })
            }
          } catch { /* skip */ }
        }
        setBudgets(items)
      })
      .catch(() => {})
      .finally(() => setLoadingBudgets(false))

    goalsApi.list("status=active")
      .then((d) => setGoals((d ?? []).slice(0, 3) as GoalItem[]))
      .catch(() => {})
      .finally(() => setLoadingGoals(false))

    transactionsApi.monthlySummary()
      .then((d) => {
        setMonthIncome(d.income ?? 0)
        setMonthExpense(d.expense ?? 0)
        setSpending(((d.by_category ?? []) as unknown as SpendingCategory[]).slice(0, 5))
      })
      .catch(() => {})
      .finally(() => setLoadingMonthly(false))
  }, [router])

  const currentMonth = new Date().toLocaleDateString("pt-AO", {
    month: "long",
    year: "numeric",
  })

  return (
    <div className="space-y-6">
      {/* --- Património Hero (full width) --- */}
      <FadeIn delay={0}>
      {loadingPatrimony ? (
        <Skeleton
          data-tour="net-worth"
          className="h-[220px] rounded-xl"
          aria-label="A carregar património"
        />
      ) : (
      <div data-tour="net-worth" className="rounded-xl bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          Património Líquido
        </p>
        <p className="text-[32px] font-bold font-mono tracking-tight leading-tight">
          {formatKz(patrimony?.net_worth ?? 0)}
        </p>

        {/* Sub-cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Wallet className="h-3.5 w-3.5 text-income" />
              <span className="text-xs text-muted-foreground">Contas</span>
            </div>
            <p className="text-sm font-bold font-mono text-income">
              {formatKz(patrimony?.assets.accounts.total ?? 0)}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-income" />
              <span className="text-xs text-muted-foreground">Investimentos</span>
            </div>
            <p className="text-sm font-bold font-mono text-income">
              {formatKz(patrimony?.assets.investments.total ?? 0)}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Building2 className="h-3.5 w-3.5 text-income" />
              <span className="text-xs text-muted-foreground">Bens</span>
            </div>
            <p className="text-sm font-bold font-mono text-income">
              {formatKz(patrimony?.assets.physical_assets.total ?? 0)}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <CreditCard className="h-3.5 w-3.5 text-expense" />
              <span className="text-xs text-muted-foreground">Dívidas</span>
            </div>
            <p className="text-sm font-bold font-mono text-expense">
              -{formatKz(patrimony?.liabilities.total ?? 0)}
            </p>
          </div>
        </div>

        {/* Assets vs Liabilities bar */}
        {patrimony && (patrimony.assets.total > 0 || patrimony.liabilities.total > 0) && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>Activos: <span className="font-mono font-semibold text-income">{formatKz(patrimony.assets.total)}</span></span>
              <span>Passivos: <span className="font-mono font-semibold text-expense">{formatKz(patrimony.liabilities.total)}</span></span>
            </div>
            <div className="h-2 w-full rounded-full bg-expense/20 overflow-hidden">
              <div
                className="h-2 rounded-full bg-income transition-all duration-500"
                style={{
                  width: `${patrimony.assets.total + patrimony.liabilities.total > 0
                    ? (patrimony.assets.total / (patrimony.assets.total + patrimony.liabilities.total)) * 100
                    : 0}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
      )}
      </FadeIn>

      {/* --- 2-Column Grid --- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Cash Flow */}
          <FadeIn delay={100}>
          <section data-tour="cashflow">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Fluxo de Caixa
            </h2>
            {loadingMonthly ? (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <Skeleton className="h-[108px] rounded-xl" />
                <Skeleton className="h-[108px] rounded-xl" />
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="rounded-xl bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">Receitas</p>
                    <ArrowUpRight className="h-4 w-4 text-income" />
                  </div>
                  <p className="text-2xl font-bold font-mono text-income">
                    +{formatKz(monthIncome)}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1 capitalize">{currentMonth}</p>
                </div>
                <div className="rounded-xl bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">Despesas</p>
                    <ArrowDownRight className="h-4 w-4 text-expense" />
                  </div>
                  <p className="text-2xl font-bold font-mono text-expense">
                    -{formatKz(monthExpense)}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1 capitalize">{currentMonth}</p>
                </div>
              </div>
            )}
          </section>
          </FadeIn>

          {/* Recent Transactions */}
          <FadeIn delay={300}>
          <section data-tour="recent-transactions">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Transacções Recentes
              </h2>
              <Link
                href="/transactions"
                className="text-sm text-primary hover:underline font-medium"
              >
                Ver todas
              </Link>
            </div>
            {loadingTransactions ? (
              <div className="md:space-y-0 md:rounded-xl md:bg-card md:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] md:divide-y md:divide-border">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-14 mb-2 rounded-xl md:mb-0 md:rounded-none"
                  />
                ))}
              </div>
            ) : transactions.length > 0 ? (
              <div className="md:rounded-xl md:bg-card md:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] md:divide-y md:divide-border">
                {transactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between h-14 transition-colors bg-card rounded-xl px-4 mb-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)] md:my-0 md:mb-0 md:rounded-none md:px-5 md:shadow-none md:bg-transparent hover:bg-accent/40"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          txn.type === "income" ? "bg-income" : "bg-expense"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {txn.description || "Sem descrição"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {txn.category_name || (txn.type === "income" ? "Receita" : "Despesa")}
                          {" -- "}
                          {new Date(txn.transaction_date).toLocaleDateString("pt-AO", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-semibold font-mono ml-4 ${
                        txn.type === "income" ? "text-income" : "text-expense"
                      }`}
                    >
                      {txn.type === "income" ? "+" : "-"}
                      {formatKz(txn.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ArrowUpRight}
                message="Nenhuma transacção registada"
                cta="Adicionar transacção"
                href="/transactions"
              />
            )}
          </section>
          </FadeIn>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Accounts */}
          <section data-tour="accounts-summary">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Contas
              </h2>
              <Link
                href="/accounts"
                className="text-sm text-primary hover:underline font-medium"
              >
                Ver todas
              </Link>
            </div>
            {loadingSummary ? (
              <div className="rounded-xl bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] divide-y divide-border">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="px-5 py-3">
                    <Skeleton className="h-10 rounded-md" />
                  </div>
                ))}
              </div>
            ) : summary && summary.accounts.length > 0 ? (
              <div className="rounded-xl bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] divide-y divide-border">
                {summary.accounts.slice(0, 4).map((acc) => (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <IconDisplay name={acc.type} className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{acc.name}</p>
                        {acc.institution && (
                          <p className="text-xs text-muted-foreground truncate">
                            {acc.institution}
                          </p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-sm font-semibold font-mono ml-4 ${
                        acc.balance >= 0 ? "text-income" : "text-expense"
                      }`}
                    >
                      {formatKz(acc.balance)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Wallet}
                message="Nenhuma conta registada"
                cta="Adicionar conta"
                href="/accounts"
              />
            )}
          </section>

          {/* Budget Progress */}
          <FadeIn delay={150}>
          <section data-tour="budget-summary">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Orçamento
              </h2>
              <Link
                href="/budget"
                className="text-sm text-primary hover:underline font-medium"
              >
                Ver todos
              </Link>
            </div>
            {loadingBudgets ? (
              <div className="rounded-xl bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-1.5 w-full rounded-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
            ) : budgets.length > 0 ? (
              <div className="rounded-xl bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] space-y-4">
                {budgets.map((b) => {
                  const pct = b.limit_amount > 0 ? (b.spent_amount / b.limit_amount) * 100 : 0
                  const barColor =
                    pct > 90 ? "bg-expense" : pct > 70 ? "bg-warning" : "bg-income"
                  return (
                    <div key={b.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium capitalize">{b.category_name}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {Math.round(pct)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted">
                        <div
                          className={`h-1.5 rounded-full ${barColor} transition-all duration-500`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-xs font-mono text-muted-foreground">
                          {formatKz(b.spent_amount)}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">
                          {formatKz(b.limit_amount)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                icon={PieChart}
                message="Nenhum orçamento definido"
                cta="Criar orçamento"
                href="/budget"
              />
            )}
          </section>
          </FadeIn>

          {/* Goals */}
          <FadeIn delay={200}>
          <section data-tour="goals-summary">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Metas
              </h2>
              <Link
                href="/goals"
                className="text-sm text-primary hover:underline font-medium"
              >
                Ver todas
              </Link>
            </div>
            {loadingGoals ? (
              <div className="rounded-xl bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-1.5 w-full rounded-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
            ) : goals.length > 0 ? (
              <div className="rounded-xl bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] space-y-4">
                {goals.map((g) => {
                  const pct =
                    g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0
                  return (
                    <div key={g.id}>
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="h-3.5 w-3.5 text-primary" />
                        <span className="text-sm font-medium truncate flex-1">{g.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {Math.round(pct)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-xs font-mono text-muted-foreground">
                          {formatKz(g.current_amount)}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">
                          {formatKz(g.target_amount)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                icon={Target}
                message="Nenhuma meta activa"
                cta="Criar meta"
                href="/goals"
              />
            )}
          </section>
          </FadeIn>

          {/* Referral — mobile: informational banner linking to settings; desktop: full card */}
          {!referralDismissed && (
            <Link
              href="/settings?tab=referrals"
              className="relative md:hidden flex items-center gap-3 rounded-xl bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] hover:bg-accent/40 transition-colors"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Gift className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1 pr-8">
                <p className="text-sm font-semibold truncate">Convide amigos e ganhe descontos</p>
                <p className="text-xs text-muted-foreground truncate">Toque para saber mais</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleDismissReferral()
                }}
                aria-label="Dispensar"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </Link>
          )}
          <div className="hidden md:block">
            <ReferralCard />
          </div>

          {/* Spending by Category */}
          <FadeIn delay={250}>
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Gastos por Categoria
            </h2>
            {loadingMonthly ? (
              <div className="rounded-xl bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Skeleton className="h-2.5 w-2.5 rounded-full shrink-0" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-3 w-16 ml-4" />
                  </div>
                ))}
              </div>
            ) : spending.length > 0 ? (
              <div className="rounded-xl bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] space-y-3">
                {spending.map((cat, i) => {
                  const color = CHART_PALETTE[i % CHART_PALETTE.length]
                  return (
                    <div key={cat.category_name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm capitalize truncate">{cat.category_name}</span>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <span className="text-xs text-muted-foreground font-mono">
                          {Math.round(cat.percentage)}%
                        </span>
                        <span className="text-sm font-mono font-semibold text-expense w-28 text-right">
                          {formatKz(cat.amount)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                icon={PieChart}
                message="Sem dados de despesas este mês"
                cta="Registar transacção"
                href="/transactions"
              />
            )}
          </section>
          </FadeIn>
        </div>
      </div>

      {/* Controlled transaction dialog for SpeedDial (mobile only). */}
      <CreateTransactionDialog
        hideTrigger
        open={txnDialogOpen}
        onOpenChange={setTxnDialogOpen}
      />

      {/* Speed Dial — mobile only. Replaces single FAB with expandable actions. */}
      <SpeedDial
        actions={[
          {
            key: "add",
            label: "Registar transacção",
            icon: PlusCircle,
            onClick: () => setTxnDialogOpen(true),
            color: "#0D9488",
          },
          {
            key: "transfer",
            label: "Transferir entre contas",
            icon: ArrowLeftRight,
            onClick: () => router.push("/accounts"),
          },
        ]}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Empty State                                                         */
/* ------------------------------------------------------------------ */

function EmptyState({
  icon: Icon,
  message,
  cta,
  href,
}: {
  icon: React.ElementType
  message: string
  cta: string
  href: string
}) {
  return (
    <div className="rounded-xl bg-card p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] flex flex-col items-center text-center">
      <Icon className="h-10 w-10 text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-4 w-4" />
        {cta}
      </Link>
    </div>
  )
}
