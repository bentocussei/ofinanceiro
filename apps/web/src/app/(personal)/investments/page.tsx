"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  TrendingUp, TrendingDown, Plus, Trash2, Calculator, LineChart,
  PieChart, AlertTriangle, AlertOctagon, Info, Shield, Sparkles, Send,
} from "lucide-react"

import { InvestmentDetailDialog } from "@/components/investments/InvestmentDetailDialog"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  investmentsApi,
  type Investment,
  type AllocationData,
  type InsightsData,
  type InvestmentInsight,
} from "@/lib/api/investments"
import { formatKz } from "@/lib/format"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_OPTIONS = [
  { value: "fixed_income", label: "Renda fixa" },
  { value: "stocks", label: "Acções" },
  { value: "bonds", label: "Obrigações" },
  { value: "real_estate", label: "Imobiliário" },
  { value: "mutual_fund", label: "Fundo de investimento" },
  { value: "other", label: "Outro" },
]

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  TYPE_OPTIONS.map((t) => [t.value, t.label]),
)

const ALLOC_COLORS: Record<string, string> = {
  fixed_income: "bg-blue-500",
  stocks: "bg-emerald-500",
  bonds: "bg-amber-500",
  real_estate: "bg-violet-500",
  mutual_fund: "bg-cyan-500",
  other: "bg-gray-400",
}

const ALLOC_TEXT_COLORS: Record<string, string> = {
  fixed_income: "text-blue-500",
  stocks: "text-emerald-500",
  bonds: "text-amber-500",
  real_estate: "text-violet-500",
  mutual_fund: "text-cyan-500",
  other: "text-gray-400",
}

