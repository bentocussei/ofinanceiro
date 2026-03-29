"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  CreditCard, Plus, Trash2, Calculator, Banknote, Eye,
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
import { apiFetch } from "@/lib/api"
import { formatKz } from "@/lib/format"

interface Debt {
  id: string
  name: string
  type: string
  original_amount: number
  remaining_balance: number
  interest_rate: number
  minimum_payment: number
  due_day: number
  status: string
}

interface DebtSimulation {
  total_interest: number
  total_paid: number
  months_to_payoff: number
  schedule: { month: number; payment: number; principal: number; interest: number; balance: number }[]
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [detailDebt, setDetailDebt] = useState<Debt | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [payOpen, setPayOpen] = useState<string | null>(null)
  const [simOpen, setSimOpen] = useState(false)

  // Create form
  const [name, setName] = useState("")
  const [type, setType] = useState("personal_loan")
  const [originalAmount, setOriginalAmount] = useState("")
  const [interestRate, setInterestRate] = useState("")
  const [minimumPayment, setMinimumPayment] = useState("")
  const [dueDay, setDueDay] = useState("1")
  const [nature, setNature] = useState("FORMAL")
  const [creditorType, setCreditorType] = useState("BANK")
  const [autoPay, setAutoPay] = useState(false)
  const [linkedAccountId, setLinkedAccountId] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  interface AccountOption { id: string; name: string }
  const [debtAccounts, setDebtAccounts] = useState<AccountOption[]>([])

  useEffect(() => {
    apiFetch<{ accounts: AccountOption[] }>("/api/v1/accounts/summary")
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

  const fetchDebts = () => {
    apiFetch<Debt[]>("/api/v1/debts/").then(setDebts).catch(() => {})
  }

  useEffect(() => { fetchDebts() }, [])

  const totalBalance = debts.reduce((s, d) => s + d.remaining_balance, 0)
  const totalMinPayment = debts.reduce((s, d) => s + d.minimum_payment, 0)

  const handleCreate = async () => {
    if (!name.trim() || !originalAmount) return
    setIsSubmitting(true)
    try {
      await apiFetch("/api/v1/debts/", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          type,
          original_amount: Math.round(parseFloat(originalAmount) * 100),
          interest_rate: parseFloat(interestRate) || 0,
          minimum_payment: Math.round(parseFloat(minimumPayment) * 100) || 0,
          due_day: parseInt(dueDay) || 1,
          nature,
          creditor_type: creditorType,
          auto_pay: autoPay,
          linked_account_id: linkedAccountId || undefined,
        }),
      })
      setCreateOpen(false)
      setName("")
      setOriginalAmount("")
      setInterestRate("")
      setMinimumPayment("")
      setDueDay("1")
      fetchDebts()
    } catch { /* handled by apiFetch */ }
    setIsSubmitting(false)
  }

  const handlePay = async (debtId: string) => {
    if (!payAmount) return
    try {
      await apiFetch(`/api/v1/debts/${debtId}/payment`, {
        method: "POST",
        body: JSON.stringify({ amount: Math.round(parseFloat(payAmount) * 100) }),
      })
      setPayOpen(null)
      setPayAmount("")
      fetchDebts()
    } catch { /* handled by apiFetch */ }
  }

  const handleDelete = (id: string) => {
    toast("Eliminar esta dívida?", {
      description: "Esta acção não pode ser revertida.",
      action: {
        label: "Eliminar",
        onClick: async () => {
          await apiFetch(`/api/v1/debts/${id}`, { method: "DELETE" }).catch(() => {})
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
      const params = new URLSearchParams({
        current_balance: String(Math.round(parseFloat(simBalance) * 100)),
        interest_rate: String(parseFloat(simRate)),
        monthly_payment: String(Math.round(parseFloat(simPayment) * 100)),
      })
      const result = await apiFetch<DebtSimulation>(`/api/v1/debts/simulate?${params}`)
      setSimulation(result)
    } catch { /* handled by apiFetch */ }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Dívidas</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSimOpen(true)}>
            <Calculator className="h-4 w-4 mr-1" />
            Simular
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button />}>
              <Plus className="h-4 w-4 mr-1" /> Nova dívida
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Nova dívida</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div><Label>Nome</Label><Input placeholder="Ex: Empréstimo bancário" value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div><Label>Tipo</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="personal_loan">Empréstimo pessoal</option>
                    <option value="mortgage">Hipoteca</option>
                    <option value="credit_card">Cartão de crédito</option>
                    <option value="auto_loan">Empréstimo auto</option>
                    <option value="other">Outro</option>
                  </select>
                </div>
                <div><Label>Valor original (Kz)</Label><Input type="number" placeholder="0" value={originalAmount} onChange={(e) => setOriginalAmount(e.target.value)} className="font-mono" /></div>
                <div><Label>Taxa de juros (%)</Label><Input type="number" step="0.1" placeholder="0" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} className="font-mono" /></div>
                <div><Label>Pagamento mínimo (Kz)</Label><Input type="number" placeholder="0" value={minimumPayment} onChange={(e) => setMinimumPayment(e.target.value)} className="font-mono" /></div>
                <div><Label>Dia de vencimento</Label><Input type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} className="font-mono" /></div>
                <div>
                  <Label>Natureza</Label>
                  <Select value={nature} onValueChange={(v) => { if (v) setNature(v) }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FORMAL">Formal</SelectItem>
                      <SelectItem value="INFORMAL">Informal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo de credor</Label>
                  <Select value={creditorType} onValueChange={(v) => { if (v) setCreditorType(v) }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BANK">Banco</SelectItem>
                      <SelectItem value="FINANCIAL">Financeira</SelectItem>
                      <SelectItem value="FAMILY">Família</SelectItem>
                      <SelectItem value="FRIENDS">Amigos</SelectItem>
                      <SelectItem value="SUPPLIER">Fornecedor</SelectItem>
                      <SelectItem value="EMPLOYER">Empregador</SelectItem>
                      <SelectItem value="OTHER">Outro</SelectItem>
                    </SelectContent>
                  </Select>
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{debt.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {debt.interest_rate}% juros
                        {debt.due_day ? ` -- Dia ${debt.due_day}` : ""}
                        {debt.status === "paid_off" ? " -- Quitada" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="font-mono font-semibold text-red-500">{formatKz(debt.remaining_balance)}</p>
                      <p className="text-xs text-muted-foreground font-mono">Min: {formatKz(debt.minimum_payment)}</p>
                    </div>
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

      {/* Payment dialog */}
      <Dialog open={!!payOpen} onOpenChange={(v) => { if (!v) setPayOpen(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Registar pagamento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Valor (Kz)</Label><Input type="number" placeholder="0" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="font-mono" /></div>
            <Button className="w-full" onClick={() => payOpen && handlePay(payOpen)}>Pagar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <DebtDetailDialog
        item={detailDebt}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={fetchDebts}
        onDeleted={fetchDebts}
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
                {simulation.schedule.length > 0 && (
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
