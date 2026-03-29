"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { IconDisplay } from "@/components/common/IconDisplay"
import { apiFetch } from "@/lib/api"
import { formatKz } from "@/lib/format"
import {
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
  PieChart,
  Plus,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AccountSummary {
  total_assets: number
  total_liabilities: number
  net_worth: number
  accounts: {
    id: string
    name: string
    type: string
    balance: number
    icon: string | null
    institution?: string | null
  }[]
}

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

export default function HomePage() {
  const [summary, setSummary] = useState<AccountSummary | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<BudgetItem[]>([])
  const [goals, setGoals] = useState<GoalItem[]>([])
  const [monthIncome, setMonthIncome] = useState(0)
  const [monthExpense, setMonthExpense] = useState(0)
  const [spending, setSpending] = useState<SpendingCategory[]>([])

  useEffect(() => {
    apiFetch<AccountSummary>("/api/v1/accounts/summary")
      .then(setSummary)
      .catch(() => {})

    apiFetch<{ items: Transaction[] }>("/api/v1/transactions/?limit=5")
      .then((d) => setTransactions(d.items))
      .catch(() => {})

    apiFetch<{ items: BudgetItem[] }>("/api/v1/budgets/?limit=3")
      .then((d) => setBudgets(d.items ?? []))
      .catch(() => {})

    apiFetch<{ items: GoalItem[] }>("/api/v1/goals/?limit=3&status=active")
      .then((d) => setGoals(d.items ?? []))
      .catch(() => {})

    apiFetch<{ income: number; expense: number; by_category: SpendingCategory[] }>(
      "/api/v1/transactions/monthly-summary"
    )
      .then((d) => {
        setMonthIncome(d.income ?? 0)
        setMonthExpense(d.expense ?? 0)
        setSpending((d.by_category ?? []).slice(0, 5))
      })
      .catch(() => {})
  }, [])

  const currentMonth = new Date().toLocaleDateString("pt-AO", {
    month: "long",
    year: "numeric",
  })

  return (
    <div className="space-y-6">
      {/* --- Net Worth Hero --- */}
      <div className="rounded-xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
        <p className="text-sm text-muted-foreground mb-1">Saldo total</p>
        <p className="text-4xl font-bold font-mono tracking-tight">
          {formatKz(summary?.net_worth ?? 0)}
        </p>
        <div className="flex items-center gap-4 mt-3 text-sm">
          <span className="flex items-center gap-1 text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-primary" />
            Activos: {formatKz(summary?.total_assets ?? 0)}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            Passivos: {formatKz(summary?.total_liabilities ?? 0)}
          </span>
        </div>
      </div>

      {/* --- Cash Flow Row --- */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <div className="rounded-xl bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Receitas</p>
            <ArrowUpRight className="h-4 w-4 text-income" />
          </div>
          <p className="text-2xl font-bold font-mono text-income">
            +{formatKz(monthIncome)}
          </p>
          <p className="text-xs text-muted-foreground mt-1 capitalize">{currentMonth}</p>
        </div>
        <div className="rounded-xl bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Despesas</p>
            <ArrowDownRight className="h-4 w-4 text-expense" />
          </div>
          <p className="text-2xl font-bold font-mono text-expense">
            -{formatKz(monthExpense)}
          </p>
          <p className="text-xs text-muted-foreground mt-1 capitalize">{currentMonth}</p>
        </div>
      </div>

      {/* --- Accounts Grid --- */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Contas</h2>
          <Link
            href="/accounts"
            className="text-sm text-primary hover:underline font-medium"
          >
            Ver todas
          </Link>
        </div>
        {summary && summary.accounts.length > 0 ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {summary.accounts.map((acc) => (
              <div
                key={acc.id}
                className="rounded-xl bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <IconDisplay name={acc.type} className="h-[18px] w-[18px] text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{acc.name}</p>
                    {acc.institution && (
                      <p className="text-xs text-muted-foreground truncate">
                        {acc.institution}
                      </p>
                    )}
                  </div>
                </div>
                <p
                  className={`text-lg font-semibold font-mono ${
                    acc.balance >= 0 ? "text-income" : "text-expense"
                  }`}
                >
                  {formatKz(acc.balance)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                  {acc.type.replace(/_/g, " ")}
                </p>
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

      {/* --- Spending by Category --- */}
      <section>
        <h2 className="text-base font-semibold mb-3">Gastos por categoria</h2>
        {spending.length > 0 ? (
          <div className="rounded-xl bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] space-y-4">
            {spending.map((cat) => (
              <div key={cat.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm capitalize">{cat.category}</span>
                  <span className="text-sm font-mono font-semibold text-expense">
                    {formatKz(cat.amount)}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-expense transition-all duration-500"
                    style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={PieChart}
            message="Sem dados de despesas este mes"
            cta="Registar transaccao"
            href="/transactions"
          />
        )}
      </section>

      {/* --- Recent Transactions --- */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Ultimas transaccoes</h2>
          <Link
            href="/transactions"
            className="text-sm text-primary hover:underline font-medium"
          >
            Ver todas
          </Link>
        </div>
        {transactions.length > 0 ? (
          <div className="rounded-xl bg-card shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] divide-y divide-border">
            {transactions.map((txn) => (
              <div
                key={txn.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-accent/40 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {txn.description || "Sem descricao"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {txn.category_name || txn.type === "income" ? "Receita" : "Despesa"}
                    {" -- "}
                    {new Date(txn.transaction_date).toLocaleDateString("pt-AO", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
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
            message="Nenhuma transaccao registada"
            cta="Adicionar transaccao"
            href="/transactions"
          />
        )}
      </section>

      {/* --- Budget Progress --- */}
      {budgets.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">Orcamentos</h2>
            <Link
              href="/budget"
              className="text-sm text-primary hover:underline font-medium"
            >
              Ver todos
            </Link>
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {budgets.map((b) => {
              const pct = b.limit_amount > 0 ? (b.spent_amount / b.limit_amount) * 100 : 0
              const barColor =
                pct > 90 ? "bg-expense" : pct > 70 ? "bg-warning" : "bg-income"
              return (
                <div
                  key={b.id}
                  className="rounded-xl bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]"
                >
                  <p className="text-sm font-medium mb-1 capitalize">{b.category_name}</p>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-sm font-mono font-semibold">
                      {formatKz(b.spent_amount)}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      / {formatKz(b.limit_amount)}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className={`h-2 rounded-full ${barColor} transition-all duration-500`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round(pct)}% utilizado
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* --- Goals Progress --- */}
      {goals.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">Metas activas</h2>
            <Link
              href="/goals"
              className="text-sm text-primary hover:underline font-medium"
            >
              Ver todas
            </Link>
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map((g) => {
              const pct =
                g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0
              return (
                <div
                  key={g.id}
                  className="rounded-xl bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium truncate">{g.name}</p>
                  </div>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-sm font-mono font-semibold">
                      {formatKz(g.current_amount)}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      / {formatKz(g.target_amount)}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round(pct)}% alcancado
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      )}
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
    <div className="rounded-xl bg-card p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] flex flex-col items-center text-center">
      <Icon className="h-10 w-10 text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-4 w-4" />
        {cta}
      </Link>
    </div>
  )
}
