"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { TrendingUp, Plus, Trash2, Calculator, LineChart } from "lucide-react"

import { InvestmentDetailDialog } from "@/components/investments/InvestmentDetailDialog"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { investmentsApi, type Investment } from "@/lib/api/investments"
import { formatKz } from "@/lib/format"
import { getContextHeader } from "@/lib/context"

const TYPE_OPTIONS = [
  { value: "fixed_income", label: "Renda fixa" },
  { value: "stocks", label: "Acções" },
  { value: "bonds", label: "Obrigações" },
  { value: "real_estate", label: "Imobiliário" },
  { value: "mutual_fund", label: "Fundo de investimento" },
  { value: "other", label: "Outro" },
]

const TYPE_LABELS: Record<string, string> = Object.fromEntries(TYPE_OPTIONS.map((t) => [t.value, t.label]))

export default function FamilyInvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [detailInvestment, setDetailInvestment] = useState<Investment | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [simOpen, setSimOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Create form
  const [name, setName] = useState("")
  const [type, setType] = useState("fixed_income")
  const [institution, setInstitution] = useState("")
  const [investedAmount, setInvestedAmount] = useState("")
  const [currentValue, setCurrentValue] = useState("")
  const [annualRate, setAnnualRate] = useState("")
  const [startDate, setStartDate] = useState("")
  const [maturityDate, setMaturityDate] = useState("")
  const [notes, setNotes] = useState("")

  // Compound interest simulator
  const [simPrincipal, setSimPrincipal] = useState("")
  const [simRate, setSimRate] = useState("")
  const [simYears, setSimYears] = useState("")
  const [simMonthly, setSimMonthly] = useState("")
  const [simResult, setSimResult] = useState<{ final_value: number; total_invested: number; total_interest: number } | null>(null)

  const fetchInvestments = () => {
    const ctx = { headers: getContextHeader() }
    investmentsApi.list(ctx).then(setInvestments).catch(() => {})
  }

  useEffect(() => { fetchInvestments() }, [])

  const summary = {
    total_invested: investments.reduce((s, i) => s + i.invested_amount, 0),
    total_current_value: investments.reduce((s, i) => s + i.current_value, 0),
    total_return: investments.reduce((s, i) => s + (i.current_value - i.invested_amount), 0),
    return_percentage: 0,
  }
  const totalInvested = summary.total_invested
  summary.return_percentage = totalInvested > 0
    ? Math.round((summary.total_return / totalInvested) * 10000) / 100
    : 0

  const resetForm = () => {
    setName("")
    setType("fixed_income")
    setInstitution("")
    setInvestedAmount("")
    setCurrentValue("")
    setAnnualRate("")
    setStartDate("")
    setMaturityDate("")
    setNotes("")
  }

  const handleCreate = async () => {
    if (!name.trim() || !investedAmount) return
    setIsSubmitting(true)
    try {
      const ctx = { headers: getContextHeader() }
      await investmentsApi.create({
        name: name.trim(),
        type,
        institution: institution.trim() || undefined,
        invested_amount: Math.round(parseFloat(investedAmount) * 100),
        current_value: currentValue ? Math.round(parseFloat(currentValue) * 100) : undefined,
        annual_return_rate: parseFloat(annualRate) || 0,
        start_date: startDate || undefined,
        maturity_date: maturityDate || undefined,
        notes: notes.trim() || undefined,
      }, ctx)
      setCreateOpen(false)
      resetForm()
      fetchInvestments()
      toast.success("Investimento familiar criado com sucesso")
    } catch {
      toast.error("Erro ao criar investimento")
    }
    setIsSubmitting(false)
  }

  const handleDelete = (id: string) => {
    toast("Eliminar este investimento?", {
      description: "Esta acção não pode ser revertida.",
      action: {
        label: "Eliminar",
        onClick: async () => {
          const ctx = { headers: getContextHeader() }
          await investmentsApi.remove(id, ctx).catch(() => {})
          fetchInvestments()
          toast.success("Investimento eliminado com sucesso")
        },
      },
      cancel: { label: "Cancelar", onClick: () => {} },
    })
  }

  const handleSimulate = () => {
    const p = parseFloat(simPrincipal) || 0
    const r = (parseFloat(simRate) || 0) / 100
    const y = parseInt(simYears) || 0
    const m = parseFloat(simMonthly) || 0
    const monthlyRate = r / 12
    const months = y * 12

    let value = p * 100
    for (let i = 0; i < months; i++) {
      value = value * (1 + monthlyRate) + m * 100
    }
    const totalInv = (p + m * months) * 100
    setSimResult({
      final_value: Math.round(value),
      total_invested: Math.round(totalInv),
      total_interest: Math.round(value - totalInv),
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Investimentos Familiares</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSimOpen(true)}>
            <Calculator className="h-4 w-4 mr-1" />
            Simulador
          </Button>
          <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm() }}>
            <DialogTrigger render={<Button />}>
              <Plus className="h-4 w-4 mr-1" /> Novo investimento
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Novo investimento familiar</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div><Label>Nome</Label><Input placeholder="Ex: Depósito a prazo BAI" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
                <div>
                  <Label>Tipo</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div><Label>Instituição (opcional)</Label><Input placeholder="Ex: Banco BAI" value={institution} onChange={(e) => setInstitution(e.target.value)} /></div>
                <div><Label>Valor investido (Kz)</Label><Input type="number" placeholder="0" value={investedAmount} onChange={(e) => setInvestedAmount(e.target.value)} className="font-mono" /></div>
                <div><Label>Valor actual (Kz, opcional)</Label><Input type="number" placeholder="Igual ao investido" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} className="font-mono" /></div>
                <div><Label>Taxa de retorno anual (%)</Label><Input type="number" step="0.1" placeholder="0" value={annualRate} onChange={(e) => setAnnualRate(e.target.value)} className="font-mono" /></div>
                <div><Label>Data de início (opcional)</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                <div><Label>Data de maturidade (opcional)</Label><Input type="date" value={maturityDate} onChange={(e) => setMaturityDate(e.target.value)} /></div>
                <div><Label>Notas (opcional)</Label><textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground" placeholder="Observações sobre o investimento" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
                <Button className="w-full" onClick={handleCreate} disabled={isSubmitting}>
                  {isSubmitting ? "A criar..." : "Criar investimento"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Performance summary */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <div className="rounded-xl bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total investido</p>
          <p className="text-xl font-mono font-bold mt-1">{formatKz(summary.total_invested)}</p>
        </div>
        <div className="rounded-xl bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Valor actual</p>
          <p className="text-xl font-mono font-bold mt-1">{formatKz(summary.total_current_value)}</p>
        </div>
        <div className="rounded-xl bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Retorno total</p>
          <p className={`text-xl font-mono font-bold mt-1 ${summary.total_return >= 0 ? "text-green-500" : "text-red-500"}`}>
            {formatKz(summary.total_return)}
          </p>
        </div>
        <div className="rounded-xl bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rentabilidade</p>
          <p className={`text-xl font-mono font-bold mt-1 ${summary.return_percentage >= 0 ? "text-green-500" : "text-red-500"}`}>
            {summary.return_percentage}%
          </p>
        </div>
      </div>

      {investments.length === 0 ? (
        <div className="rounded-xl bg-card p-12 shadow-sm flex flex-col items-center text-center">
          <LineChart className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum investimento familiar registado</p>
        </div>
      ) : (
        <div className="rounded-xl bg-card shadow-sm divide-y divide-border">
          {investments.map((inv) => {
            const returnVal = inv.current_value - inv.invested_amount
            const returnPct = inv.invested_amount > 0
              ? Math.round((returnVal / inv.invested_amount) * 10000) / 100
              : 0

            return (
              <div key={inv.id} className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { setDetailInvestment(inv); setDetailOpen(true) }}>
                <div className="flex items-center gap-3">
                  <TrendingUp className={`h-5 w-5 ${returnVal >= 0 ? "text-green-500" : "text-red-500"}`} />
                  <div>
                    <p className="font-medium">{inv.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {TYPE_LABELS[inv.type] || inv.type}
                      {inv.institution ? ` -- ${inv.institution}` : ""}
                      {inv.annual_return_rate ? ` -- ${inv.annual_return_rate}% a.a.` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-mono font-semibold">{formatKz(inv.current_value)}</p>
                    <p className={`text-xs font-mono ${returnVal >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {returnVal >= 0 ? "+" : ""}{formatKz(returnVal)} ({returnPct}%)
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(inv.id) }} className="text-red-500 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <InvestmentDetailDialog
        item={detailInvestment}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={fetchInvestments}
        onDeleted={fetchInvestments}
        contextHeaders={getContextHeader()}
      />

      {/* Compound interest simulator dialog */}
      <Dialog open={simOpen} onOpenChange={setSimOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Simulador de juros compostos</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Capital inicial (Kz)</Label><Input type="number" placeholder="0" value={simPrincipal} onChange={(e) => setSimPrincipal(e.target.value)} className="font-mono" /></div>
            <div><Label>Taxa de juros anual (%)</Label><Input type="number" step="0.1" placeholder="0" value={simRate} onChange={(e) => setSimRate(e.target.value)} className="font-mono" /></div>
            <div><Label>Período (anos)</Label><Input type="number" placeholder="0" value={simYears} onChange={(e) => setSimYears(e.target.value)} className="font-mono" /></div>
            <div><Label>Aporte mensal (Kz, opcional)</Label><Input type="number" placeholder="0" value={simMonthly} onChange={(e) => setSimMonthly(e.target.value)} className="font-mono" /></div>
            <Button className="w-full" onClick={handleSimulate}>Simular</Button>

            {simResult && (
              <div className="grid grid-cols-3 gap-2 border-t pt-3">
                <div className="rounded-lg bg-muted p-2 text-center">
                  <p className="text-xs text-muted-foreground">Valor final</p>
                  <p className="font-mono font-bold text-sm text-green-500">{formatKz(simResult.final_value)}</p>
                </div>
                <div className="rounded-lg bg-muted p-2 text-center">
                  <p className="text-xs text-muted-foreground">Total investido</p>
                  <p className="font-mono font-bold text-sm">{formatKz(simResult.total_invested)}</p>
                </div>
                <div className="rounded-lg bg-muted p-2 text-center">
                  <p className="text-xs text-muted-foreground">Juros ganhos</p>
                  <p className="font-mono font-bold text-sm text-green-500">{formatKz(simResult.total_interest)}</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
