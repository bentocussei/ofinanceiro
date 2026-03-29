"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { TrendingUp, Plus, Trash2, LineChart } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiFetch } from "@/lib/api"
import { formatKz } from "@/lib/format"
import { getContextHeader } from "@/lib/context"

interface Investment {
  id: string
  name: string
  type: string
  institution: string | null
  invested_amount: number
  current_value: number
  annual_return_rate: number
  start_date: string
  status: string
}

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
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Create form
  const [name, setName] = useState("")
  const [type, setType] = useState("fixed_income")
  const [institution, setInstitution] = useState("")
  const [investedAmount, setInvestedAmount] = useState("")
  const [currentValue, setCurrentValue] = useState("")
  const [annualRate, setAnnualRate] = useState("")

  const fetchInvestments = () => {
    apiFetch<Investment[]>("/api/v1/investments/", { headers: getContextHeader() }).then(setInvestments).catch(() => {})
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
  }

  const handleCreate = async () => {
    if (!name.trim() || !investedAmount) return
    setIsSubmitting(true)
    try {
      await apiFetch("/api/v1/investments/", {
        method: "POST",
        headers: getContextHeader(),
        body: JSON.stringify({
          name: name.trim(),
          type,
          institution: institution.trim() || undefined,
          invested_amount: Math.round(parseFloat(investedAmount) * 100),
          current_value: currentValue ? Math.round(parseFloat(currentValue) * 100) : undefined,
          annual_return_rate: parseFloat(annualRate) || 0,
        }),
      })
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
          await apiFetch(`/api/v1/investments/${id}`, { method: "DELETE", headers: getContextHeader() }).catch(() => {})
          fetchInvestments()
          toast.success("Investimento eliminado com sucesso")
        },
      },
      cancel: { label: "Cancelar", onClick: () => {} },
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Investimentos Familiares</h2>
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
              <div><Label>Valor actual (Kz, opcional)</Label><Input type="number" placeholder="0" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} className="font-mono" /></div>
              <div><Label>Taxa de retorno anual (%)</Label><Input type="number" step="0.1" placeholder="0" value={annualRate} onChange={(e) => setAnnualRate(e.target.value)} className="font-mono" /></div>
              <Button className="w-full" onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? "A criar..." : "Criar investimento"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
              <div key={inv.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors">
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
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(inv.id)} className="text-red-500 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
