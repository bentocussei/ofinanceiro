"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { apiFetch } from "@/lib/api"
import { formatKz } from "@/lib/format"
import { getContextHeader } from "@/lib/context"
import {
  ArrowDownRight,
  ArrowUpRight,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react"

interface FamilySummary {
  total_assets: number
  total_liabilities: number
  net_worth: number
  accounts: {
    id: string
    name: string
    type: string
    balance: number
  }[]
}

interface Transaction {
  id: string
  amount: number
  type: string
  description: string | null
  transaction_date: string
  category_name?: string | null
  member_name?: string | null
}

interface GoalItem {
  id: string
  name: string
  target_amount: number
  current_amount: number
}

interface MemberSpending {
  member_name: string
  amount: number
}

export default function FamilyDashboardPage() {
  const [summary, setSummary] = useState<FamilySummary | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [goals, setGoals] = useState<GoalItem[]>([])
  const [monthIncome, setMonthIncome] = useState(0)
  const [monthExpense, setMonthExpense] = useState(0)
  const [memberSpending, setMemberSpending] = useState<MemberSpending[]>([])

  useEffect(() => {
    const headers = getContextHeader()

    apiFetch<FamilySummary>("/api/v1/accounts/summary", { headers })
      .then(setSummary)
      .catch(() => {})

    apiFetch<{ items: Transaction[] }>("/api/v1/transactions/?limit=5", { headers })
      .then((d) => setTransactions(d.items))
      .catch(() => {})

    apiFetch<{ items: GoalItem[] }>("/api/v1/goals/?limit=3&status=active", { headers })
      .then((d) => setGoals(d.items ?? []))
      .catch(() => {})

    apiFetch<{ income: number; expense: number; by_member: MemberSpending[] }>(
      "/api/v1/transactions/monthly-summary",
      { headers }
    )
      .then((d) => {
        setMonthIncome(d.income ?? 0)
        setMonthExpense(d.expense ?? 0)
        setMemberSpending((d.by_member ?? []).slice(0, 5))
      })
      .catch(() => {})
  }, [])

  const currentMonth = new Date().toLocaleDateString("pt-AO", {
    month: "long",
    year: "numeric",
  })

  return (
    <div className="space-y-6">
      {/* Family Net Worth */}
      <div className="rounded-xl bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          Saldo familiar total
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Cash Flow */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Fluxo de Caixa Familiar
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
                href="/family/transactions"
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
                          {txn.member_name && <span className="font-medium">{txn.member_name} -- </span>}
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
              <div className="rounded-xl bg-card p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] flex flex-col items-center text-center">
                <ArrowUpRight className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma transacção familiar registada</p>
              </div>
            )}
          </section>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Shared Accounts */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Contas Partilhadas
              </h2>
              <Link
                href="/family/accounts"
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
                        <Wallet className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-sm font-medium truncate">{acc.name}</p>
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
              <div className="rounded-xl bg-card p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] flex flex-col items-center text-center">
                <Wallet className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma conta partilhada</p>
              </div>
            )}
          </section>

          {/* Spending by Member */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Gastos por Membro
            </h2>
            {memberSpending.length > 0 ? (
              <div className="rounded-xl bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] space-y-3">
                {memberSpending.map((m) => (
                  <div key={m.member_name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{m.member_name}</span>
                    </div>
                    <span className="text-sm font-mono font-semibold text-expense ml-4">
                      {formatKz(m.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-card p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] flex flex-col items-center text-center">
                <Users className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Sem dados de gastos por membro</p>
              </div>
            )}
          </section>

          {/* Family Goals */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Metas Familiares
              </h2>
              <Link
                href="/family/goals"
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
              <div className="rounded-xl bg-card p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] flex flex-col items-center text-center">
                <Target className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma meta familiar activa</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
