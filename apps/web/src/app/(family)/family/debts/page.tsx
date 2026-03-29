"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { CreditCard, Plus, Trash2, Banknote } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { debtsApi, type Debt } from "@/lib/api/debts"
import { formatKz } from "@/lib/format"
import { getContextHeader } from "@/lib/context"

const TYPE_OPTIONS = [
  { value: "MORTGAGE", label: "Hipoteca" },
  { value: "CAR_LOAN", label: "Empréstimo auto" },
  { value: "PERSONAL_LOAN", label: "Empréstimo pessoal" },
  { value: "CREDIT_CARD", label: "Cartão de crédito" },
  { value: "INFORMAL", label: "Informal" },
  { value: "OTHER", label: "Outro" },
]

const NATURE_OPTIONS = [
  { value: "FORMAL", label: "Formal" },
  { value: "INFORMAL", label: "Informal" },
]

const CREDITOR_TYPE_OPTIONS = [
  { value: "BANK", label: "Banco" },
  { value: "FINANCIAL", label: "Financeira" },
  { value: "FAMILY", label: "Família" },
  { value: "FRIENDS", label: "Amigos" },
  { value: "SUPPLIER", label: "Fornecedor" },
  { value: "EMPLOYER", label: "Empregador" },
  { value: "OTHER", label: "Outro" },
]

const TYPE_LABELS: Record<string, string> = Object.fromEntries(TYPE_OPTIONS.map((t) => [t.value, t.label]))

