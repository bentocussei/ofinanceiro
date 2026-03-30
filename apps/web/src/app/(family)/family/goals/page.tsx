"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Plus, Target, PiggyBank } from "lucide-react"

import { GoalDetailDialog } from "@/components/goals/GoalDetailDialog"
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { goalsApi, type Goal } from "@/lib/api/goals"
import { accountsApi } from "@/lib/api/accounts"
import { formatKz } from "@/lib/format"
import { getContextHeader } from "@/lib/context"

export default function FamilyGoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [detailGoal, setDetailGoal] = useState<Goal | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null)
  const [contributeAmount, setContributeAmount] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isContributing, setIsContributing] = useState(false)

  // Create form
  const [goalName, setGoalName] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [targetDate, setTargetDate] = useState("")
  const [description, setDescription] = useState("")
  const [contributionAmount, setContributionAmount] = useState("")
  const [contributionFrequency, setContributionFrequency] = useState("monthly")
  const [savingsAccountId, setSavingsAccountId] = useState("")
  const [autoContribute, setAutoContribute] = useState(false)
  const [autoContributeDay, setAutoContributeDay] = useState("1")

  interface AccountOption { id: string; name: string }
  const [goalAccounts, setGoalAccounts] = useState<AccountOption[]>([])

  useEffect(() => {
    const ctx = { headers: getContextHeader() }
    accountsApi.summary(ctx)
      .then((data) => setGoalAccounts(data.accounts || []))
      .catch(() => {})
  }, [])

  const fetchGoals = () => {
    const ctx = { headers: getContextHeader() }
    goalsApi.list(undefined, ctx)
      .then((items) => setGoals(items ?? []))
      .catch(() => {})
  }

  useEffect(() => {
    fetchGoals()
  }, [])

  const resetForm = () => {
    setGoalName("")
    setTargetAmount("")
    setTargetDate("")
    setDescription("")
    setContributionAmount("")
    setContributionFrequency("monthly")
    setSavingsAccountId("")
    setAutoContribute(false)
    setAutoContributeDay("1")
  }

  const handleCreate = async () => {
    if (!goalName.trim() || !targetAmount) return
    setIsSubmitting(true)
    try {
      const ctx = { headers: getContextHeader() }
      await goalsApi.create({
        name: goalName.trim(),
        target_amount: Math.round(parseFloat(targetAmount) * 100),
        target_date: targetDate || undefined,
        description: description.trim() || undefined,
        monthly_contribution: contributionAmount ? Math.round(parseFloat(contributionAmount) * 100) : undefined,
        contribution_frequency: contributionFrequency,
        savings_account_id: savingsAccountId || undefined,
        auto_contribute: autoContribute,
        auto_contribute_day: autoContribute ? (parseInt(autoContributeDay) || 1) : undefined,
        type: "savings",
      }, ctx)
      setCreateOpen(false)
      resetForm()
      fetchGoals()
      toast.success("Meta familiar criada com sucesso")
    } catch {
      toast.error("Erro ao criar meta")
    }
    setIsSubmitting(false)
  }

  const handleContribute = async () => {
    if (!contributeGoalId || !contributeAmount) return
    setIsContributing(true)
    try {
      const ctx = { headers: getContextHeader() }
      await goalsApi.contribute(contributeGoalId, Math.round(parseFloat(contributeAmount) * 100), ctx)
      setContributeGoalId(null)
      setContributeAmount("")
      fetchGoals()
      toast.success("Contribuição registada com sucesso")
    } catch {
      toast.error("Erro ao contribuir")
    }
    setIsContributing(false)
  }

  const activeGoals = goals.filter((g) => g.status === "active")
  const completedGoals = goals.filter((g) => g.status === "completed")

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Metas Familiares</h2>
        <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm() }}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4 mr-1" /> Nova meta
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
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
                  className="font-mono"
                />
              </div>
              <div>
                <Label>Data alvo (opcional)</Label>
                <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
              </div>
              <div>
                <Label>Descrição (opcional)</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 resize-none"
                  placeholder="Descreva o objectivo desta meta..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div>
                <Label>Contribuição (Kz, opcional)</Label>
                <Input type="number" placeholder="0" value={contributionAmount} onChange={(e) => setContributionAmount(e.target.value)} className="font-mono" />
              </div>
              <div>
                <Label>Frequência da contribuição</Label>
                <Select value={contributionFrequency} onValueChange={(v) => { if (v) setContributionFrequency(v) }}>
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
                <Select value={savingsAccountId} onValueChange={(v) => setSavingsAccountId(v || "")}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar conta" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {goalAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Label className="flex-1">Contribuição automática</Label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoContribute}
                  onClick={() => setAutoContribute(!autoContribute)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${autoContribute ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${autoContribute ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>
              {autoContribute && (
                <div>
                  <Label>Dia da contribuição (1-31)</Label>
                  <Input type="number" min="1" max="31" value={autoContributeDay} onChange={(e) => setAutoContributeDay(e.target.value)} className="font-mono" />
                </div>
              )}
              <Button className="w-full" onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? "A criar..." : "Criar meta"}
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
          <div className="grid gap-4 md:grid-cols-2">
            {activeGoals.map((g) => {
              const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0
              return (
                <div
                  key={g.id}
                  className="rounded-xl bg-card p-5 shadow-sm cursor-pointer hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-shadow"
                  onClick={() => { setDetailGoal(g); setDetailOpen(true) }}
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
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-xs font-mono text-muted-foreground">{formatKz(g.current_amount)}</span>
                    <span className="text-xs font-mono text-muted-foreground">{formatKz(g.target_amount)}</span>
                  </div>
                  {g.contributions && g.contributions.length > 0 && (
                    <div className="pt-3 border-t border-border space-y-1">
                      <p className="text-xs text-muted-foreground font-semibold mb-1">Contribuições</p>
                      {g.contributions.map((c) => (
                        <div key={c.member_name} className="flex items-center justify-between">
                          <span className="text-xs">{c.member_name}</span>
                          <span className="text-xs font-mono">{formatKz(c.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={(e) => { e.stopPropagation(); setContributeGoalId(g.id); setContributeAmount("") }}
                    >
                      <PiggyBank className="h-4 w-4 mr-1" />
                      Contribuir
                    </Button>
                  </div>
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
          <div className="grid gap-3 md:grid-cols-2">
            {completedGoals.map((g) => (
              <div
                key={g.id}
                className="rounded-xl bg-card p-4 shadow-sm opacity-70 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => { setDetailGoal(g); setDetailOpen(true) }}
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
        <div className="rounded-xl bg-card p-12 shadow-sm flex flex-col items-center text-center">
          <Target className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">Nenhuma meta familiar definida</p>
        </div>
      )}

      {/* Contribute dialog */}
      <Dialog open={!!contributeGoalId} onOpenChange={(v) => { if (!v) { setContributeGoalId(null); setContributeAmount("") } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Contribuir para meta</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Valor (Kz)</Label>
              <Input type="number" placeholder="0" value={contributeAmount} onChange={(e) => setContributeAmount(e.target.value)} className="font-mono" autoFocus />
            </div>
            <Button className="w-full" onClick={handleContribute} disabled={isContributing || !contributeAmount}>
              {isContributing ? "A contribuir..." : "Contribuir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <GoalDetailDialog
        item={detailGoal}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={fetchGoals}
        onDeleted={fetchGoals}
        contextHeaders={getContextHeader()}
      />
    </div>
  )
}
