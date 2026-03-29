"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Banknote, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { incomeSourcesApi, type IncomeSource } from "@/lib/api/income-sources"
import { formatKz } from "@/lib/format"
import { getContextHeader } from "@/lib/context"

const TYPE_OPTIONS = [
  { value: "SALARY", label: "Salário" },
  { value: "RENTAL", label: "Renda" },
  { value: "BUSINESS", label: "Negócio" },
  { value: "FREELANCE", label: "Freelance" },
  { value: "INVESTMENT", label: "Investimento" },
  { value: "PENSION", label: "Pensão" },
  { value: "OTHER", label: "Outro" },
]

const FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Mensal" },
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quinzenal" },
  { value: "quarterly", label: "Trimestral" },
  { value: "annually", label: "Anual" },
]

const TYPE_LABELS: Record<string, string> = Object.fromEntries(TYPE_OPTIONS.map((t) => [t.value, t.label]))
const FREQ_LABELS: Record<string, string> = Object.fromEntries(FREQUENCY_OPTIONS.map((f) => [f.value, f.label]))

export default function FamilyIncomeSourcesPage() {
  const [items, setItems] = useState<IncomeSource[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [type, setType] = useState("SALARY")
  const [expectedAmount, setExpectedAmount] = useState("")
  const [frequency, setFrequency] = useState("monthly")
  const [dayOfMonth, setDayOfMonth] = useState("")

  const fetchItems = () => {
    const ctx = { headers: getContextHeader() }
    incomeSourcesApi.list(ctx).then(setItems).catch(() => {})
  }

  useEffect(() => { fetchItems() }, [])

  const resetForm = () => {
    setName("")
    setType("SALARY")
    setExpectedAmount("")
    setFrequency("monthly")
    setDayOfMonth("")
  }

  const handleCreate = async () => {
    if (!name.trim()) return
    setIsSubmitting(true)
    try {
      const ctx = { headers: getContextHeader() }
      await incomeSourcesApi.create({
        name: name.trim(),
        type,
        expected_amount: expectedAmount ? Math.round(parseFloat(expectedAmount) * 100) : 0,
        frequency,
        day_of_month: dayOfMonth ? parseInt(dayOfMonth) : undefined,
      }, ctx)
      setCreateOpen(false)
      resetForm()
      fetchItems()
      toast.success("Rendimento familiar criado com sucesso")
    } catch {
      toast.error("Erro ao criar rendimento")
    }
    setIsSubmitting(false)
  }

  const handleDelete = (id: string) => {
    toast("Eliminar este rendimento?", {
      description: "Esta acção não pode ser revertida.",
      action: {
        label: "Eliminar",
        onClick: async () => {
          const ctx = { headers: getContextHeader() }
          await incomeSourcesApi.remove(id, ctx).catch(() => {})
          fetchItems()
          toast.success("Rendimento eliminado com sucesso")
        },
      },
      cancel: { label: "Cancelar", onClick: () => {} },
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Rendimentos Familiares</h2>
        <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm() }}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-1" /> Novo rendimento
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Novo rendimento familiar</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Nome</Label>
                <Input placeholder="Ex: Salário do membro" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              </div>
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
                <Label>Valor esperado (Kz)</Label>
                <Input type="number" placeholder="0" value={expectedAmount} onChange={(e) => setExpectedAmount(e.target.value)} className="font-mono" />
              </div>
              <div>
                <Label>Frequência</Label>
                <Select value={frequency} onValueChange={(v) => { if (v) setFrequency(v) }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Dia do mês (opcional)</Label>
                <Input type="number" min="1" max="31" placeholder="Ex: 25" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? "A criar..." : "Criar rendimento"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl bg-card p-12 shadow-sm flex flex-col items-center text-center">
          <Banknote className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum rendimento familiar registado</p>
          <p className="text-xs text-muted-foreground mt-1">Adicione as fontes de rendimento da família para melhor planeamento</p>
        </div>
      ) : (
        <div className="rounded-xl bg-card shadow-sm divide-y divide-border">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-3">
                <Banknote className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary mr-2">
                      {TYPE_LABELS[item.type] || item.type}
                    </span>
                    {FREQ_LABELS[item.frequency] || item.frequency}
                    {item.day_of_month ? ` -- Dia ${item.day_of_month}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-mono font-semibold text-green-500">{formatKz(item.expected_amount)}</p>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
