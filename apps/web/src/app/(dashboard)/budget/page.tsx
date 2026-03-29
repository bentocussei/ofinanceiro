"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { IconDisplay } from "@/components/common/IconDisplay"
import { apiFetch } from "@/lib/api"
import { formatKz } from "@/lib/format"

interface Budget {
  id: string
  name: string | null
  method: string
  period_start: string
  period_end: string
  is_active: boolean
}

interface BudgetItemStatus {
  category_id: string
  category_name: string
  category_icon: string | null
  limit_amount: number
  spent: number
  remaining: number
  percentage: number
}

interface BudgetStatus {
  budget_id: string
  name: string | null
  days_remaining: number
  total_limit: number | null
  total_spent: number
  total_remaining: number
  percentage: number
  items: BudgetItemStatus[]
}

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

export default function BudgetPage() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [statuses, setStatuses] = useState<Record<string, BudgetStatus>>({})
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createLimit, setCreateLimit] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchBudgets = () => {
    apiFetch<Budget[]>("/api/v1/budgets/").then((data) => {
      setBudgets(data)
      data.forEach((b) => {
        apiFetch<BudgetStatus>(`/api/v1/budgets/${b.id}/status`)
          .then((s) => setStatuses((prev) => ({ ...prev, [b.id]: s })))
          .catch(() => {})
      })
    }).catch(() => {})
  }

  useEffect(() => { fetchBudgets() }, [])

  const handleCreate = async () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    setIsSubmitting(true)
    try {
      await apiFetch("/api/v1/budgets/", {
        method: "POST",
        body: JSON.stringify({
          name: createName.trim() || `${start.toLocaleDateString("pt-AO", { month: "long", year: "numeric" })}`,
          method: "category",
          period_start: start.toISOString().split("T")[0],
          period_end: end.toISOString().split("T")[0],
          total_limit: createLimit ? Math.round(parseFloat(createLimit) * 100) : undefined,
        }),
      })
      setCreateOpen(false)
      setCreateName("")
      setCreateLimit("")
      fetchBudgets()
    } catch {}
    setIsSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem a certeza que deseja eliminar este orçamento?")) return
    await apiFetch(`/api/v1/budgets/${id}`, { method: "DELETE" }).catch(() => {})
    fetchBudgets()
  }

  const activeStatus = selectedBudget ? statuses[selectedBudget] : null

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Orçamentos</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button />}>+ Novo orçamento</DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Novo orçamento</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Nome (opcional)</Label>
                <Input placeholder="Ex: Março 2026" value={createName} onChange={(e) => setCreateName(e.target.value)} />
              </div>
              <div>
                <Label>Limite total (Kz)</Label>
                <Input type="number" placeholder="0" value={createLimit} onChange={(e) => setCreateLimit(e.target.value)} className="font-mono" />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? "A criar..." : "Criar orçamento"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {budgets.length === 0 ? (
        <div className="text-center py-16">
          <IconDisplay name="financeiro" className="h-12 w-12 opacity-30" />
          <p className="text-muted-foreground mt-3">Nenhum orçamento criado</p>
          <p className="text-sm text-muted-foreground mt-1">
            Crie um orçamento para controlar os seus gastos
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {budgets.map((budget) => {
            const status = statuses[budget.id]
            return (
              <div
                key={budget.id}
                className="rounded-lg border bg-card p-4 cursor-pointer hover:border-foreground/20 transition-colors"
                onClick={() => setSelectedBudget(selectedBudget === budget.id ? null : budget.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{budget.name || "Orçamento"}</h3>
                  <div className="flex items-center gap-2">
                    {status && (
                      <span className="text-xs text-muted-foreground">{status.days_remaining}d</span>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(budget.id) }} className="text-red-500 hover:text-red-600 text-xs">
                      Eliminar
                    </button>
                  </div>
                </div>

                {status && (
                  <>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="font-mono font-bold text-lg">{formatKz(status.total_spent)}</span>
                      <span className="text-sm text-muted-foreground font-mono">/ {formatKz(status.total_limit || 0)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full mb-1">
                      <div className={`h-2 rounded-full ${getProgressColor(status.percentage)}`} style={{ width: `${Math.min(status.percentage, 100)}%` }} />
                    </div>
                    <p className={`text-xs font-semibold ${getTextColor(status.percentage)}`}>{status.percentage}% utilizado</p>

                    {/* Expanded: show items */}
                    {selectedBudget === budget.id && status.items.length > 0 && (
                      <div className="mt-4 space-y-3 border-t pt-3">
                        {status.items.map((item) => (
                          <div key={item.category_id}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="flex items-center gap-1"><IconDisplay name={item.category_name} className="h-4 w-4 inline" /> {item.category_name}</span>
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
    </div>
  )
}
