"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Plus, Target, PiggyBank } from "lucide-react"

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
import { goalsApi, type Goal } from "@/lib/api/goals"
import { accountsApi } from "@/lib/api/accounts"
import { formatKz } from "@/lib/format"


export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [detailGoal, setDetailGoal] = useState<Goal | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null)
  const [contributeAmount, setContributeAmount] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isContributing, setIsContributing] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  // Create form
  const [createName, setCreateName] = useState("")
  const [createTarget, setCreateTarget] = useState("")
  const [createTargetDate, setCreateTargetDate] = useState("")
  const [createDescription, setCreateDescription] = useState("")
  const [createMonthly, setCreateMonthly] = useState("")
  const [createContributionFrequency, setCreateContributionFrequency] = useState("monthly")
  const [createSavingsAccountId, setCreateSavingsAccountId] = useState("")
  const [createAutoContribute, setCreateAutoContribute] = useState(false)
  const [createAutoContributeDay, setCreateAutoContributeDay] = useState("1")

  interface AccountOption { id: string; name: string; balance: number }
  const [goalAccounts, setGoalAccounts] = useState<AccountOption[]>([])
  const [contributeAccount, setContributeAccount] = useState("")

  useEffect(() => {
    accountsApi.summary()
      .then((data) => setGoalAccounts(data.accounts || []))
      .catch(() => {})
  }, [])

  const fetchGoals = (loadMore = false) => {
    const params = loadMore && cursor ? `cursor=${cursor}` : ""
    goalsApi.listPage(params)
      .then((res) => {
        if (loadMore) {
          setGoals(prev => [...prev, ...res.items])
        } else {
          setGoals(res.items)
        }
        setCursor(res.cursor)
        setHasMore(res.has_more)
      })
      .catch(() => {})
  }

  useEffect(() => { fetchGoals() }, [])

  const resetForm = () => {
    setCreateName("")
    setCreateTarget("")
    setCreateTargetDate("")
    setCreateDescription("")
    setCreateMonthly("")
    setCreateContributionFrequency("monthly")
    setCreateSavingsAccountId("")
    setCreateAutoContribute(false)
    setCreateAutoContributeDay("1")
  }

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
        target_date: createTargetDate || undefined,
        auto_contribute: createAutoContribute,
        auto_contribute_day: createAutoContribute ? (parseInt(createAutoContributeDay) || 1) : undefined,
      })
      setCreateOpen(false)
      resetForm()
      setCursor(null)
      setHasMore(false)
      fetchGoals()
      toast.success("Meta criada com sucesso")
    } catch {
      toast.error("Erro ao criar meta")
    }
    setIsSubmitting(false)
  }

  const handleContribute = async () => {
    if (!contributeGoalId || !contributeAmount) return
    setIsContributing(true)
    try {
      await goalsApi.contribute(contributeGoalId, Math.round(parseFloat(contributeAmount) * 100), contributeAccount || undefined)
      setContributeGoalId(null)
      setContributeAmount("")
      setContributeAccount("")
      setCursor(null)
      setHasMore(false)
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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Metas</h2>
        <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm() }}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4 mr-1" /> Nova meta
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nova meta</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Nome</Label>
                <Input placeholder="Ex: Férias Cabo Verde" value={createName} onChange={(e) => setCreateName(e.target.value)} autoFocus />
              </div>
              <div>
                <Label>Valor alvo (Kz)</Label>
                <Input type="number" placeholder="0" value={createTarget} onChange={(e) => setCreateTarget(e.target.value)} className="font-mono" />
              </div>
              <div>
                <Label>Data alvo (opcional)</Label>
                <Input type="date" value={createTargetDate} onChange={(e) => setCreateTargetDate(e.target.value)} />
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
              <div>
                <Label>Contribuição (Kz, opcional)</Label>
                <Input type="number" placeholder="0" value={createMonthly} onChange={(e) => setCreateMonthly(e.target.value)} className="font-mono" />
              </div>
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
              <div className="flex items-center gap-3">
                <Label className="flex-1">Contribuição automática</Label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={createAutoContribute}
                  onClick={() => setCreateAutoContribute(!createAutoContribute)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${createAutoContribute ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${createAutoContribute ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>
              {createAutoContribute && (
                <div>
                  <Label>Dia da contribuição (1-31)</Label>
                  <Input type="number" min="1" max="31" value={createAutoContributeDay} onChange={(e) => setCreateAutoContributeDay(e.target.value)} className="font-mono" />
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
          <p className="text-sm text-muted-foreground mb-4">Nenhuma meta definida</p>
          <p className="text-xs text-muted-foreground">Defina metas para acompanhar as suas poupanças</p>
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" size="sm" onClick={() => fetchGoals(true)}>
            Carregar mais
          </Button>
        </div>
      )}

      {/* Contribute dialog */}
      <Dialog open={!!contributeGoalId} onOpenChange={(v) => { if (!v) { setContributeGoalId(null); setContributeAmount(""); setContributeAccount("") } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Contribuir para meta</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Conta de origem</Label>
              <Select value={contributeAccount} onValueChange={(v) => setContributeAccount(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Seleccionar conta (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem débito (manual)</SelectItem>
                  {goalAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name} — {formatKz(acc.balance)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
        onUpdated={() => { setCursor(null); setHasMore(false); fetchGoals() }}
        onDeleted={() => { setCursor(null); setHasMore(false); fetchGoals() }}
      />
    </div>
  )
}
