"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Receipt, Plus, Pencil, Trash2, Check } from "lucide-react"

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

interface Bill {
  id: string
  name: string
  amount: number
  category: string | null
  due_day: number
  frequency: string
  status: string
  auto_pay: boolean
  reminder_days: number | null
  next_due_date: string | null
}

const FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Mensal" },
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quinzenal" },
  { value: "quarterly", label: "Trimestral" },
  { value: "annually", label: "Anual" },
]

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: "bg-yellow-500/10", text: "text-yellow-600", label: "Pendente" },
  PAID: { bg: "bg-blue-500/10", text: "text-blue-600", label: "Paga" },
  OVERDUE: { bg: "bg-red-500/10", text: "text-red-600", label: "Em atraso" },
}

const FREQ_LABELS: Record<string, string> = Object.fromEntries(FREQUENCY_OPTIONS.map((f) => [f.value, f.label]))

export default function FamilyBillsPage() {
  const [items, setItems] = useState<Bill[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState<Bill | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  // Form
  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("")
  const [dueDay, setDueDay] = useState("1")
  const [frequency, setFrequency] = useState("monthly")
  const [autoPay, setAutoPay] = useState(false)
  const [reminderDays, setReminderDays] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchItems = () => {
    apiFetch<Bill[]>("/api/v1/bills/", { headers: getContextHeader() }).then(setItems).catch(() => {})
  }

  useEffect(() => { fetchItems() }, [])

  const resetForm = () => {
    setName("")
    setAmount("")
    setCategory("")
    setDueDay("1")
    setFrequency("monthly")
    setAutoPay(false)
    setReminderDays("")
  }

  const handleCreate = async () => {
    if (!name.trim() || !amount) return
    setIsSubmitting(true)
    try {
      await apiFetch("/api/v1/bills/", {
        method: "POST",
        headers: getContextHeader(),
        body: JSON.stringify({
          name: name.trim(),
          amount: Math.round(parseFloat(amount) * 100),
          category: category.trim() || undefined,
          due_day: parseInt(dueDay) || 1,
          frequency,
          auto_pay: autoPay,
          reminder_days: reminderDays ? parseInt(reminderDays) : undefined,
        }),
      })
      setCreateOpen(false)
      resetForm()
      fetchItems()
      toast.success("Conta a pagar criada com sucesso")
    } catch {
      toast.error("Erro ao criar conta a pagar")
    }
    setIsSubmitting(false)
  }

  const startEdit = (item: Bill) => {
    setEditItem(item)
    setName(item.name)
    setAmount(String(item.amount / 100))
    setCategory(item.category || "")
    setDueDay(String(item.due_day))
    setFrequency(item.frequency)
    setAutoPay(item.auto_pay)
    setReminderDays(item.reminder_days ? String(item.reminder_days) : "")
    setEditOpen(true)
  }

  const handleEdit = async () => {
    if (!editItem || !name.trim()) return
    setIsSubmitting(true)
    try {
      await apiFetch(`/api/v1/bills/${editItem.id}`, {
        method: "PUT",
        headers: getContextHeader(),
        body: JSON.stringify({
          name: name.trim(),
          amount: Math.round(parseFloat(amount) * 100),
          category: category.trim() || null,
          due_day: parseInt(dueDay) || 1,
          frequency,
          auto_pay: autoPay,
          reminder_days: reminderDays ? parseInt(reminderDays) : null,
        }),
      })
      setEditOpen(false)
      resetForm()
      setEditItem(null)
      fetchItems()
      toast.success("Conta a pagar actualizada com sucesso")
    } catch {
      toast.error("Erro ao actualizar conta a pagar")
    }
    setIsSubmitting(false)
  }

  const handleMarkPaid = async (id: string) => {
    try {
      await apiFetch(`/api/v1/bills/${id}/pay`, { method: "POST", headers: getContextHeader() })
      fetchItems()
      toast.success("Marcado como paga")
    } catch {
      toast.error("Erro ao marcar como paga")
    }
  }

  const handleDelete = (id: string) => {
    toast("Eliminar esta conta a pagar?", {
      description: "Esta acção não pode ser revertida.",
      action: {
        label: "Eliminar",
        onClick: async () => {
          await apiFetch(`/api/v1/bills/${id}`, { method: "DELETE", headers: getContextHeader() }).catch(() => {})
          fetchItems()
          toast.success("Conta a pagar eliminada com sucesso")
        },
      },
      cancel: { label: "Cancelar", onClick: () => {} },
    })
  }

  const formFields = (
    <div className="space-y-4 py-2">
      <div>
        <Label>Nome</Label>
        <Input placeholder="Ex: Electricidade ENDE" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div>
        <Label>Valor (Kz)</Label>
        <Input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="font-mono" />
      </div>
      <div>
        <Label>Categoria (opcional)</Label>
        <Input placeholder="Ex: Utilidades" value={category} onChange={(e) => setCategory(e.target.value)} />
      </div>
      <div>
        <Label>Dia de vencimento</Label>
        <Input type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
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
      <div className="flex items-center gap-3">
        <Label htmlFor="auto-pay-toggle" className="flex-1">Pagamento automático</Label>
        <button
          id="auto-pay-toggle"
          type="button"
          role="switch"
          aria-checked={autoPay}
          onClick={() => setAutoPay(!autoPay)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${autoPay ? "bg-primary" : "bg-muted"}`}
        >
          <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${autoPay ? "translate-x-4" : "translate-x-0"}`} />
        </button>
      </div>
      <div>
        <Label>Dias de lembrete antes do vencimento (opcional)</Label>
        <Input type="number" min="1" max="30" placeholder="Ex: 3" value={reminderDays} onChange={(e) => setReminderDays(e.target.value)} />
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Contas a Pagar da Família</h2>
        <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm() }}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-1" /> Nova conta
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Nova conta a pagar</DialogTitle></DialogHeader>
            {formFields}
            <Button className="w-full" onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? "A criar..." : "Criar conta a pagar"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl bg-card p-12 shadow-sm flex flex-col items-center text-center">
          <Receipt className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma conta a pagar registada</p>
          <p className="text-xs text-muted-foreground mt-1">Adicione as contas recorrentes da família para nunca perder um prazo</p>
        </div>
      ) : (
        <div className="rounded-xl bg-card shadow-sm divide-y divide-border">
          {items.map((item) => {
            const statusStyle = STATUS_STYLES[item.status] || STATUS_STYLES.PENDING
            return (
              <div key={item.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Receipt className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Dia {item.due_day} -- {FREQ_LABELS[item.frequency] || item.frequency}
                      {item.next_due_date ? ` -- Próximo: ${new Date(item.next_due_date + "T00:00:00").toLocaleDateString("pt-AO")}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                    {statusStyle.label}
                  </span>
                  <p className="font-mono font-semibold">{formatKz(item.amount)}</p>
                  {item.status !== "PAID" && (
                    <Button variant="outline" size="sm" onClick={() => handleMarkPaid(item.id)} title="Marcar como paga">
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => startEdit(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) { resetForm(); setEditItem(null) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Editar conta a pagar</DialogTitle></DialogHeader>
          {formFields}
          <Button className="w-full" onClick={handleEdit} disabled={isSubmitting}>
            {isSubmitting ? "A guardar..." : "Guardar alterações"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
