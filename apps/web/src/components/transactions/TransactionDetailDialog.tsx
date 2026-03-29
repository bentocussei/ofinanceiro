"use client"

import { useState } from "react"
import { toast } from "sonner"

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
import { formatKz, formatRelativeDate } from "@/lib/format"

interface Transaction {
  id: string
  amount: number
  type: string
  description: string | null
  merchant: string | null
  transaction_date: string
}

interface Props {
  transaction: Transaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
  onDeleted?: () => void
}

export function TransactionDetailDialog({
  transaction,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [editDesc, setEditDesc] = useState("")
  const [editAmount, setEditAmount] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState("")

  const startEdit = () => {
    if (!transaction) return
    setEditDesc(transaction.description || "")
    setEditAmount(String(transaction.amount / 100))
    setIsEditing(true)
    setError("")
  }

  const handleSave = async () => {
    if (!transaction) return
    setIsSaving(true)
    setError("")
    try {
      const updates: Record<string, unknown> = {}
      if (editDesc.trim() !== (transaction.description || "")) {
        updates.description = editDesc.trim()
      }
      const newAmount = Math.round(parseFloat(editAmount) * 100)
      if (newAmount > 0 && newAmount !== transaction.amount) {
        updates.amount = newAmount
      }

      if (Object.keys(updates).length > 0) {
        await apiFetch(`/api/v1/transactions/${transaction.id}`, {
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
    if (!transaction) return
    toast("Eliminar esta transacção?", {
      description: "Esta acção não pode ser revertida.",
      action: {
        label: "Eliminar",
        onClick: async () => {
          setIsDeleting(true)
          try {
            await apiFetch(`/api/v1/transactions/${transaction.id}`, { method: "DELETE" })
            onOpenChange(false)
            onDeleted?.()
            toast.success("Transacção eliminada com sucesso")
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

  if (!transaction) return null

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setIsEditing(false) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detalhe da transacção</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Type + Amount */}
          <div className="text-center py-2">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-2 ${
                transaction.type === "income"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              }`}
            >
              {transaction.type === "income" ? "Receita" : "Despesa"}
            </span>
            {isEditing ? (
              <Input
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="text-center font-mono text-2xl font-bold mt-2"
              />
            ) : (
              <p className={`text-3xl font-mono font-bold ${
                transaction.type === "income" ? "text-green-500" : "text-red-500"
              }`}>
                {transaction.type === "income" ? "+" : "-"}{formatKz(transaction.amount)}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              {formatRelativeDate(transaction.transaction_date)}
            </p>
          </div>

          {/* Description */}
          <div>
            <Label>Descrição</Label>
            {isEditing ? (
              <Input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Descrição"
              />
            ) : (
              <p className="text-sm mt-1">{transaction.description || "Sem descrição"}</p>
            )}
          </div>

          {/* Merchant */}
          {transaction.merchant && (
            <div>
              <Label>Comerciante</Label>
              <p className="text-sm mt-1">{transaction.merchant}</p>
            </div>
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
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
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
