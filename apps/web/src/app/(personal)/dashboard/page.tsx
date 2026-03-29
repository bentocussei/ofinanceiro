"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { IconDisplay } from "@/components/common/IconDisplay"
import { accountsApi, type AccountSummary } from "@/lib/api/accounts"
import { transactionsApi } from "@/lib/api/transactions"
import { budgetsApi } from "@/lib/api/budgets"
import { goalsApi } from "@/lib/api/goals"
import { formatKz } from "@/lib/format"
import {
  ArrowDownRight,
  ArrowUpRight,
  PieChart,
  Plus,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react"

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
  category: string
  amount: number
  percentage: number
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const [summary, setSummary] = useState<AccountSummary | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<BudgetItem[]>([])
  const [goals, setGoals] = useState<GoalItem[]>([])
  const [monthIncome, setMonthIncome] = useState(0)
  const [monthExpense, setMonthExpense] = useState(0)
  const [spending, setSpending] = useState<SpendingCategory[]>([])

  useEffect(() => {
    accountsApi.summary()
      .then(setSummary)
      .catch(() => {})

    transactionsApi.list("limit=5")
      .then((d) => setTransactions(d.items as Transaction[]))
      .catch(() => {})

    budgetsApi.list("limit=4")
      .then((d) => setBudgets(((d as unknown as { items: BudgetItem[] }).items) ?? []))
      .catch(() => {})

    goalsApi.list("limit=3&status=active")
      .then((d) => setGoals(((d as unknown as { items: GoalItem[] }).items) ?? []))
      .catch(() => {})

    transactionsApi.monthlySummary()
      .then((d) => {
        setMonthIncome(d.income ?? 0)
        setMonthExpense(d.expense ?? 0)
        setSpending(((d.by_category ?? []) as unknown as SpendingCategory[]).slice(0, 5))
      })
      .catch(() => {})
  }, [])

  const currentMonth = new Date().toLocaleDateString("pt-AO", {
    month: "long",
    year: "numeric",
  })

  return (
    <div className="space-y-6">
      {/* --- Net Worth Hero (full width) --- */}
      <div className="rounded-xl bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          Saldo total
        </p>
        <p className="text-[32px] font-bold font-mono tracking-tight leading-tight">
          {formatKz(summary?.net_worth ?? 0)}
        </p>
        <div className="flex items-center gap-4 mt-3 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-primary" />
            Activos: <span className="font-mono font-semibold text-foreground">{formatKz(summary?.total_assets ?? 0)}</span>
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            Passivos: <span className="font-mono font-semibold text-foreground">{formatKz(summary?.total_liabilities ?? 0)}</span>
          </span>
        </div>
      </div>

      {/* --- 2-Column Grid --- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Cash Flow */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Fluxo de Caixa
            </h2>
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
          </section>

          {/* Recent Transactions */}
          <section>
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
            {transactions.length > 0 ? (
              <div className="rounded-xl bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] divide-y divide-border">
                {transactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between px-5 h-14 hover:bg-accent/40 transition-colors"
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
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Accounts */}
          <section>
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
            {summary && summary.accounts.length > 0 ? (
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
          <section>
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
            {budgets.length > 0 ? (
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

          {/* Goals */}
          <section>
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
            {goals.length > 0 ? (
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

          {/* Spending by Category */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Gastos por Categoria
            </h2>
            {spending.length > 0 ? (
              <div className="rounded-xl bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] space-y-3">
                {spending.map((cat) => (
                  <div key={cat.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-2 w-2 rounded-full bg-expense shrink-0" />
                      <span className="text-sm capitalize truncate">{cat.category}</span>
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
                ))}
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
        </div>
      </div>
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
