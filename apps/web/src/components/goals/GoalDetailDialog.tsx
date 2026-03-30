"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Pencil, Trash2, PiggyBank, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { goalsApi, type Goal, type GoalProgress } from "@/lib/api/goals"
import { accountsApi } from "@/lib/api/accounts"
import { formatKz } from "@/lib/format"

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
  quarterly: "Trimestral",
  annually: "Anual",
}

interface Props {
  item: Goal | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
  onDeleted?: () => void
  contextHeaders?: Record<string, string>
}

export function GoalDetailDialog({
  item,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
  contextHeaders,
}: Props) {
  const [progress, setProgress] = useState<GoalProgress | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState("")
  const [editTarget, setEditTarget] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editSavingsAccountId, setEditSavingsAccountId] = useState("")
  const [editContributionFrequency, setEditContributionFrequency] = useState("monthly")
  const [editTargetDate, setEditTargetDate] = useState("")
  const [editAutoContribute, setEditAutoContribute] = useState(false)
  const [editAutoContributeDay, setEditAutoContributeDay] = useState("1")
  const [editContributionAmount, setEditContributionAmount] = useState("")
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([])
  const [contributeAmount, setContributeAmount] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isContributing, setIsContributing] = useState(false)
  const [error, setError] = useState("")

  const opts = contextHeaders ? { headers: contextHeaders } : undefined

  useEffect(() => {
    const accOpts = contextHeaders ? { headers: contextHeaders } : undefined
    accountsApi.summary(accOpts)
      .then((data) => setAccounts(data.accounts || []))
      .catch(() => {})
  }, [contextHeaders])

  const fetchProgress = () => {
    if (item) {
      goalsApi.progress(item.id, opts)
        .then(setProgress)
        .catch(() => {})
    }
  }

  useEffect(() => {
    if (item && open) {
      fetchProgress()
    }
    if (!open) {
      setProgress(null)
      setIsEditing(false)
      setContributeAmount("")
      setError("")
    }
  }, [item, open])

  const startEdit = () => {
    if (!item) return
    setEditName(item.name)
    setEditTarget(String(item.target_amount / 100))
    setEditDescription(item.description || "")
    setEditSavingsAccountId(item.savings_account_id || "")
    setEditContributionFrequency(item.contribution_frequency || "monthly")
    setEditTargetDate(item.target_date || "")
    setEditAutoContribute(item.auto_contribute ?? false)
    setEditAutoContributeDay(String(item.auto_contribute_day || 1))
    setEditContributionAmount(item.contribution_amount ? String(item.contribution_amount / 100) : (item.monthly_contribution ? String(item.monthly_contribution / 100) : ""))
    setIsEditing(true)
    setError("")
  }

  const handleSave = async () => {
    if (!item) return
    setIsSaving(true)
    setError("")
    try {
      const updates: Record<string, unknown> = {}
      if (editName.trim() !== item.name) updates.name = editName.trim()
      const newTarget = Math.round(parseFloat(editTarget) * 100)
      if (newTarget > 0 && newTarget !== item.target_amount) updates.target_amount = newTarget
      if (editDescription.trim() !== (item.description || "")) updates.description = editDescription.trim() || null
      if (editSavingsAccountId !== (item.savings_account_id || "")) updates.savings_account_id = editSavingsAccountId || null
      if (editContributionFrequency !== (item.contribution_frequency || "monthly")) updates.contribution_frequency = editContributionFrequency
      if (editTargetDate !== (item.target_date || "")) updates.target_date = editTargetDate || null
      if (editAutoContribute !== (item.auto_contribute ?? false)) updates.auto_contribute = editAutoContribute
      const newDay = parseInt(editAutoContributeDay) || 1
      if (editAutoContribute && newDay !== (item.auto_contribute_day || 1)) updates.auto_contribute_day = newDay
      const newContrib = editContributionAmount ? Math.round(parseFloat(editContributionAmount) * 100) : 0
      const currentContrib = item.contribution_amount || item.monthly_contribution || 0
      if (newContrib !== currentContrib) updates.contribution_amount = newContrib || null

      if (Object.keys(updates).length > 0) {
        await goalsApi.update(item.id, updates, opts)
      }
      setIsEditing(false)
      onUpdated?.()
      toast.success("Meta actualizada com sucesso")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao guardar"
      setError(msg)
    } finally {
      setIsSaving(false)
    }
  }

  const handleContribute = async () => {
    if (!item || !contributeAmount) return
    setIsContributing(true)
    setError("")
    try {
      await goalsApi.contribute(item.id, Math.round(parseFloat(contributeAmount) * 100), opts)
      setContributeAmount("")
      fetchProgress()
      onUpdated?.()
      toast.success("Contribuição registada com sucesso")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao contribuir"
      setError(msg)
    } finally {
      setIsContributing(false)
    }
  }

  const handleDelete = () => {
    if (!item) return
    toast(`Eliminar a meta "${item.name}"?`, {
      description: "Esta acção não pode ser revertida.",
      action: {
        label: "Eliminar",
        onClick: async () => {
          setIsDeleting(true)
          try {
            await goalsApi.remove(item.id, opts)
            onOpenChange(false)
            onDeleted?.()
            toast.success("Meta eliminada com sucesso")
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Erro ao eliminar"
            setError(msg)
          } finally {
            setIsDeleting(false)
          }
        },
      },
      cancel: {
        label: "Cancelar",
        onClick: () => {},
      },
    })
  }

  if (!item) return null

  const pct = item.target_amount > 0 ? Math.round(item.current_amount / item.target_amount * 100) : 0
  const isComplete = item.status === "completed"

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setIsEditing(false) }}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhe da meta</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name + progress */}
          <div className="text-center py-2">
            {isEditing ? (
              <div className="space-y-3 text-left">
                <div>
                  <Label>Nome</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div>
                  <Label>Valor alvo (Kz)</Label>
                  <Input type="number" value={editTarget} onChange={(e) => setEditTarget(e.target.value)} className="font-mono" />
                </div>
                <div>
                  <Label>Data alvo (opcional)</Label>
                  <Input type="date" value={editTargetDate} onChange={(e) => setEditTargetDate(e.target.value)} />
                </div>
                <div>
                  <Label>Descrição (opcional)</Label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 resize-none"
                    placeholder="Descreva o objectivo desta meta..."
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Contribuição (Kz, opcional)</Label>
                  <Input type="number" placeholder="0" value={editContributionAmount} onChange={(e) => setEditContributionAmount(e.target.value)} className="font-mono" />
                </div>
                <div>
                  <Label>Frequência da contribuição</Label>
                  <Select value={editContributionFrequency} onValueChange={(v) => { if (v) setEditContributionFrequency(v) }}>
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
                  <Select value={editSavingsAccountId} onValueChange={(v) => setEditSavingsAccountId(v || "")}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar conta" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhuma</SelectItem>
                      {accounts.map((a) => (
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
                    aria-checked={editAutoContribute}
                    onClick={() => setEditAutoContribute(!editAutoContribute)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${editAutoContribute ? "bg-primary" : "bg-muted"}`}
                  >
                    <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${editAutoContribute ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>
                {editAutoContribute && (
                  <div>
                    <Label>Dia da contribuição (1-31)</Label>
                    <Input type="number" min="1" max="31" value={editAutoContributeDay} onChange={(e) => setEditAutoContributeDay(e.target.value)} className="font-mono" />
                  </div>
                )}
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold">{item.name}</h3>
                {isComplete && <span className="text-xs text-green-500 font-semibold">Concluída</span>}
              </>
            )}
          </div>

          {!isEditing && (
            <>
              {/* Amount progress */}
              <div className="text-center">
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="font-mono font-bold text-2xl">{formatKz(item.current_amount)}</span>
                  <span className="text-sm text-muted-foreground font-mono">/ {formatKz(item.target_amount)}</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full mb-1">
                  <div
                    className={`h-2.5 rounded-full ${isComplete ? "bg-green-500" : pct >= 75 ? "bg-amber-500" : "bg-blue-500"}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <p className="text-sm font-semibold text-muted-foreground">{pct}%</p>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3">
                {item.target_date && (
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground">Data alvo</p>
                    <p className="font-semibold text-sm">{new Date(item.target_date).toLocaleDateString("pt-AO")}</p>
                  </div>
                )}
                {item.contribution_frequency && (
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground">Frequência</p>
                    <p className="font-semibold text-sm">{FREQUENCY_LABELS[item.contribution_frequency] || item.contribution_frequency}</p>
                  </div>
                )}
                {(item.contribution_amount || item.monthly_contribution) && (
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground">Contribuição</p>
                    <p className="font-mono font-semibold text-sm">{formatKz(item.contribution_amount || item.monthly_contribution || 0)}</p>
                  </div>
                )}
                {item.auto_contribute && (
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground">Auto-contribuição</p>
                    <p className="font-semibold text-sm">Dia {item.auto_contribute_day || 1}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              {item.description && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground mb-1">Descrição</p>
                  <p className="text-sm whitespace-pre-wrap">{item.description}</p>
                </div>
              )}

              {/* Months remaining */}
              {progress?.months_remaining != null && (
                <p className="text-sm text-muted-foreground text-center">
                  <Clock className="inline h-3.5 w-3.5 mr-1" />
                  ~{progress.months_remaining} meses restantes
                </p>
              )}

              {/* Contribute */}
              {!isComplete && (
                <div className="border-t pt-3">
                  <Label>Contribuir (Kz)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="number"
                      placeholder="Valor Kz"
                      value={contributeAmount}
                      onChange={(e) => setContributeAmount(e.target.value)}
                      className="font-mono"
                    />
                    <Button onClick={handleContribute} disabled={isContributing || !contributeAmount}>
                      <PiggyBank className="h-4 w-4 mr-1" />
                      {isContributing ? "..." : "Contribuir"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Contribution history */}
              {progress && progress.contributions.length > 0 && (
                <div className="space-y-1 border-t pt-3">
                  <p className="text-xs font-semibold text-muted-foreground">Histórico de contribuições</p>
                  {progress.contributions.slice(0, 8).map((c, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {new Date(c.contributed_at).toLocaleDateString("pt-AO")}
                      </span>
                      <span className="font-mono">{formatKz(c.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {isEditing ? (
              <>
                <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "A guardar..." : "Guardar"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="flex-1" onClick={startEdit}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {isDeleting ? "A eliminar..." : "Eliminar"}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