export default function FamilyDebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [payOpen, setPayOpen] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Create form
  const [name, setName] = useState("")
  const [type, setType] = useState("PERSONAL_LOAN")
  const [nature, setNature] = useState("FORMAL")
  const [creditor, setCreditor] = useState("")
  const [creditorType, setCreditorType] = useState("BANK")
  const [originalAmount, setOriginalAmount] = useState("")
  const [interestRate, setInterestRate] = useState("")
  const [minimumPayment, setMinimumPayment] = useState("")
  const [dueDay, setDueDay] = useState("1")

  // Payment form
  const [payAmount, setPayAmount] = useState("")

  const fetchDebts = () => {
    const ctx = { headers: getContextHeader() }
    debtsApi.list(ctx).then(setDebts).catch(() => {})
  }

  useEffect(() => { fetchDebts() }, [])

  const totalBalance = debts.reduce((s, d) => s + d.remaining_balance, 0)
  const totalMinPayment = debts.reduce((s, d) => s + d.minimum_payment, 0)

  const resetForm = () => {
    setName("")
    setType("PERSONAL_LOAN")
    setNature("FORMAL")
    setCreditor("")
    setCreditorType("BANK")
    setOriginalAmount("")
    setInterestRate("")
    setMinimumPayment("")
    setDueDay("1")
  }

  const handleCreate = async () => {
    if (!name.trim() || !originalAmount) return
    setIsSubmitting(true)
    try {
      const ctx = { headers: getContextHeader() }
      await debtsApi.create({
        name: name.trim(),
        type,
        nature,
        creditor_type: creditorType,
        original_amount: Math.round(parseFloat(originalAmount) * 100),
        interest_rate: parseFloat(interestRate) || 0,
        minimum_payment: Math.round(parseFloat(minimumPayment) * 100) || 0,
        due_day: parseInt(dueDay) || 1,
      }, ctx)
      setCreateOpen(false)
      resetForm()
      fetchDebts()
      toast.success("Dívida familiar criada com sucesso")
    } catch {
      toast.error("Erro ao criar dívida")
    }
    setIsSubmitting(false)
  }

  const handlePay = async (debtId: string) => {
    if (!payAmount) return
    try {
      const ctx = { headers: getContextHeader() }
      await debtsApi.payment(debtId, Math.round(parseFloat(payAmount) * 100), ctx)
      setPayOpen(null)
      setPayAmount("")
      fetchDebts()
      toast.success("Pagamento registado com sucesso")
    } catch {
      toast.error("Erro ao registar pagamento")
    }
  }

  const handleDelete = (id: string) => {
    toast("Eliminar esta dívida?", {
      description: "Esta acção não pode ser revertida.",
      action: {
        label: "Eliminar",
        onClick: async () => {
          const ctx = { headers: getContextHeader() }
          await debtsApi.remove(id, ctx).catch(() => {})
          fetchDebts()
          toast.success("Dívida eliminada com sucesso")
        },
      },
      cancel: { label: "Cancelar", onClick: () => {} },
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Dívidas Familiares</h2>
        <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm() }}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-1" /> Nova dívida
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Nova dívida familiar</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div><Label>Nome</Label><Input placeholder="Ex: Empréstimo habitação" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
              <div>
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(v) => { if (v) setType(v) }}>
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
                <Select value={nature} onValueChange={(v) => { if (v) setNature(v) }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NATURE_OPTIONS.map((n) => (
                      <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Credor (opcional)</Label><Input placeholder="Ex: Banco BAI" value={creditor} onChange={(e) => setCreditor(e.target.value)} /></div>
              <div>
                <Label>Tipo de credor</Label>
                <Select value={creditorType} onValueChange={(v) => { if (v) setCreditorType(v) }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CREDITOR_TYPE_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Valor original (Kz)</Label><Input type="number" placeholder="0" value={originalAmount} onChange={(e) => setOriginalAmount(e.target.value)} className="font-mono" /></div>
              <div><Label>Taxa de juros (%)</Label><Input type="number" step="0.1" placeholder="0" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} className="font-mono" /></div>
              <div><Label>Pagamento mínimo mensal (Kz)</Label><Input type="number" placeholder="0" value={minimumPayment} onChange={(e) => setMinimumPayment(e.target.value)} className="font-mono" /></div>
              <div><Label>Dia de vencimento</Label><Input type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} className="font-mono" /></div>
              <Button className="w-full" onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? "A criar..." : "Criar dívida"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <div className="rounded-xl bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saldo total em dívida</p>
          <p className="text-xl font-mono font-bold text-red-500 mt-1">{formatKz(totalBalance)}</p>
        </div>
        <div className="rounded-xl bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pagamento mínimo mensal</p>
          <p className="text-xl font-mono font-bold mt-1">{formatKz(totalMinPayment)}</p>
        </div>
      </div>

      {debts.length === 0 ? (
        <div className="rounded-xl bg-card p-12 shadow-sm flex flex-col items-center text-center">
          <CreditCard className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma dívida familiar registada</p>
        </div>
      ) : (
        <div className="rounded-xl bg-card shadow-sm divide-y divide-border">
          {debts.map((debt) => {
            const pct = debt.original_amount > 0
              ? Math.round((1 - debt.remaining_balance / debt.original_amount) * 100)
              : 0

            return (
              <div key={debt.id} className="px-4 py-3.5 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{debt.name}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary mr-2">
                          {TYPE_LABELS[debt.type] || debt.type}
                        </span>
                        {debt.creditor ? `${debt.creditor} -- ` : ""}
                        {debt.interest_rate}% juros
                        {debt.due_day ? ` -- Dia ${debt.due_day}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="font-mono font-semibold text-red-500">{formatKz(debt.remaining_balance)}</p>
                      <p className="text-xs text-muted-foreground font-mono">Min: {formatKz(debt.minimum_payment)}</p>
                    </div>
                    {debt.status !== "paid_off" && (
                      <Button variant="outline" size="sm" onClick={() => { setPayOpen(debt.id); setPayAmount("") }} title="Registar pagamento">
                        <Banknote className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(debt.id)} className="text-red-500 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="h-1.5 bg-muted rounded-full">
                    <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{pct}% pago</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Payment dialog */}
      <Dialog open={!!payOpen} onOpenChange={(v) => { if (!v) setPayOpen(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Registar pagamento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Valor (Kz)</Label><Input type="number" placeholder="0" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="font-mono" autoFocus /></div>
            <Button className="w-full" onClick={() => payOpen && handlePay(payOpen)}>Pagar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
