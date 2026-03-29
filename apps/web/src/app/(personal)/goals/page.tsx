"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Target } from "lucide-react"

import { GoalDetailDialog } from "@/components/goals/GoalDetailDialog"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { IconDisplay } from "@/components/common/IconDisplay"
import { goalsApi, type Goal, type GoalProgress } from "@/lib/api/goals"
import { accountsApi } from "@/lib/api/accounts"
import { formatKz } from "@/lib/format"


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
  const [createDescription, setCreateDescription] = useState("")
  const [createSavingsAccountId, setCreateSavingsAccountId] = useState("")
  const [createContributionFrequency, setCreateContributionFrequency] = useState("monthly")
  const [contributeAmount, setContributeAmount] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  interface AccountOption { id: string; name: string }
  const [goalAccounts, setGoalAccounts] = useState<AccountOption[]>([])

  useEffect(() => {
    accountsApi.summary()
      .then((data) => setGoalAccounts(data.accounts || []))
      .catch(() => {})
  }, [])

  const fetchGoals = () => {
    goalsApi.list().then(setGoals).catch(() => {})
  }

  useEffect(() => { fetchGoals() }, [])

  useEffect(() => {
    if (selectedGoal) {
      goalsApi.progress(selectedGoal)
        .then(setProgress).catch(() => {})
    } else {
      setProgress(null)
    }
  }, [selectedGoal])

  const handleCreate = async () => {
    if (!createName.trim() || !createTarget) return
    setIsSubmitting(true)
    try {
      await goalsApi.create({
        name: createName.trim(),
        target_amount: Math.round(parseFloat(createTarget) * 100),
        monthly_contribution: createMonthly ? Math.round(parseFloat(createMonthly) * 100) : undefined,
        description: createDescription.trim() || undefined,
        savings_account_id: createSavingsAccountId || undefined,
        contribution_frequency: createContributionFrequency,
      })
      setCreateOpen(false)
      setCreateName("")
      setCreateTarget("")
      setCreateMonthly("")
      setCreateDescription("")
      setCreateSavingsAccountId("")
      setCreateContributionFrequency("monthly")
      fetchGoals()
    } catch {}
    setIsSubmitting(false)
  }

  const handleContribute = async (goalId: string) => {
    if (!contributeAmount) return
    try {
      await goalsApi.contribute(goalId, Math.round(parseFloat(contributeAmount) * 100))
      setContributeAmount("")
      fetchGoals()
      // Refresh progress
      const p = await goalsApi.progress(goalId)
      setProgress(p)
    } catch {}
  }

  const handleDelete = (id: string) => {
    toast("Eliminar esta meta?", {
      description: "Esta acção não pode ser revertida.",
      action: {
        label: "Eliminar",
        onClick: async () => {
          await goalsApi.remove(id).catch(() => {})
          setSelectedGoal(null)
          fetchGoals()
          toast.success("Meta eliminada com sucesso")
        },
      },
      cancel: {
        label: "Cancelar",
        onClick: () => {},
      },
    })
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
              <div><Label>Contribuição (Kz, opcional)</Label><Input type="number" placeholder="0" value={createMonthly} onChange={(e) => setCreateMonthly(e.target.value)} className="font-mono" /></div>
              <div>
                <Label>Frequência da contribuição</Label>
                <Select value={createContributionFrequency} onValueChange={(v) => { if (v) setCreateContributionFrequency(v) }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="biweekly">Quinzenal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="annually">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Conta de poupança (opcional)</Label>
                <Select value={createSavingsAccountId} onValueChange={(v) => setCreateSavingsAccountId(v || "")}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar conta" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {goalAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descrição (opcional)</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 resize-none"
                  placeholder="Descreva o objectivo desta meta..."
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={isSubmitting}>{isSubmitting ? "A criar..." : "Criar meta"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-16">
          <Target className="h-10 w-10 mx-auto text-muted-foreground/30" />
          <p className="text-muted-foreground mt-3">Nenhuma meta criada</p>
          <p className="text-sm text-muted-foreground mt-1">Defina metas para acompanhar as suas poupanças</p>
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
                className="rounded-xl bg-card p-5 shadow-sm cursor-pointer transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
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
        onUpdated={() => { fetchGoals(); if (detailGoal && selectedGoal === detailGoal.id) { goalsApi.progress(detailGoal.id).then(setProgress).catch(() => {}) } }}
        onDeleted={() => { setSelectedGoal(null); fetchGoals() }}
      />
    </div>
  )
}
