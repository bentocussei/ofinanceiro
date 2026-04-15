"use client"

import { useEffect, useState } from "react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"

import { IconDisplay } from "@/components/common/IconDisplay"
import { reportsApi, type CategorySpending, type ReportSummary } from "@/lib/api/reports"
import { formatKz } from "@/lib/format"
import { useTour } from "@/lib/tours"

const COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
  "#06b6d4", "#e11d48", "#a855f7",
]

type Period = "month" | "3months" | "year"

export default function ReportsPage() {
  useTour("reports")
  const [spending, setSpending] = useState<CategorySpending[]>([])
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [period, setPeriod] = useState<Period>("month")

  const fetchData = (p: Period) => {
    const now = new Date()
    const from = new Date()
    if (p === "month") from.setMonth(now.getMonth() - 1)
    else if (p === "3months") from.setMonth(now.getMonth() - 3)
    else from.setFullYear(now.getFullYear() - 1)

    const dateFrom = from.toISOString().split("T")[0]
    const dateTo = now.toISOString().split("T")[0]

    reportsApi.spendingByCategory(dateFrom, dateTo)
      .then(setSpending).catch(() => {})

    reportsApi.incomeExpenseSummary(dateFrom, dateTo)
      .then(setSummary).catch(() => {})
  }

  useEffect(() => {
    fetchData(period)
  }, [period])

  const totalExpense = spending.reduce((sum, s) => sum + s.total, 0)

  const periodOptions: { value: Period; label: string }[] = [
    { value: "month", label: "Este mês" },
    { value: "3months", label: "3 meses" },
    { value: "year", label: "Este ano" },
  ]

  const incomeExpenseData = summary
    ? [
        { name: "Receitas", value: summary.income },
        { name: "Despesas", value: summary.expense },
      ]
    : []

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Relatórios</h2>
        <div className="-mx-4 px-4 md:mx-0 md:px-0 flex gap-2 overflow-x-auto md:flex-wrap md:overflow-x-visible pb-1 md:pb-0 scrollbar-hide">
          {periodOptions.map((opt) => (
            <button
              key={opt.value}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs border whitespace-nowrap transition-colors ${
                period === opt.value
                  ? "bg-foreground text-background border-foreground"
                  : "border-border hover:bg-accent"
              }`}
              onClick={() => setPeriod(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Income vs Expense Summary */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Receitas</p>
            <p className="text-2xl font-mono font-bold text-green-500 mt-1">
              {formatKz(summary.income)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.income_count} transacções
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Despesas</p>
            <p className="text-2xl font-mono font-bold text-red-500 mt-1">
              {formatKz(summary.expense)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.expense_count} transacções
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Balanço</p>
            <p
              className={`text-2xl font-mono font-bold mt-1 ${
                summary.balance >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {formatKz(summary.balance)}
            </p>
          </div>
        </div>
      )}

      {/* Income vs Expense Bar Chart */}
      {summary && (summary.income > 0 || summary.expense > 0) && (
        <div className="rounded-lg border bg-card p-4 mb-8">
          <h3 className="text-sm font-semibold mb-4">Receitas vs Despesas</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={incomeExpenseData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${Math.round(v / 100)}Kz`}
              />
              <Tooltip
                formatter={(value) => formatKz(Number(value))}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                <Cell fill="#22c55e" />
                <Cell fill="#ef4444" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Spending by Category Pie Chart */}
      {spending.length > 0 ? (
        <div data-tour="spending-chart" className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-sm font-semibold mb-4">Gastos por categoria</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={spending}
                  dataKey="total"
                  nameKey="category_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                >
                  {spending.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatKz(Number(value))}
                  contentStyle={{ fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-sm font-semibold mb-4">Detalhes</h3>
            <div className="space-y-3">
              {spending.map((cat, i) => {
                const pct = totalExpense > 0 ? Math.round((cat.total / totalExpense) * 100) : 0
                return (
                  <div key={cat.category_id} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-sm flex-1">
                      <IconDisplay name={cat.category_name} className="h-4 w-4 inline" /> {cat.category_name}
                    </span>
                    <span className="text-xs text-muted-foreground">{pct}%</span>
                    <span className="text-sm font-mono font-semibold">
                      {formatKz(cat.total)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16">
          <IconDisplay name="financeiro" className="h-12 w-12 mx-auto opacity-30" />
          <p className="text-muted-foreground mt-3">
            Registe transacções para ver os relatórios
          </p>
        </div>
      )}
    </div>
  )
}