const SEVERITY_CONFIG: Record<string, { icon: typeof Info; color: string; bg: string }> = {
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
  warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
  critical: { icon: AlertOctagon, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/30" },
}

const RISK_COLORS: Record<string, string> = {
  conservador: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  moderado: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  agressivo: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface PerformanceSummary {
  total_invested: number
  total_current_value: number
  total_return: number
  return_percentage: number
}

function SeverityIcon({ severity }: { severity: string }) {
  const config = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.info
  const Icon = config.icon
  return <Icon className={`h-5 w-5 shrink-0 ${config.color}`} />
}

function DiversificationBar({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score))
  const color =
    clamped >= 70 ? "bg-green-500" : clamped >= 40 ? "bg-amber-500" : "bg-red-500"
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="font-mono font-bold text-sm tabular-nums w-10 text-right">{clamped}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [detailInvestment, setDetailInvestment] = useState<Investment | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [simOpen, setSimOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  // New analytics state
  const [allocation, setAllocation] = useState<AllocationData | null>(null)
  const [insightsData, setInsightsData] = useState<InsightsData | null>(null)

  // Ask AI
  const [askQuestion, setAskQuestion] = useState("")
  const [askAnswer, setAskAnswer] = useState("")
  const [askLoading, setAskLoading] = useState(false)

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

  // -----------------------------------------------------------------------
  // Fetchers
  // -----------------------------------------------------------------------

  const fetchInvestments = (loadMore = false) => {
    const params = loadMore && cursor ? `cursor=${cursor}` : ""
    investmentsApi.listPage(params)
      .then((res) => {
        if (loadMore) {
          setInvestments(prev => [...prev, ...res.items])
        } else {
          setInvestments(res.items)
        }
        setCursor(res.cursor)
        setHasMore(res.has_more)
      })
      .catch(() => {})
  }

  const fetchAllocation = () => {
    investmentsApi.allocation().then(setAllocation).catch(() => {})
  }

  const fetchInsights = () => {
    investmentsApi.insights().then(setInsightsData).catch(() => {})
  }

  const refreshAll = () => {
    setCursor(null)
    setHasMore(false)
    fetchInvestments()
    fetchAllocation()
    fetchInsights()
  }

  useEffect(() => {
    fetchInvestments()
    fetchAllocation()
    fetchInsights()
  }, [])

  // -----------------------------------------------------------------------
  // Computed
  // -----------------------------------------------------------------------

  const summary: PerformanceSummary = {
    total_invested: investments.reduce((s, i) => s + i.invested_amount, 0),
    total_current_value: investments.reduce((s, i) => s + i.current_value, 0),
    total_return: investments.reduce((s, i) => s + (i.current_value - i.invested_amount), 0),
    return_percentage: 0,
  }
  summary.return_percentage = summary.total_invested > 0
    ? Math.round((summary.total_return / summary.total_invested) * 10000) / 100
    : 0

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

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
      })
      setCreateOpen(false)
      resetForm()
      refreshAll()
      toast.success("Investimento criado com sucesso")
    } catch { /* handled by apiFetch */ }
    setIsSubmitting(false)
  }

  const handleDelete = (id: string) => {
    toast("Eliminar este investimento?", {
      description: "Esta acção não pode ser revertida.",
      action: {
        label: "Eliminar",
        onClick: async () => {
          await investmentsApi.remove(id).catch(() => {})
          refreshAll()
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

  const handleAsk = async () => {
    const q = askQuestion.trim()
    if (!q) return
    setAskLoading(true)
    setAskAnswer("")
    try {
      const res = await investmentsApi.ask(q)
      setAskAnswer(res.answer)
    } catch {
      setAskAnswer("Desculpe, não foi possível obter uma resposta. Tente novamente.")
    }
    setAskLoading(false)
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Investimentos</h2>
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
              <DialogHeader><DialogTitle>Novo investimento</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div><Label>Nome</Label><Input placeholder="Ex: Depósito a prazo BAI" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
                <div><Label>Tipo</Label>
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
                <Button className="w-full" onClick={handleCreate} disabled={isSubmitting}>{isSubmitting ? "A criar..." : "Criar investimento"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 1. Performance Summary                                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-card p-5 shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total investido</p>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-mono font-bold mt-2">{formatKz(summary.total_invested)}</p>
        </div>
        <div className="rounded-xl bg-card p-5 shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Valor actual</p>
            <LineChart className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-mono font-bold mt-2">{formatKz(summary.total_current_value)}</p>
        </div>
        <div className="rounded-xl bg-card p-5 shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Retorno total</p>
            {summary.total_return >= 0
              ? <TrendingUp className="h-4 w-4 text-green-500" />
              : <TrendingDown className="h-4 w-4 text-red-500" />}
          </div>
          <p className={`text-2xl font-mono font-bold mt-2 ${summary.total_return >= 0 ? "text-green-500" : "text-red-500"}`}>
            {summary.total_return >= 0 ? "+" : ""}{formatKz(summary.total_return)}
          </p>
        </div>
        <div className="rounded-xl bg-card p-5 shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rentabilidade</p>
            {summary.return_percentage >= 0
              ? <TrendingUp className="h-4 w-4 text-green-500" />
              : <TrendingDown className="h-4 w-4 text-red-500" />}
          </div>
          <p className={`text-2xl font-mono font-bold mt-2 ${summary.return_percentage >= 0 ? "text-green-500" : "text-red-500"}`}>
            {summary.return_percentage >= 0 ? "+" : ""}{summary.return_percentage}%
          </p>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 2. Portfolio Allocation + 3. Insights (side by side on desktop)   */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Portfolio Allocation */}
        <div className="rounded-xl bg-card p-5 shadow-sm border border-border">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Alocação do portfólio</h3>
          </div>

          {allocation && allocation.allocation.length > 0 ? (
            <>
              {/* Stacked horizontal bar */}
              <div className="flex h-4 rounded-full overflow-hidden mb-4">
                {allocation.allocation.map((item) => (
                  <div
                    key={item.type}
                    className={`${ALLOC_COLORS[item.type] ?? "bg-gray-400"} transition-all`}
                    style={{ width: `${item.percentage}%` }}
                    title={`${item.label}: ${item.percentage}%`}
                  />
                ))}
              </div>

              {/* Legend list */}
              <div className="space-y-2.5">
                {allocation.allocation.map((item) => (
                  <div key={item.type} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${ALLOC_COLORS[item.type] ?? "bg-gray-400"}`} />
                      <span>{item.label}</span>
                      <span className="text-muted-foreground text-xs">({item.count})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground">{formatKz(item.current_value)}</span>
                      <span className={`font-mono font-semibold tabular-nums w-12 text-right ${ALLOC_TEXT_COLORS[item.type] ?? "text-gray-400"}`}>
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Concentration warning */}
              {allocation.concentration_warning && (
                <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">{allocation.concentration_warning}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">Sem dados de alocação</p>
          )}
        </div>

        {/* Insights & Recommendations */}
        <div className="rounded-xl bg-card p-5 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Insights e recomendações</h3>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Powered by IA</span>
          </div>

          {insightsData ? (
            <>
              {/* Risk profile & diversification score */}
              <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1.5">Diversificação</p>
                  <DiversificationBar score={insightsData.diversification_score} />
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1.5">Perfil de risco</p>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${RISK_COLORS[insightsData.risk_profile.toLowerCase()] ?? "bg-gray-100 text-gray-700"}`}>
                    <Shield className="h-3 w-3" />
                    {insightsData.risk_profile}
                  </span>
                </div>
              </div>

              {/* Insight cards */}
              {insightsData.insights.length > 0 ? (
                <div className="space-y-3">
                  {insightsData.insights.map((insight: InvestmentInsight, idx: number) => {
                    const config = SEVERITY_CONFIG[insight.severity] ?? SEVERITY_CONFIG.info
                    return (
                      <div key={idx} className={`rounded-lg p-3 ${config.bg}`}>
                        <div className="flex items-start gap-2">
                          <SeverityIcon severity={insight.severity} />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm">{insight.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
                            {insight.recommendation && (
                              <p className="text-xs mt-1.5 font-medium">{insight.recommendation}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Sem insights disponíveis</p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">A carregar insights...</p>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 4. Investment List                                                */}
      {/* ----------------------------------------------------------------- */}
      <div>
        <h3 className="font-semibold mb-3">Os seus investimentos</h3>
        {investments.length === 0 ? (
          <div className="rounded-xl bg-card border border-border p-12 shadow-sm flex flex-col items-center text-center">
            <LineChart className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum investimento registado</p>
          </div>
        ) : (
          <div className="rounded-xl bg-card shadow-sm border border-border divide-y divide-border">
            {investments.map((inv) => {
              const returnVal = inv.current_value - inv.invested_amount
              const returnPct = inv.invested_amount > 0
                ? Math.round((returnVal / inv.invested_amount) * 10000) / 100
                : 0

              return (
                <div key={inv.id} className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { setDetailInvestment(inv); setDetailOpen(true) }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex items-center justify-center h-9 w-9 rounded-lg ${returnVal >= 0 ? "bg-green-50 dark:bg-green-950/30" : "bg-red-50 dark:bg-red-950/30"}`}>
                      {returnVal >= 0
                        ? <TrendingUp className="h-4 w-4 text-green-500" />
                        : <TrendingDown className="h-4 w-4 text-red-500" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{inv.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
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

        {hasMore && (
          <div className="flex justify-center pt-4">
            <Button variant="outline" size="sm" onClick={() => fetchInvestments(true)}>
              Carregar mais
            </Button>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 5. Ask AI                                                         */}
      {/* ----------------------------------------------------------------- */}
      <div className="rounded-xl bg-card p-5 shadow-sm border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Pergunte sobre investimentos</h3>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium ml-auto">IA</span>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Ex: Devo diversificar mais o meu portfólio?"
            value={askQuestion}
            onChange={(e) => setAskQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !askLoading) handleAsk() }}
            disabled={askLoading}
          />
          <Button onClick={handleAsk} disabled={askLoading || !askQuestion.trim()} size="sm" className="shrink-0 px-4">
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {askLoading && (
          <div className="mt-3 text-sm text-muted-foreground animate-pulse">A pensar...</div>
        )}

        {askAnswer && !askLoading && (
          <div className="mt-3 rounded-lg bg-muted p-4">
            <p className="text-sm whitespace-pre-wrap">{askAnswer}</p>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Dialogs                                                           */}
      {/* ----------------------------------------------------------------- */}
      <InvestmentDetailDialog
        item={detailInvestment}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={refreshAll}
        onDeleted={refreshAll}
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
