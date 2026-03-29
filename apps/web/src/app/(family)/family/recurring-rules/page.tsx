"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Repeat, Plus, Trash2 } from "lucide-react"

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
import { getContextHeader } from "@/lib/context"

interface RecurringRule {
  id: string
  account_id: string | null
  type: string
  amount: number
  description: string
  frequency: string
  day_of_month: number | null
  start_date: string | null
  next_due: string | null
  account_name?: string | null
}

interface AccountOption {
  id: string
  name: string
}

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Diário" },
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quinzenal" },
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" },
  { value: "annually", label: "Anual" },
]

const FREQ_LABELS: Record<string, string> = Object.fromEntries(FREQUENCY_OPTIONS.map((f) => [f.value, f.label]))

export default function FamilyRecurringRulesPage() {
  const [items, setItems] = useState<RecurringRule[]>([])
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form
  const [accountId, setAccountId] = useState("")
  const [type, setType] = useState("expense")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [frequency, setFrequency] = useState("monthly")
  const [dayOfMonth, setDayOfMonth] = useState("")
  const [startDate, setStartDate] = useState("")

  const fetchItems = () => {
    apiFetch<RecurringRule[]>("/api/v1/recurring-rules/", { headers: getContextHeader() }).then(setItems).catch(() => {})
  }

  useEffect(() => {
    fetchItems()
    apiFetch<{ accounts: AccountOption[] }>("/api/v1/accounts/summary", { headers: getContextHeader() })
      .then((data) => setAccounts(data.accounts || []))
      .catch(() => {})
  }, [])

  const resetForm = () => {
    setAccountId("")
    setType("expense")
    setAmount("")
    setDescription("")
    setFrequency("monthly")
    setDayOfMonth("")
    setStartDate("")
  }

  const handleCreate = async () => {
    if (!description.trim() || !amount) return
    setIsSubmitting(true)
    try {
      await apiFetch("/api/v1/recurring-rules/", {
        method: "POST",
        headers: getContextHeader(),
        body: JSON.stringify({
          account_id: accountId || undefined,
          type,
          amount: Math.round(parseFloat(amount) * 100),
          description: description.trim(),
          frequency,
          day_of_month: dayOfMonth ? parseInt(dayOfMonth) : undefined,
          start_date: startDate || undefined,
        }),
      })
      setCreateOpen(false)
      resetForm()
      fetchItems()
      toast.success("Regra recorrente familiar criada com sucesso")
    } catch {
      toast.error("Erro ao criar regra recorrente")
    }
    setIsSubmitting(false)
  }

  const handleDelete = (id: string) => {
    toast("Eliminar esta regra recorrente?", {
      description: "Esta acção não pode ser revertida.",
      action: {
        label: "Eliminar",
        onClick: async () => {
          await apiFetch(`/api/v1/recurring-rules/${id}`, { method: "DELETE", headers: getContextHeader() }).catch(() => {})
          fetchItems()
          toast.success("Regra recorrente eliminada com sucesso")
        },
      },
      cancel: { label: "Cancelar", onClick: () => {} },
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Recorrentes Familiares</h2>
        <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm() }}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-1" /> Nova regra
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Nova regra recorrente familiar</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Descrição</Label>
                <Input placeholder="Ex: Renda mensal" value={description} onChange={(e) => setDescription(e.target.value)} autoFocus />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(v) => { if (v) setType(v) }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Receita</SelectItem>
                    <SelectItem value="expense">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor (Kz)</Label>
                <Input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="font-mono" />
              </div>
              <div>
                <Label>Conta (opcional)</Label>
                <Select value={accountId} onValueChange={(v) => setAccountId(v || "")}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar conta" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Input type="number" min="1" max="31" placeholder="Ex: 1" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} />
              </div>
              <div>
                <Label>Data de início (opcional)</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? "A criar..." : "Criar regra"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl bg-card p-12 shadow-sm flex flex-col items-center text-center">
          <Repeat className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma regra recorrente familiar</p>
          <p className="text-xs text-muted-foreground mt-1">Crie regras para automatizar transacções repetitivas da família</p>
        </div>
      ) : (
        <div className="rounded-xl bg-card shadow-sm divide-y divide-border">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-3">
                <Repeat className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{item.description}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mr-2 ${item.type === "income" ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}`}>
                      {item.type === "income" ? "Receita" : "Despesa"}
                    </span>
                    {FREQ_LABELS[item.frequency] || item.frequency}
                    {item.next_due ? ` -- Próximo: ${new Date(item.next_due + "T00:00:00").toLocaleDateString("pt-AO")}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className={`font-mono font-semibold ${item.type === "income" ? "text-green-500" : "text-red-500"}`}>
                  {formatKz(item.amount)}
                </p>
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
