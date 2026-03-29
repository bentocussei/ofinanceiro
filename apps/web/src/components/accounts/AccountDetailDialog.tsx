"use client"

import { useState } from "react"

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

interface Account {
  id: string
  name: string
  type: string
  balance: number
  icon: string | null
  institution: string | null
}

const TYPE_LABELS: Record<string, string> = {
  bank: "Banco",
  digital_wallet: "Carteira digital",
  cash: "Dinheiro",
  savings: "Poupança",
  investment: "Investimento",
  credit_card: "Cartão de crédito",
  loan: "Empréstimo",
}

interface Props {
  account: Account | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
  onDeleted?: () => void
}

export function AccountDetailDialog({
  account,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState("")
  const [editInstitution, setEditInstitution] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState("")

  const startEdit = () => {
    if (!account) return
    setEditName(account.name)
    setEditInstitution(account.institution || "")
    setIsEditing(true)
    setError("")
  }

  const handleSave = async () => {
    if (!account) return
    setIsSaving(true)
    setError("")
    try {
      const updates: Record<string, unknown> = {}
      if (editName.trim() !== account.name) updates.name = editName.trim()
      if (editInstitution.trim() !== (account.institution || "")) {
        updates.institution = editInstitution.trim() || null
      }

      if (Object.keys(updates).length > 0) {
        await apiFetch(`/api/v1/accounts/${account.id}`, {
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

  const handleDelete = async () => {
    if (!account) return
    if (!confirm(`Tem a certeza que deseja eliminar a conta "${account.name}"?`)) return

    setIsDeleting(true)
    try {
      await apiFetch(`/api/v1/accounts/${account.id}`, { method: "DELETE" })
      onOpenChange(false)
      onDeleted?.()
    } catch (err: any) {
      setError(err.message || "Erro ao eliminar. A conta pode ter transacções associadas.")
    } finally {
      setIsDeleting(false)
    }
  }

  if (!account) return null

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setIsEditing(false) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {account.icon || "💰"} {account.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground">{TYPE_LABELS[account.type] || account.type}</p>
            <p className={`text-3xl font-mono font-bold mt-1 ${account.balance >= 0 ? "text-green-500" : "text-red-500"}`}>
              {formatKz(account.balance)}
            </p>
            {account.institution && (
              <p className="text-sm text-muted-foreground mt-1">{account.institution}</p>
            )}
          </div>

          {isEditing && (
            <>
              <div>
                <Label>Nome da conta</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div>
                <Label>Instituição</Label>
                <Input
                  value={editInstitution}
                  onChange={(e) => setEditInstitution(e.target.value)}
                  placeholder="Ex: BAI, BFA"
                />
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

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
