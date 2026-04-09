"use client"

import { useEffect, useMemo, useState } from "react"
import { PieChart } from "lucide-react"
import { MobileFAB } from "@/components/layout/MobileFAB"

import { BudgetDetailDialog } from "@/components/budgets/BudgetDetailDialog"
import { BudgetFormDialog } from "@/components/budgets/BudgetFormDialog"
import { Button } from "@/components/ui/button"
import { IconDisplay } from "@/components/common/IconDisplay"
import { budgetsApi, type Budget, type BudgetStatus } from "@/lib/api/budgets"
import { formatKz } from "@/lib/format"

function getProgressColor(pct: number): string {
  if (pct >= 100) return "bg-red-500"
  if (pct >= 90) return "bg-orange-500"
  if (pct >= 70) return "bg-amber-500"
  return "bg-green-500"
}

function getTextColor(pct: number): string {
  if (pct >= 100) return "text-red-500"
  if (pct >= 90) return "text-orange-500"
  if (pct >= 70) return "text-amber-500"
  return "text-green-500"
}

const METHOD_LABELS: Record<string, string> = {
  category: "Categoria",
  "50_30_20": "50/30/20",
  envelope: "Envelope",
  flex: "Flex",
  zero_based: "Base zero",
}

export default function BudgetPage() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [statuses, setStatuses] = useState<Record<string, BudgetStatus>>({})
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null)
  // Derive from list so the modal sees fresh data after refetches.
  const [detailBudgetId, setDetailBudgetId] = useState<string | null>(null)
  const detailBudget = useMemo(
    () => budgets.find((b) => b.id === detailBudgetId) ?? null,
    [budgets, detailBudgetId],
  )
  const [detailOpen, setDetailOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const fetchBudgets = () => {
    budgetsApi.list().then((data) => {
      setBudgets(data)
      data.forEach((b) => {
        budgetsApi.status(b.id)
          .then((s) => setStatuses((prev) => ({ ...prev, [b.id]: s })))
          .catch(() => {})
      })
    }).catch(() => {})
  }

  useEffect(() => { fetchBudgets() }, [])

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Orcamentos</h2>
        <Button className="hidden md:inline-flex" onClick={() => setCreateOpen(true)}>+ Novo orcamento</Button>
      <MobileFAB onClick={() => setCreateOpen(true)} label="Novo orcamento" />
      </div>

      {budgets.length === 0 ? (
        <div className="text-center py-16">
          <PieChart className="h-10 w-10 mx-auto text-muted-foreground/30" />
          <p className="text-muted-foreground mt-3">Nenhum orcamento criado</p>
          <p className="text-sm text-muted-foreground mt-1">
            Crie um orcamento para controlar os seus gastos
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {budgets.map((budget) => {
            const status = statuses[budget.id]
            return (
              <div
                key={budget.id}
                className="rounded-xl bg-card p-5 shadow-sm cursor-pointer transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                onClick={() => setSelectedBudget(selectedBudget === budget.id ? null : budget.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{budget.name || "Orcamento"}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs rounded-full bg-muted px-2 py-0.5">
                        {METHOD_LABELS[budget.method] || budget.method}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {budget.period_start} - {budget.period_end}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {status && (
                      <span className="text-xs text-muted-foreground">{status.days_remaining}d</span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setDetailBudgetId(budget.id); setDetailOpen(true) }}
                      className="text-blue-500 hover:text-blue-600 text-xs font-medium"
                    >
                      Detalhe
                    </button>
                  </div>
                </div>

                {status && (
                  <>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="font-mono font-bold text-lg">{formatKz(status.total_spent)}</span>
                      <span className="text-sm text-muted-foreground font-mono">/ {formatKz(status.total_limit || 0)}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full mb-1">
                      <div className={`h-1.5 rounded-full transition-all ${getProgressColor(status.percentage)}`} style={{ width: `${Math.min(status.percentage, 100)}%` }} />
                    </div>
                    <p className={`text-xs font-semibold ${getTextColor(status.percentage)}`}>{status.percentage}% utilizado</p>

                    {/* Expanded: show items */}
                    {selectedBudget === budget.id && status.items.length > 0 && (
                      <div className="mt-4 space-y-3 border-t pt-3">
                        {status.items.map((item) => (
                          <div key={item.category_id}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="flex items-center gap-1.5">
                                <IconDisplay name={item.category_icon || item.category_name} className="h-4 w-4" />
                                {item.category_name}
                              </span>
                              <span className="font-mono text-xs text-muted-foreground">
                                {formatKz(item.spent)} / {formatKz(item.limit_amount)}
                              </span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full">
                              <div className={`h-1.5 rounded-full ${getProgressColor(item.percentage)}`} style={{ width: `${Math.min(item.percentage, 100)}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      <BudgetFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={fetchBudgets}
      />

      <BudgetDetailDialog
        item={detailBudget}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={fetchBudgets}
        onDeleted={fetchBudgets}
      />
    </div>
  )
}
