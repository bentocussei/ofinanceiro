"use client"

import { useEffect, useState } from "react"
import { BarChart3, Users } from "lucide-react"

import { reportsApi, type ReportSummary } from "@/lib/api/reports"
import { formatKz } from "@/lib/format"
import { getContextHeader } from "@/lib/context"

export default function FamilyReportsPage() {
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [period, setPeriod] = useState<"month" | "3months" | "year">("month")

  const fetchReport = () => {
    const ctx = { headers: getContextHeader() }
    reportsApi.monthlySummary(period, ctx)
      .then(setSummary)
      .catch(() => {})
  }

  useEffect(() => {
    fetchReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period])

  const periodOptions: { value: typeof period; label: string }[] = [
    { value: "month", label: "Este mês" },
    { value: "3months", label: "3 meses" },
    { value: "year", label: "Este ano" },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Relatórios Familiares</h2>
      </div>

      {/* Period filter */}
      <div className="flex gap-2 mb-6">
        {periodOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              period === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {summary ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div className="rounded-xl bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)]">
              <p className="text-xs text-muted-foreground mb-1">Receitas</p>
              <p className="text-xl font-bold font-mono text-income">+{formatKz(summary.income)}</p>
            </div>
            <div className="rounded-xl bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)]">
              <p className="text-xs text-muted-foreground mb-1">Despesas</p>
              <p className="text-xl font-bold font-mono text-expense">-{formatKz(summary.expense)}</p>
            </div>
            <div className="rounded-xl bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)]">
              <p className="text-xs text-muted-foreground mb-1">Balanço</p>
              <p className={`text-xl font-bold font-mono ${summary.balance >= 0 ? "text-income" : "text-expense"}`}>
                {formatKz(summary.balance)}
              </p>
            </div>
          </div>

          {/* Spending by Category */}
          {summary.by_category && summary.by_category.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Gastos por Categoria
              </h3>
              <div className="rounded-xl bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] space-y-3">
                {summary.by_category.map((cat) => {
                  const amount = (cat as unknown as { amount?: number; total?: number }).amount ?? cat.total ?? 0
                  const name = cat.category_name ?? ""
                  const pct = summary.expense > 0 ? (amount / summary.expense) * 100 : 0
                  return (
                    <div key={name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm capitalize">{name}</span>
                        <span className="text-sm font-mono font-semibold text-expense">{formatKz(amount)}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full bg-expense transition-all duration-500"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Spending by Member */}
          {summary.by_member && summary.by_member.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Por Membro
              </h3>
              <div className="rounded-xl bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] divide-y divide-border">
                {summary.by_member.map((m) => (
                  <div key={m.member_name} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{m.member_name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-mono text-income">+{formatKz(m.income ?? 0)}</span>
                      <span className="text-xs font-mono text-expense">-{formatKz(m.expense ?? 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-card p-12 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] flex flex-col items-center text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">A carregar relatórios...</p>
        </div>
      )}
    </div>
  )
}
