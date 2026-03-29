"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  TrendingUp, Plus, Trash2, Calculator, LineChart,
} from "lucide-react"

import { InvestmentDetailDialog } from "@/components/investments/InvestmentDetailDialog"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiFetch } from "@/lib/api"
import { formatKz } from "@/lib/format"

interface Investment {
  id: string
  name: string
  type: string
  invested_amount: number
  current_value: number
  annual_return_rate: number
  start_date: string
  status: string
}

interface PerformanceSummary {
  total_invested: number
  total_current_value: number
  total_return: number
  return_percentage: number
}

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [detailInvestment, setDetailInvestment] = useState<Investment | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [simOpen, setSimOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Create form
  const [name, setName] = useState("")
  const [type, setType] = useState("fixed_income")
  const [investedAmount, setInvestedAmount] = useState("")
  const [annualRate, setAnnualRate] = useState("")

  // Compound interest simulator
  const [simPrincipal, setSimPrincipal] = useState("")
  const [simRate, setSimRate] = useState("")
  const [simYears, setSimYears] = useState("")
  const [simMonthly, setSimMonthly] = useState("")
  const [simResult, setSimResult] = useState<{ final_value: number; total_invested: number; total_interest: number } | null>(null)

  const fetchInvestments = () => {
    apiFetch<Investment[]>("/api/v1/investments/").then(setInvestments).catch(() => {})
  }

  useEffect(() => { fetchInvestments() }, [])

  const summary: PerformanceSummary = {
    total_invested: investments.reduce((s, i) => s + i.invested_amount, 0),
    total_current_value: investments.reduce((s, i) => s + i.current_value, 0),
    total_return: investments.reduce((s, i) => s + (i.current_value - i.invested_amount), 0),
    return_percentage: 0,
  }
  summary.return_percentage = summary.total_invested > 0
    ? Math.round((summary.total_return / summary.total_invested) * 10000) / 100
    : 0

  const handleCreate = async () => {
    if (!name.trim() || !investedAmount) return
    setIsSubmitting(true)
    try {
      await apiFetch("/api/v1/investments/", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          type,
          invested_amount: Math.round(parseFloat(investedAmount) * 100),
          annual_return_rate: parseFloat(annualRate) || 0,
        }),
      })
      setCreateOpen(false)
      setName("")
      setInvestedAmount("")
      setAnnualRate("")
      fetchInvestments()
    } catch { /* handled by apiFetch */ }
    setIsSubmitting(false)
  }

  const handleDelete = (id: string) => {
    toast("Eliminar este investimento?", {
      description: "Esta acção não pode ser revertida.",
      action: {
        label: "Eliminar",
        onClick: async () => {
          await apiFetch(`/api/v1/investments/${id}`, { method: "DELETE" }).catch(() => {})
          fetchInvestments()
          toast.success("Investimento eliminado com sucesso")
        },
      },
      cancel: {
        label: "Cancelar",
        onClick: () => {},
      },
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
    const totalInvested = (p + m * months) * 100
    setSimResult({
      final_value: Math.round(value),
      total_invested: Math.round(totalInvested),
      total_interest: Math.round(value - totalInvested),
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Investimentos</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSimOpen(true)}>
            <Calculator className="h-4 w-4 mr-1" />
            Simulador
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button />}>
              <Plus className="h-4 w-4 mr-1" /> Novo investimento
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Novo investimento</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div><Label>Nome</Label><Input placeholder="Ex: Deposito a prazo BAI" value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div><Label>Tipo</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="fixed_income">Renda fixa</option>
                    <option value="stocks">Accoes</option>
                    <option value="bonds">Obrigacoes</option>
                    <option value="real_estate">Imobiliario</option>
                    <option value="mutual_fund">Fundo de investimento</option>
                    <option value="other">Outro</option>
                  </select>
                </div>
                <div><Label>Valor investido (Kz)</Label><Input type="number" placeholder="0" value={investedAmount} onChange={(e) => setInvestedAmount(e.target.value)} className="font-mono" /></div>
                <div><Label>Taxa de retorno anual (%)</Label><Input type="number" step="0.1" placeholder="0" value={annualRate} onChange={(e) => setAnnualRate(e.target.value)} className="font-mono" /></div>
                <Button className="w-full" onClick={handleCreate} disabled={isSubmitting}>{isSubmitting ? "A criar..." : "Criar investimento"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Performance summary */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total investido</p>
          <p className="text-xl font-mono font-bold mt-1">{formatKz(summary.total_invested)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Valor actual</p>
          <p className="text-xl font-mono font-bold mt-1">{formatKz(summary.total_current_value)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Retorno total</p>
          <p className={`text-xl font-mono font-bold mt-1 ${summary.total_return >= 0 ? "text-green-500" : "text-red-500"}`}>
            {formatKz(summary.total_return)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Rentabilidade</p>
          <p className={`text-xl font-mono font-bold mt-1 ${summary.return_percentage >= 0 ? "text-green-500" : "text-red-500"}`}>
            {summary.return_percentage}%
          </p>
        </div>
      </div>

      {/* Investment list */}
      {investments.length === 0 ? (
        <div className="text-center py-16">
          <LineChart className="h-12 w-12 mx-auto opacity-30" />
          <p className="text-muted-foreground mt-3">Nenhum investimento registado</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card divide-y">
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
                      {inv.type === "fixed_income" ? "Renda fixa" :
                       inv.type === "stocks" ? "Accoes" :
                       inv.type === "bonds" ? "Obrigacoes" :
                       inv.type === "real_estate" ? "Imobiliario" :
                       inv.type === "mutual_fund" ? "Fundo" : inv.type}
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
      />

      {/* Compound interest simulator dialog */}
      <Dialog open={simOpen} onOpenChange={setSimOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Simulador de juros compostos</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Capital inicial (Kz)</Label><Input type="number" placeholder="0" value={simPrincipal} onChange={(e) => setSimPrincipal(e.target.value)} className="font-mono" /></div>
            <div><Label>Taxa de juros anual (%)</Label><Input type="number" step="0.1" placeholder="0" value={simRate} onChange={(e) => setSimRate(e.target.value)} className="font-mono" /></div>
            <div><Label>Periodo (anos)</Label><Input type="number" placeholder="0" value={simYears} onChange={(e) => setSimYears(e.target.value)} className="font-mono" /></div>
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
