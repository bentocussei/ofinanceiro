"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Pencil, Trash2, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

interface Props {
  item: Budget | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
  onDeleted?: () => void
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

export function BudgetDetailDialog({
  item,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: Props) {
  const [status, setStatus] = useState<BudgetStatus | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (item && open) {
      apiFetch<BudgetStatus>(`/api/v1/budgets/${item.id}/status`)
        .then(setStatus)
        .catch(() => {})
    }
    if (!open) {
      setStatus(null)
      setIsEditing(false)
      setError("")
    }
  }, [item, open])

  const startEdit = () => {
    if (!item) return
    setEditName(item.name || "")
    setIsEditing(true)
    setError("")
  }

  const handleSave = async () => {
    if (!item) return
    setIsSaving(true)
    setError("")
    try {
      const updates: Record<string, unknown> = {}
      if (editName.trim() !== (item.name || "")) updates.name = editName.trim()

      if (Object.keys(updates).length > 0) {
        await apiFetch(`/api/v1/budgets/${item.id}`, {
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

  const handleDelete = () => {
    if (!item) return
    toast("Eliminar este orçamento?", {
      description: "Esta acção não pode ser revertida.",
      action: {
        label: "Eliminar",
        onClick: async () => {
          setIsDeleting(true)
          try {
            await apiFetch(`/api/v1/budgets/${item.id}`, { method: "DELETE" })
            onOpenChange(false)
            onDeleted?.()
            toast.success("Orçamento eliminado com sucesso")
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

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setIsEditing(false) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detalhe do orçamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="text-center py-2">
            {isEditing ? (
              <div>
                <Label>Nome</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nome do orçamento"
                />
              </div>
            ) : (
              <h3 className="text-lg font-semibold">{item.name || "Orçamento"}</h3>
            )}
          </div>

          {/* Status summary */}
          {status && (
            <>
              <div className="text-center">
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="font-mono font-bold text-2xl">{formatKz(status.total_spent)}</span>
                  <span className="text-sm text-muted-foreground font-mono">/ {formatKz(status.total_limit || 0)}</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full mb-1">
                  <div
                    className={`h-2.5 rounded-full ${getProgressColor(status.percentage)}`}
                    style={{ width: `${Math.min(status.percentage, 100)}%` }}
                  />
                </div>
                <p className={`text-sm font-semibold ${getTextColor(status.percentage)}`}>
                  {status.percentage}% utilizado
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <RotateCcw className="inline h-3 w-3 mr-1" />
                  {status.days_remaining} dias restantes
                </p>
              </div>

              {/* Category breakdown */}
              {status.items.length > 0 && (
                <div className="space-y-3 border-t pt-3">
                  <p className="text-xs font-semibold text-muted-foreground">Por categoria</p>
                  {status.items.map((cat) => (
                    <div key={cat.category_id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{cat.category_name}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatKz(cat.spent)} / {formatKz(cat.limit_amount)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full">
                        <div
                          className={`h-1.5 rounded-full ${getProgressColor(cat.percentage)}`}
                          style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                        />
                      </div>
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
