"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Pencil, Trash2, Banknote, CreditCard } from "lucide-react"

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
import { debtsApi, type Debt } from "@/lib/api/debts"
import { accountsApi } from "@/lib/api/accounts"
import { formatKz } from "@/lib/format"

const TYPE_OPTIONS = [
  { value: "mortgage", label: "Hipoteca" },
  { value: "car_loan", label: "Empréstimo auto" },
  { value: "personal_loan", label: "Empréstimo pessoal" },
  { value: "credit_card", label: "Cartão de crédito" },
  { value: "informal", label: "Informal" },
  { value: "other", label: "Outro" },
]

const NATURE_OPTIONS = [
  { value: "formal", label: "Formal" },
  { value: "informal", label: "Informal" },
]

const CREDITOR_TYPE_OPTIONS = [
  { value: "bank", label: "Banco" },
  { value: "financial", label: "Financeira" },
  { value: "family", label: "Família" },
  { value: "friends", label: "Amigos" },
  { value: "supplier", label: "Fornecedor" },
  { value: "employer", label: "Empregador" },
  { value: "other", label: "Outro" },
]

const TYPE_LABELS: Record<string, string> = Object.fromEntries(TYPE_OPTIONS.map((t) => [t.value, t.label]))
const NATURE_LABELS: Record<string, string> = Object.fromEntries(NATURE_OPTIONS.map((n) => [n.value, n.label]))
const CREDITOR_LABELS: Record<string, string> = Object.fromEntries(CREDITOR_TYPE_OPTIONS.map((c) => [c.value, c.label]))

interface Props {
  item: Debt | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
  onDeleted?: () => void
  contextHeaders?: Record<string, string>
}

