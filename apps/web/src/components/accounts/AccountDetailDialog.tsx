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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { IconDisplay } from "@/components/common/IconDisplay"
import { accountsApi, type Account } from "@/lib/api/accounts"
import { formatKz } from "@/lib/format"

const USAGE_TYPES = [
  { value: "PERSONAL", label: "Pessoal" },
  { value: "SALARY", label: "Salário" },
  { value: "SAVINGS", label: "Poupança" },
  { value: "BUSINESS", label: "Negócio" },
  { value: "INVESTMENT", label: "Investimento" },
  { value: "JOINT", label: "Conjunta" },
]

const USAGE_LABELS: Record<string, string> = Object.fromEntries(USAGE_TYPES.map((u) => [u.value, u.label]))

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
  const [editIban, setEditIban] = useState("")
  const [editNib, setEditNib] = useState("")
  const [editSwiftCode, setEditSwiftCode] = useState("")
  const [editAccountHolder, setEditAccountHolder] = useState("")
  const [editUsageType, setEditUsageType] = useState("PERSONAL")
  const [editCreditLimit, setEditCreditLimit] = useState("")
  const [editLowBalanceAlert, setEditLowBalanceAlert] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState("")

  const startEdit = () => {
    if (!account) return
    setEditName(account.name)
    setEditInstitution(account.institution || "")
    setEditIban(account.iban || "")
    setEditNib(account.nib || "")
    setEditSwiftCode(account.swift_code || "")
    setEditAccountHolder(account.account_holder || "")
    setEditUsageType(account.usage_type || "PERSONAL")
    setEditCreditLimit(account.credit_limit ? String(account.credit_limit / 100) : "")
    setEditLowBalanceAlert(account.low_balance_alert ? String(account.low_balance_alert / 100) : "")
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
      if (editIban.trim() !== (account.iban || "")) updates.iban = editIban.trim() || null
      if (editNib.trim() !== (account.nib || "")) updates.nib = editNib.trim() || null
      if (editSwiftCode.trim() !== (account.swift_code || "")) updates.swift_code = editSwiftCode.trim() || null
      if (editAccountHolder.trim() !== (account.account_holder || "")) updates.account_holder = editAccountHolder.trim() || null
      if (editUsageType !== (account.usage_type || "PERSONAL")) updates.usage_type = editUsageType
      const newCreditLimit = editCreditLimit ? Math.round(parseFloat(editCreditLimit) * 100) : null
      if (newCreditLimit !== (account.credit_limit || null)) updates.credit_limit = newCreditLimit
      const newLowBalanceAlert = editLowBalanceAlert ? Math.round(parseFloat(editLowBalanceAlert) * 100) : null
      if (newLowBalanceAlert !== (account.low_balance_alert || null)) updates.low_balance_alert = newLowBalanceAlert

      if (Object.keys(updates).length > 0) {
        await accountsApi.update(account.id, updates)
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
    if (!account) return
    toast(`Eliminar a conta "${account.name}"?`, {
      description: "Esta acção não pode ser revertida.",
      action: {
        label: "Eliminar",
        onClick: async () => {
          setIsDeleting(true)
          try {
            await accountsApi.remove(account.id)
            onOpenChange(false)
            onDeleted?.()
            toast.success("Conta eliminada com sucesso")
          } catch (err: any) {
            setError(err.message || "Erro ao eliminar. A conta pode ter transacções associadas.")
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

  if (!account) return null

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setIsEditing(false) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <span className="flex items-center gap-2"><IconDisplay name={account.type} className="h-5 w-5" /> {account.name}</span>
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
                <Input value={editInstitution} onChange={(e) => setEditInstitution(e.target.value)} placeholder="Ex: BAI, BFA" />
              </div>
              <div>
                <Label>Uso da conta</Label>
                <Select value={editUsageType} onValueChange={(v) => { if (v) setEditUsageType(v) }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {USAGE_TYPES.map((u) => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Titular da conta</Label>
                <Input value={editAccountHolder} onChange={(e) => setEditAccountHolder(e.target.value)} placeholder="Nome do titular" />
              </div>
              <div>
                <Label>IBAN</Label>
                <Input value={editIban} onChange={(e) => setEditIban(e.target.value)} placeholder="AO06..." className="font-mono" />
              </div>
              <div>
                <Label>NIB</Label>
                <Input value={editNib} onChange={(e) => setEditNib(e.target.value)} placeholder="0000.0000.0000.0000.0000.0" className="font-mono" />
              </div>
              <div>
                <Label>Código SWIFT</Label>
                <Input value={editSwiftCode} onChange={(e) => setEditSwiftCode(e.target.value)} placeholder="Ex: BAIAAOLU" className="font-mono" />
              </div>
              {account.type === "credit_card" && (
                <div>
                  <Label>Limite de crédito (Kz)</Label>
                  <Input type="number" value={editCreditLimit} onChange={(e) => setEditCreditLimit(e.target.value)} className="font-mono" />
                </div>
              )}
              <div>
                <Label>Alerta de saldo baixo (Kz)</Label>
                <Input type="number" value={editLowBalanceAlert} onChange={(e) => setEditLowBalanceAlert(e.target.value)} className="font-mono" placeholder="0" />
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
