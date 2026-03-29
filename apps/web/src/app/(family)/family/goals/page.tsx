"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Plus, Target } from "lucide-react"

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
import { goalsApi, type Goal } from "@/lib/api/goals"
import { formatKz } from "@/lib/format"
import { getContextHeader } from "@/lib/context"

export default function FamilyGoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [goalName, setGoalName] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchGoals = () => {
    const ctx = { headers: getContextHeader() }
    goalsApi.list(undefined, ctx)
      .then((items) => setGoals(items ?? []))
      .catch(() => {})
  }

  useEffect(() => {
    fetchGoals()
  }, [])

  const handleCreate = async () => {
    if (!goalName.trim() || !targetAmount) return
    setIsSubmitting(true)
    try {
      const ctx = { headers: getContextHeader() }
      await goalsApi.create({
        name: goalName.trim(),
        target_amount: Math.round(parseFloat(targetAmount) * 100),
        type: "savings",
      }, ctx)
      setCreateOpen(false)
      setGoalName("")
      setTargetAmount("")
      fetchGoals()
      toast.success("Meta familiar criada")
    } catch {
      toast.error("Erro ao criar meta")
    }
    setIsSubmitting(false)
  }

  const activeGoals = goals.filter((g) => g.status === "active")
  const completedGoals = goals.filter((g) => g.status === "completed")

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Metas Familiares</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4 mr-1" /> Nova meta
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Criar meta familiar</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Nome</Label>
                <Input
                  placeholder="Ex: Férias em família"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <Label>Valor alvo (Kz)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? "A criar..." : "Criar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {activeGoals.length > 0 && (
        <section className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Metas activas
          </p>
          <div className="space-y-4">
            {activeGoals.map((g) => {
              const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0
              return (
                <div
                  key={g.id}
                  className="rounded-xl bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold flex-1">{g.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">{Math.round(pct)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted mb-2">
                    <div
                      className="h-2 rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-mono text-muted-foreground">{formatKz(g.current_amount)}</span>
                    <span className="text-xs font-mono text-muted-foreground">{formatKz(g.target_amount)}</span>
                  </div>
                  {g.contributions && g.contributions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border space-y-1">
                      <p className="text-xs text-muted-foreground font-semibold mb-1">Contribuições</p>
                      {g.contributions.map((c) => (
                        <div key={c.member_name} className="flex items-center justify-between">
                          <span className="text-xs">{c.member_name}</span>
                          <span className="text-xs font-mono">{formatKz(c.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {completedGoals.length > 0 && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Metas concluídas
          </p>
          <div className="space-y-3">
            {completedGoals.map((g) => (
              <div
                key={g.id}
                className="rounded-xl bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] opacity-70"
              >
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-income" />
                  <span className="text-sm font-medium flex-1">{g.name}</span>
                  <span className="text-xs font-mono text-income">{formatKz(g.target_amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {goals.length === 0 && (
        <div className="rounded-xl bg-card p-12 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] flex flex-col items-center text-center">
          <Target className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">Nenhuma meta familiar definida</p>
        </div>
      )}
    </div>
  )
}
