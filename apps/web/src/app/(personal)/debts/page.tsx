"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  CreditCard, Plus, Trash2, Calculator, Banknote,
} from "lucide-react"

import { DebtDetailDialog } from "@/components/debts/DebtDetailDialog"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { debtsApi, type Debt, type DebtSimulation } from "@/lib/api/debts"
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

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [detailDebt, setDetailDebt] = useState<Debt | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [payOpen, setPayOpen] = useState<string | null>(null)
  const [simOpen, setSimOpen] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  // Create form
  const [name, setName] = useState("")
  const [type, setType] = useState("personal_loan")
  const [nature, setNature] = useState("formal")
  const [creditor, setCreditor] = useState("")
  const [creditorType, setCreditorType] = useState("bank")
  const [originalAmount, setOriginalAmount] = useState("")
  const [interestRate, setInterestRate] = useState("")
  const [minimumPayment, setMinimumPayment] = useState("")
  const [dueDay, setDueDay] = useState("1")
  const [startDate, setStartDate] = useState("")
  const [expectedEndDate, setExpectedEndDate] = useState("")
  const [notes, setNotes] = useState("")
  const [autoPay, setAutoPay] = useState(false)
  const [linkedAccountId, setLinkedAccountId] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  interface AccountOption { id: string; name: string; balance: number }
  const [debtAccounts, setDebtAccounts] = useState<AccountOption[]>([])
  const [payAccount, setPayAccount] = useState("")

  useEffect(() => {
    accountsApi.summary()
      .then((data) => setDebtAccounts(data.accounts || []))
      .catch(() => {})
  }, [])

  // Payment form
  const [payAmount, setPayAmount] = useState("")

  // Simulation
  const [simBalance, setSimBalance] = useState("")
  const [simRate, setSimRate] = useState("")
  const [simPayment, setSimPayment] = useState("")
  const [simulation, setSimulation] = useState<DebtSimulation | null>(null)

  const fetchDebts = (loadMore = false) => {
    const params = loadMore && cursor ? `cursor=${cursor}` : ""
    debtsApi.listPage(params)
      .then((res) => {
        if (loadMore) {
          setDebts(prev => [...prev, ...res.items])
        } else {
          setDebts(res.items)
        }
        setCursor(res.cursor)
        setHasMore(res.has_more)
      })
      .catch(() => {})
  }

  useEffect(() => { fetchDebts() }, [])

  const totalBalance = debts.reduce((s, d) => s + d.remaining_balance, 0)
  const totalMinPayment = debts.reduce((s, d) => s + d.minimum_payment, 0)

  const resetForm = () => {
    setName("")
    setType("personal_loan")
    setNature("formal")
    setCreditor("")
    setCreditorType("bank")
    setOriginalAmount("")
    setInterestRate("")
    setMinimumPayment("")
    setDueDay("1")
    setStartDate("")
    setExpectedEndDate("")
    setNotes("")
    setAutoPay(false)
    setLinkedAccountId("")
  }

  const handleCreate = async () => {
    if (!name.trim() || !originalAmount) return
    setIsSubmitting(true)
    try {
      await debtsApi.create({
        name: name.trim(),
        type,
        nature,
        creditor: creditor.trim() || undefined,
        creditor_type: creditorType,
        original_amount: Math.round(parseFloat(originalAmount) * 100),
        interest_rate: Math.round((parseFloat(interestRate) || 0) * 100),
        minimum_payment: Math.round(parseFloat(minimumPayment) * 100) || 0,
        due_day: parseInt(dueDay) || 1,
        start_date: startDate || undefined,
        expected_end_date: expectedEndDate || undefined,
        notes: notes.trim() || undefined,
        auto_pay: autoPay,
        linked_account_id: linkedAccountId || undefined,
      })
      setCreateOpen(false)
      resetForm()
      setCursor(null)
      setHasMore(false)
      fetchDebts()
      toast.success("Dívida criada com sucesso")
    } catch { /* handled by apiFetch */ }
    setIsSubmitting(false)
  }

  const handlePay = async (debtId: string) => {
    if (!payAmount) return
    try {
      await debtsApi.payment(debtId, Math.round(parseFloat(payAmount) * 100), payAccount || undefined)
      setPayOpen(null)
      setPayAmount("")
      setPayAccount("")
      setCursor(null)
      setHasMore(false)
      fetchDebts()
      toast.success("Pagamento registado com sucesso")
    } catch { /* handled by apiFetch */ }
  }

  const handleDelete = (id: string) => {
    toast("Eliminar esta dívida?", {
      description: "Esta acção não pode ser revertida.",
      action: {
        label: "Eliminar",
        onClick: async () => {
          await debtsApi.remove(id).catch(() => {})
          setCursor(null)
          setHasMore(false)
          fetchDebts()
          toast.success("Dívida eliminada com sucesso")
        },
      },
      cancel: {
        label: "Cancelar",
        onClick: () => {},
      },
    })
  }

  const handleSimulate = async () => {
    if (!simBalance || !simRate || !simPayment) return
    try {
      const result = await debtsApi.simulate({
        current_balance: Math.round(parseFloat(simBalance) * 100),
        interest_rate: Math.round(parseFloat(simRate) * 100),
        monthly_payment: Math.round(parseFloat(simPayment) * 100),
      })
      setSimulation(result)
    } catch { /* handled by apiFetch */ }
  }

  const TYPE_LABELS: Record<string, string> = Object.fromEntries(TYPE_OPTIONS.map((t) => [t.value, t.label]))

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Dívidas</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSimOpen(true)}>
            <Calculator className="h-4 w-4 mr-1" />
            Simular
          </Button>
          <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm() }}>
            <DialogTrigger render={<Button />}>
              <Plus className="h-4 w-4 mr-1" /> Nova dívida
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nova dívida</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div><Label>Nome</Label><Input placeholder="Ex: Empréstimo bancário" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
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
                <div><Label>Taxa de juros (%, opcional)</Label><Input type="number" step="0.1" placeholder="0" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} className="font-mono" /></div>
                <div><Label>Prestação mensal (Kz)</Label><Input type="number" placeholder="0" value={minimumPayment} onChange={(e) => setMinimumPayment(e.target.value)} className="font-mono" /></div>
                <div><Label>Dia de pagamento (1-31)</Label><Input type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} className="font-mono" /></div>
                <div><Label>Data início (opcional)</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                <div><Label>Data prevista fim (opcional)</Label><Input type="date" value={expectedEndDate} onChange={(e) => setExpectedEndDate(e.target.value)} /></div>
                <div>
                  <Label>Notas (opcional)</Label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 resize-none"
                    placeholder="Observações sobre esta dívida..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Label className="flex-1">Pagamento automático</Label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoPay}
                    onClick={() => setAutoPay(!autoPay)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${autoPay ? "bg-primary" : "bg-muted"}`}
                  >
                    <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${autoPay ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>
                {autoPay && (
                  <div>
                    <Label>Conta vinculada</Label>
                    <Select value={linkedAccountId} onValueChange={(v) => setLinkedAccountId(v || "")}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar conta" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhuma</SelectItem>
                        {debtAccounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button className="w-full" onClick={handleCreate} disabled={isSubmitting}>{isSubmitting ? "A criar..." : "Criar dívida"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
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

      {/* Debt list */}
      {debts.length === 0 ? (
        <div className="text-center py-16">
          <CreditCard className="h-12 w-12 mx-auto opacity-30" />
          <p className="text-muted-foreground mt-3">Nenhuma dívida registada</p>
        </div>
      ) : (
        <div className="rounded-xl bg-card shadow-sm divide-y divide-border">
          {debts.map((debt) => {
            const pct = debt.original_amount > 0
              ? Math.round((1 - debt.remaining_balance / debt.original_amount) * 100)
              : 0

            return (
              <div key={debt.id} className="px-4 py-3.5 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { setDetailDebt(debt); setDetailOpen(true) }}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <CreditCard className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{debt.name}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary mr-2">
                          {TYPE_LABELS[debt.type] || debt.type}
                        </span>
                        {debt.creditor ? `${debt.creditor} -- ` : ""}
                        {((debt.interest_rate || 0) / 100).toFixed(0)}% juros
                        {debt.due_day ? ` -- Dia ${debt.due_day}` : ""}
                        {debt.status === "paid_off" ? " -- Quitada" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                    <div className="text-left sm:text-right">
                      <p className="font-mono font-semibold text-red-500 whitespace-nowrap">{formatKz(debt.remaining_balance)}</p>
                      <p className="text-xs text-muted-foreground font-mono whitespace-nowrap">Min: {formatKz(debt.minimum_payment)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {debt.status !== "paid_off" && (
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setPayOpen(debt.id); setPayAmount("") }}>
                          <Banknote className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(debt.id) }} className="text-red-500 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                {/* Progress bar */}
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

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" size="sm" onClick={() => fetchDebts(true)}>
            Carregar mais
          </Button>
        </div>
      )}

      {/* Payment dialog */}
      <Dialog open={!!payOpen} onOpenChange={(v) => { if (!v) { setPayOpen(null); setPayAccount("") } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Registar pagamento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Conta de origem</Label>
              <Select value={payAccount} onValueChange={(v) => setPayAccount(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Seleccionar conta (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem débito (manual)</SelectItem>
                  {debtAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name} — {formatKz(acc.balance)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Valor (Kz)</Label><Input type="number" placeholder="0" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="font-mono" autoFocus /></div>
            <Button className="w-full" onClick={() => payOpen && handlePay(payOpen)}>Pagar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <DebtDetailDialog
        item={detailDebt}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={() => { setCursor(null); setHasMore(false); fetchDebts() }}
        onDeleted={() => { setCursor(null); setHasMore(false); fetchDebts() }}
      />

      {/* Simulation dialog */}
      <Dialog open={simOpen} onOpenChange={setSimOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Simulador de amortização</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Saldo devedor (Kz)</Label><Input type="number" placeholder="0" value={simBalance} onChange={(e) => setSimBalance(e.target.value)} className="font-mono" /></div>
            <div><Label>Taxa de juros anual (%)</Label><Input type="number" step="0.1" placeholder="0" value={simRate} onChange={(e) => setSimRate(e.target.value)} className="font-mono" /></div>
            <div><Label>Pagamento mensal (Kz)</Label><Input type="number" placeholder="0" value={simPayment} onChange={(e) => setSimPayment(e.target.value)} className="font-mono" /></div>
            <Button className="w-full" onClick={handleSimulate}>Simular</Button>

            {simulation && (
              <div className="space-y-3 border-t pt-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-muted p-2 text-center">
                    <p className="text-xs text-muted-foreground">Meses</p>
                    <p className="font-mono font-bold">{simulation.months_to_payoff}</p>
                  </div>
                  <div className="rounded-lg bg-muted p-2 text-center">
                    <p className="text-xs text-muted-foreground">Total juros</p>
                    <p className="font-mono font-bold text-red-500 text-xs">{formatKz(simulation.total_interest)}</p>
                  </div>
                  <div className="rounded-lg bg-muted p-2 text-center">
                    <p className="text-xs text-muted-foreground">Total pago</p>
                    <p className="font-mono font-bold text-xs">{formatKz(simulation.total_paid)}</p>
                  </div>
                </div>
                {simulation.schedule && simulation.schedule.length > 0 && (
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground">
                          <th className="text-left py-1">Mês</th>
                          <th className="text-right py-1">Pagamento</th>
                          <th className="text-right py-1">Juros</th>
                          <th className="text-right py-1">Saldo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {simulation.schedule.slice(0, 24).map((row) => (
                          <tr key={row.month} className="border-t border-muted">
                            <td className="py-1">{row.month}</td>
                            <td className="text-right font-mono">{formatKz(row.payment)}</td>
                            <td className="text-right font-mono text-red-500">{formatKz(row.interest)}</td>
                            <td className="text-right font-mono">{formatKz(row.balance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
