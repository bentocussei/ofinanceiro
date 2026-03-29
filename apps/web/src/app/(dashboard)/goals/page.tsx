"use client"

import { useEffect, useState } from "react"

import { GoalDetailDialog } from "@/components/goals/GoalDetailDialog"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { IconDisplay } from "@/components/common/IconDisplay"
import { apiFetch } from "@/lib/api"
import { formatKz } from "@/lib/format"

interface Goal {
  id: string
  name: string
  type: string
  target_amount: number
  current_amount: number
  monthly_contribution: number | null
  status: string
}

interface GoalProgress {
  percentage: number
  remaining: number
  months_remaining: number | null
  contributions: { amount: number; note: string | null; contributed_at: string }[]
}


export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null)
  const [detailGoal, setDetailGoal] = useState<Goal | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [progress, setProgress] = useState<GoalProgress | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createTarget, setCreateTarget] = useState("")
  const [createMonthly, setCreateMonthly] = useState("")
  const [contributeAmount, setContributeAmount] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchGoals = () => {
    apiFetch<Goal[]>("/api/v1/goals/").then(setGoals).catch(() => {})
  }

  useEffect(() => { fetchGoals() }, [])

  useEffect(() => {
    if (selectedGoal) {
      apiFetch<GoalProgress>(`/api/v1/goals/${selectedGoal}/progress`)
        .then(setProgress).catch(() => {})
    } else {
      setProgress(null)
    }
  }, [selectedGoal])

  const handleCreate = async () => {
    if (!createName.trim() || !createTarget) return
    setIsSubmitting(true)
    try {
      await apiFetch("/api/v1/goals/", {
        method: "POST",
        body: JSON.stringify({
          name: createName.trim(),
          target_amount: Math.round(parseFloat(createTarget) * 100),
          monthly_contribution: createMonthly ? Math.round(parseFloat(createMonthly) * 100) : undefined,
        }),
      })
      setCreateOpen(false)
      setCreateName("")
      setCreateTarget("")
      setCreateMonthly("")
      fetchGoals()
    } catch {}
    setIsSubmitting(false)
  }

  const handleContribute = async (goalId: string) => {
    if (!contributeAmount) return
    try {
      await apiFetch(`/api/v1/goals/${goalId}/contribute`, {
        method: "POST",
        body: JSON.stringify({ amount: Math.round(parseFloat(contributeAmount) * 100) }),
      })
      setContributeAmount("")
      fetchGoals()
      // Refresh progress
      const p = await apiFetch<GoalProgress>(`/api/v1/goals/${goalId}/progress`)
      setProgress(p)
    } catch {}
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminar esta meta?")) return
    await apiFetch(`/api/v1/goals/${id}`, { method: "DELETE" }).catch(() => {})
    setSelectedGoal(null)
    fetchGoals()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Metas</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button />}>+ Nova meta</DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Nova meta</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div><Label>Nome</Label><Input placeholder="Ex: Férias Cabo Verde" value={createName} onChange={(e) => setCreateName(e.target.value)} /></div>
              <div><Label>Valor alvo (Kz)</Label><Input type="number" placeholder="0" value={createTarget} onChange={(e) => setCreateTarget(e.target.value)} className="font-mono" /></div>
              <div><Label>Contribuição mensal (Kz, opcional)</Label><Input type="number" placeholder="0" value={createMonthly} onChange={(e) => setCreateMonthly(e.target.value)} className="font-mono" /></div>
              <Button className="w-full" onClick={handleCreate} disabled={isSubmitting}>{isSubmitting ? "A criar..." : "Criar meta"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-16">
          <IconDisplay name="custom" className="h-12 w-12 opacity-30" />
          <p className="text-muted-foreground mt-3">Nenhuma meta criada</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((goal) => {
            const pct = goal.target_amount > 0 ? Math.round(goal.current_amount / goal.target_amount * 100) : 0
            const isComplete = goal.status === "completed"
            const isSelected = selectedGoal === goal.id

            return (
              <div
                key={goal.id}
                className="rounded-lg border bg-card p-4 cursor-pointer hover:border-foreground/20 transition-colors"
                onClick={() => setSelectedGoal(isSelected ? null : goal.id)}
              >
                <div className="flex items-center gap-2 mb-3">
                  <IconDisplay name={goal.type} className="h-6 w-6" />
                  <div className="flex-1">
                    <h3 className="font-semibold">{goal.name}</h3>
                    {isComplete && <span className="text-xs text-green-500 flex items-center gap-1"><IconDisplay name="savings_goal" className="h-3 w-3 text-green-500" /> Concluída</span>}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setDetailGoal(goal); setDetailOpen(true) }} className="text-blue-500 hover:text-blue-600 text-xs">Detalhe</button>
                </div>

                <div className="flex items-baseline gap-1 mb-2">
                  <span className="font-mono font-bold text-lg">{formatKz(goal.current_amount)}</span>
                  <span className="text-sm text-muted-foreground font-mono">/ {formatKz(goal.target_amount)}</span>
                </div>

                <div className="h-2 bg-muted rounded-full mb-1">
                  <div
                    className={`h-2 rounded-full ${isComplete ? "bg-green-500" : pct >= 75 ? "bg-amber-500" : "bg-blue-500"}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{pct}%</p>

                {/* Expanded detail */}
                {isSelected && progress && (
                  <div className="mt-4 border-t pt-3 space-y-3">
                    {progress.months_remaining && (
                      <p className="text-sm text-muted-foreground">
                        ~{progress.months_remaining} meses restantes
                      </p>
                    )}

                    {!isComplete && (
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Valor Kz"
                          value={contributeAmount}
                          onChange={(e) => setContributeAmount(e.target.value)}
                          className="font-mono"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); handleContribute(goal.id) }}>
                          Contribuir
                        </Button>
                      </div>
                    )}

                    {progress.contributions.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">Contribuições</p>
                        {progress.contributions.slice(0, 5).map((c, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">
                              {new Date(c.contributed_at).toLocaleDateString("pt-AO")}
                            </span>
                            <span className="font-mono">{formatKz(c.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <GoalDetailDialog
        item={detailGoal}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={() => { fetchGoals(); if (detailGoal && selectedGoal === detailGoal.id) { apiFetch<GoalProgress>(`/api/v1/goals/${detailGoal.id}/progress`).then(setProgress).catch(() => {}) } }}
        onDeleted={() => { setSelectedGoal(null); fetchGoals() }}
      />
    </div>
  )
}