export function DebtDetailDialog({
  item,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
  contextHeaders,
}: Props) {
  const [payAmount, setPayAmount] = useState("")
  const [isPaying, setIsPaying] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState("")
  const [accounts, setAccounts] = useState<{ id: string; name: string; balance: number }[]>([])
  const [payAccount, setPayAccount] = useState("")

  // Edit fields
  const [editName, setEditName] = useState("")
  const [editType, setEditType] = useState("")
  const [editNature, setEditNature] = useState("")
  const [editCreditor, setEditCreditor] = useState("")
  const [editCreditorType, setEditCreditorType] = useState("")
  const [editOriginalAmount, setEditOriginalAmount] = useState("")
  const [editInterestRate, setEditInterestRate] = useState("")
  const [editMinimumPayment, setEditMinimumPayment] = useState("")
  const [editDueDay, setEditDueDay] = useState("")
  const [editStartDate, setEditStartDate] = useState("")
  const [editExpectedEndDate, setEditExpectedEndDate] = useState("")
  const [editNotes, setEditNotes] = useState("")
  const [editAutoPay, setEditAutoPay] = useState(false)
  const [editLinkedAccountId, setEditLinkedAccountId] = useState("")

  const opts = contextHeaders ? { headers: contextHeaders } : undefined

  useEffect(() => {
    const accOpts = contextHeaders ? { headers: contextHeaders } : undefined
    accountsApi.summary(accOpts)
      .then((data) => setAccounts(data.accounts || []))
      .catch(() => {})
  }, [contextHeaders])

  useEffect(() => {
    if (!open) {
      setIsEditing(false)
      setPayAmount("")
      setPayAccount("")
      setError("")
    }
  }, [open])

  const startEdit = () => {
    if (!item) return
    setEditName(item.name)
    setEditType(item.type)
    setEditNature(item.nature || "formal")
    setEditCreditor(item.creditor || "")
    setEditCreditorType(item.creditor_type || "bank")
    setEditOriginalAmount(String(item.original_amount / 100))
    setEditInterestRate(String(item.interest_rate))
    setEditMinimumPayment(String(item.minimum_payment / 100))
    setEditDueDay(String(item.due_day || item.payment_day || 1))
    setEditStartDate(item.start_date || "")
    setEditExpectedEndDate(item.expected_end_date || "")
    setEditNotes(item.notes || "")
    setEditAutoPay(item.auto_pay ?? item.auto_pay_enabled ?? false)
    setEditLinkedAccountId(item.linked_account_id || "")
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
      if (editType !== item.type) updates.type = editType
      if (editNature !== (item.nature || "formal")) updates.nature = editNature
      if (editCreditor.trim() !== (item.creditor || "")) updates.creditor = editCreditor.trim() || null
      if (editCreditorType !== (item.creditor_type || "bank")) updates.creditor_type = editCreditorType
      const newOriginal = Math.round(parseFloat(editOriginalAmount) * 100)
      if (newOriginal > 0 && newOriginal !== item.original_amount) updates.original_amount = newOriginal
      const newRate = parseFloat(editInterestRate) || 0
      if (newRate !== item.interest_rate) updates.interest_rate = newRate
      const newMin = Math.round(parseFloat(editMinimumPayment) * 100) || 0
      if (newMin !== item.minimum_payment) updates.minimum_payment = newMin
      const newDay = parseInt(editDueDay) || 1
      if (newDay !== (item.due_day || item.payment_day || 1)) updates.due_day = newDay
      if (editStartDate !== (item.start_date || "")) updates.start_date = editStartDate || null
      if (editExpectedEndDate !== (item.expected_end_date || "")) updates.expected_end_date = editExpectedEndDate || null
      if (editNotes.trim() !== (item.notes || "")) updates.notes = editNotes.trim() || null
      const currentAutoPay = item.auto_pay ?? item.auto_pay_enabled ?? false
      if (editAutoPay !== currentAutoPay) updates.auto_pay = editAutoPay
      if (editLinkedAccountId !== (item.linked_account_id || "")) updates.linked_account_id = editLinkedAccountId || null

      if (Object.keys(updates).length > 0) {
        await debtsApi.update(item.id, updates, opts)
      }
      setIsEditing(false)
      onUpdated?.()
      toast.success("Dívida actualizada com sucesso")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao guardar"
      setError(msg)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePay = async () => {
    if (!item || !payAmount) return
    setIsPaying(true)
    setError("")
    try {
      await debtsApi.payment(item.id, Math.round(parseFloat(payAmount) * 100), payAccount || undefined, opts)
      setPayAmount("")
      setPayAccount("")
      onUpdated?.()
      toast.success("Pagamento registado com sucesso")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao registar pagamento"
      setError(msg)
    } finally {
      setIsPaying(false)
    }
  }

  const handleDelete = () => {
    if (!item) return
    toast(`Eliminar a dívida "${item.name}"?`, {
      description: "Esta acção não pode ser revertida.",
      action: {
        label: "Eliminar",
        onClick: async () => {
          setIsDeleting(true)
          try {
            await debtsApi.remove(item.id, opts)
            onOpenChange(false)
            onDeleted?.()
            toast.success("Dívida eliminada com sucesso")
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

  const pct = item.original_amount > 0
    ? Math.round((1 - item.remaining_balance / item.original_amount) * 100)
    : 0
  const isPaidOff = item.status === "paid_off"

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setPayAmount(""); setPayAccount(""); setError(""); setIsEditing(false) } }}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <span className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {item.name}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isEditing ? (
            /* ─── Edit mode ─── */
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
              <div>
                <Label>Tipo</Label>
                <Select value={editType} onValueChange={(v) => { if (v) setEditType(v) }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Natureza</Label>
                <Select value={editNature} onValueChange={(v) => { if (v) setEditNature(v) }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NATURE_OPTIONS.map((n) => (
                      <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Credor (opcional)</Label><Input value={editCreditor} onChange={(e) => setEditCreditor(e.target.value)} placeholder="Ex: Banco BAI" /></div>
              <div>
                <Label>Tipo de credor</Label>
                <Select value={editCreditorType} onValueChange={(v) => { if (v) setEditCreditorType(v) }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CREDITOR_TYPE_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Valor original (Kz)</Label><Input type="number" value={editOriginalAmount} onChange={(e) => setEditOriginalAmount(e.target.value)} className="font-mono" /></div>
              <div><Label>Taxa de juros (%)</Label><Input type="number" step="0.1" value={editInterestRate} onChange={(e) => setEditInterestRate(e.target.value)} className="font-mono" /></div>
              <div><Label>Prestação mensal (Kz)</Label><Input type="number" value={editMinimumPayment} onChange={(e) => setEditMinimumPayment(e.target.value)} className="font-mono" /></div>
              <div><Label>Dia de pagamento (1-31)</Label><Input type="number" min="1" max="31" value={editDueDay} onChange={(e) => setEditDueDay(e.target.value)} className="font-mono" /></div>
              <div><Label>Data início (opcional)</Label><Input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} /></div>
              <div><Label>Data prevista fim (opcional)</Label><Input type="date" value={editExpectedEndDate} onChange={(e) => setEditExpectedEndDate(e.target.value)} /></div>
              <div>
                <Label>Notas (opcional)</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 resize-none"
                  placeholder="Observações sobre esta dívida..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <Label className="flex-1">Pagamento automático</Label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={editAutoPay}
                  onClick={() => setEditAutoPay(!editAutoPay)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${editAutoPay ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${editAutoPay ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>
              {editAutoPay && (
                <div>
                  <Label>Conta vinculada</Label>
                  <Select value={editLinkedAccountId} onValueChange={(v) => setEditLinkedAccountId(v || "")}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar conta" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhuma</SelectItem>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ) : (
            /* ─── View mode ─── */
            <>
              {/* Type + Status */}
              <div className="text-center py-2">
                <p className="text-xs text-muted-foreground">{TYPE_LABELS[item.type] || item.type}</p>
                {isPaidOff && <span className="text-xs text-green-500 font-semibold">Quitada</span>}
              </div>

              {/* Balance */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Saldo devedor</p>
                <p className="text-3xl font-mono font-bold text-red-500">{formatKz(item.remaining_balance)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  de {formatKz(item.original_amount)} original
                </p>
              </div>

              {/* Progress */}
              <div>
                <div className="h-2 bg-muted rounded-full mb-1">
                  <div className="h-2 rounded-full bg-green-500" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <p className="text-xs text-muted-foreground text-center">{pct}% pago</p>
              </div>

              {/* Key details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted p-3 text-center">
                  <p className="text-xs text-muted-foreground">Taxa de juros</p>
                  <p className="font-mono font-bold">{item.interest_rate}%</p>
                </div>
                <div className="rounded-lg bg-muted p-3 text-center">
                  <p className="text-xs text-muted-foreground">Prestação mensal</p>
                  <p className="font-mono font-bold text-sm">{formatKz(item.minimum_payment)}</p>
                </div>
              </div>

              {/* Extra details */}
              <div className="grid grid-cols-2 gap-3">
                {item.nature && (
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground">Natureza</p>
                    <p className="font-semibold text-sm">{NATURE_LABELS[item.nature] || item.nature}</p>
                  </div>
                )}
                {item.creditor_type && (
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground">Tipo de credor</p>
                    <p className="font-semibold text-sm">{CREDITOR_LABELS[item.creditor_type] || item.creditor_type}</p>
                  </div>
                )}
              </div>

              {/* Creditor name */}
              {item.creditor && (
                <div className="rounded-lg bg-muted p-3 text-center">
                  <p className="text-xs text-muted-foreground">Credor</p>
                  <p className="font-semibold text-sm">{item.creditor}</p>
                </div>
              )}

              {/* Due day */}
              {(item.due_day > 0 || (item.payment_day && item.payment_day > 0)) && (
                <p className="text-sm text-muted-foreground text-center">
                  Vencimento: dia {item.due_day || item.payment_day} de cada mês
                </p>
              )}

              {/* Dates */}
              {(item.start_date || item.expected_end_date) && (
                <div className="grid grid-cols-2 gap-3">
                  {item.start_date && (
                    <div className="rounded-lg bg-muted p-3 text-center">
                      <p className="text-xs text-muted-foreground">Data início</p>
                      <p className="font-semibold text-sm">{new Date(item.start_date).toLocaleDateString("pt-AO")}</p>
                    </div>
                  )}
                  {item.expected_end_date && (
                    <div className="rounded-lg bg-muted p-3 text-center">
                      <p className="text-xs text-muted-foreground">Data prevista fim</p>
                      <p className="font-semibold text-sm">{new Date(item.expected_end_date).toLocaleDateString("pt-AO")}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {item.notes && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground mb-1">Notas</p>
                  <p className="text-sm whitespace-pre-wrap">{item.notes}</p>
                </div>
              )}

              {/* Auto-pay */}
              {(item.auto_pay || item.auto_pay_enabled) && (
                <p className="text-sm text-muted-foreground text-center">Pagamento automático activado</p>
              )}

              {/* Register payment */}
              {!isPaidOff && (
                <div className="border-t pt-3 space-y-2">
                  <div>
                    <Label>Conta de origem</Label>
                    <Select value={payAccount} onValueChange={(v) => setPayAccount(v ?? "")}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar conta (opcional)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sem débito (manual)</SelectItem>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>{acc.name} — {formatKz(acc.balance)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Label>Registar pagamento (Kz)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="0"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="font-mono"
                    />
                    <Button onClick={handlePay} disabled={isPaying || !payAmount}>
                      <Banknote className="h-4 w-4 mr-1" />
                      {isPaying ? "..." : "Pagar"}
                    </Button>
                  </div>
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
