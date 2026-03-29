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
import { apiFetch } from "@/lib/api"
import { formatKz } from "@/lib/format"

interface AccountOption {
  id: string
  name: string
}

interface Goal {
  id: string
  name: string
  type: string
  target_amount: number
  current_amount: number
  monthly_contribution: number | null
  status: string
  description?: string | null
  savings_account_id?: string | null
  contribution_frequency?: string | null
}

interface GoalProgress {
  percentage: number
  remaining: number
  months_remaining: number | null
  contributions: { amount: number; note: string | null; contributed_at: string }[]
}

interface Props {
  item: Goal | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
  onDeleted?: () => void
}

export function GoalDetailDialog({
  item,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: Props) {
  const [progress, setProgress] = useState<GoalProgress | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState("")
  const [editTarget, setEditTarget] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editSavingsAccountId, setEditSavingsAccountId] = useState("")
  const [editContributionFrequency, setEditContributionFrequency] = useState("monthly")
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [contributeAmount, setContributeAmount] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isContributing, setIsContributing] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    apiFetch<{ accounts: AccountOption[] }>("/api/v1/accounts/summary")
      .then((data) => setAccounts(data.accounts || []))
      .catch(() => {})
  }, [])

  const fetchProgress = () => {
    if (item) {
      apiFetch<GoalProgress>(`/api/v1/goals/${item.id}/progress`)
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

      if (Object.keys(updates).length > 0) {
        await apiFetch(`/api/v1/goals/${item.id}`, {
          method: "PUT",
          body: JSON.stringify(updates),
        })
      }
      setIsEditing(false)
      onUpdated?.()
    } catch (err: any) {
      setError(err.message || "Erro ao guardar")
    } finally {
      setIsSaving(false)
    }
  }

  const handleContribute = async () => {
    if (!item || !contributeAmount) return
    setIsContributing(true)
    setError("")
    try {
      await apiFetch(`/api/v1/goals/${item.id}/contribute`, {
        method: "POST",
        body: JSON.stringify({ amount: Math.round(parseFloat(contributeAmount) * 100) }),
      })
      setContributeAmount("")
      fetchProgress()
      onUpdated?.()
    } catch (err: any) {
      setError(err.message || "Erro ao contribuir")
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
            await apiFetch(`/api/v1/goals/${item.id}`, { method: "DELETE" })
            onOpenChange(false)
            onDeleted?.()
            toast.success("Meta eliminada com sucesso")
          } catch (err: any) {
            setError(err.message || "Erro ao eliminar")
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detalhe da meta</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name + progress */}
          <div className="text-center py-2">
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <Label>Nome</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div>
                  <Label>Valor alvo (Kz)</Label>
                  <Input type="number" value={editTarget} onChange={(e) => setEditTarget(e.target.value)} className="font-mono" />
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
                <div>
                  <Label>Descrição (opcional)</Label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 resize-none"
                    placeholder="Descreva o objectivo desta meta..."
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                </div>
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

              {/* Months remaining */}
              {progress?.months_remaining != null && (
                <p className="text-sm text-muted-foreground text-center">
                  <Clock className="inline h-3.5 w-3.5 mr-1" />
                  ~{progress.months_remaining} meses restantes
                </p>
              )}

              {/* Contribute */}
              {!isComplete && (
                <div className="flex gap-2">
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
