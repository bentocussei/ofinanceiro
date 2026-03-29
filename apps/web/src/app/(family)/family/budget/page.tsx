"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { PieChart, Plus } from "lucide-react"

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
import { budgetsApi, type Budget } from "@/lib/api/budgets"
import { formatKz } from "@/lib/format"
import { getContextHeader } from "@/lib/context"

export default function FamilyBudgetPage() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [budgetName, setBudgetName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchBudgets = () => {
    const ctx = { headers: getContextHeader() }
    budgetsApi.list(undefined, ctx)
      .then((items) => setBudgets(items ?? []))
      .catch(() => {})
  }

  useEffect(() => {
    fetchBudgets()
  }, [])

  const handleCreate = async () => {
    if (!budgetName.trim()) return
    setIsSubmitting(true)
    try {
      const ctx = { headers: getContextHeader() }
      await budgetsApi.create({ name: budgetName.trim() }, ctx)
      setCreateOpen(false)
      setBudgetName("")
      fetchBudgets()
      toast.success("Orçamento doméstico criado")
    } catch {
      toast.error("Erro ao criar orçamento")
    }
    setIsSubmitting(false)
  }

  const activeBudgets = budgets.filter((b) => b.is_active)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Orçamento Doméstico</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4 mr-1" /> Novo orçamento
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Criar orçamento doméstico</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Nome</Label>
                <Input
                  placeholder="Ex: Orçamento mensal"
                  value={budgetName}
                  onChange={(e) => setBudgetName(e.target.value)}
                  autoFocus
                />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? "A criar..." : "Criar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {activeBudgets.length > 0 ? (
        <div className="space-y-4">
          {activeBudgets.map((budget) => (
            <div
              key={budget.id}
              className="rounded-xl bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)]"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{budget.name || "Orçamento"}</h3>
                <span className="text-xs text-muted-foreground">
                  {budget.period_start} - {budget.period_end}
                </span>
              </div>
              {budget.items && budget.items.length > 0 ? (
                <div className="space-y-3">
                  {budget.items.map((item) => {
                    const pct = item.limit_amount > 0 ? (item.spent_amount / item.limit_amount) * 100 : 0
                    const barColor = pct > 90 ? "bg-expense" : pct > 70 ? "bg-warning" : "bg-income"
                    return (
                      <div key={item.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium capitalize">{item.category_name}</span>
                          <span className="text-xs text-muted-foreground font-mono">{Math.round(pct)}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted">
                          <div
                            className={`h-1.5 rounded-full ${barColor} transition-all duration-500`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-xs font-mono text-muted-foreground">{formatKz(item.spent_amount)}</span>
                          <span className="text-xs font-mono text-muted-foreground">{formatKz(item.limit_amount)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sem categorias definidas neste orçamento
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-card p-12 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] flex flex-col items-center text-center">
          <PieChart className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">Nenhum orçamento doméstico definido</p>
        </div>
      )}
    </div>
  )
}
