"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Receipt, Plus, Pencil, Trash2, Check } from "lucide-react"
import { MobileFAB } from "@/components/layout/MobileFAB"

import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { billsApi, type Bill } from "@/lib/api/bills"
import { accountsApi } from "@/lib/api/accounts"
import { categoriesApi, type Category } from "@/lib/api/categories"
import { formatKz } from "@/lib/format"
import { useTour } from "@/lib/tours"

interface AccountOption {
  id: string
  name: string
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

export default function BillsPage() {
  useTour("bills")
  const [items, setItems] = useState<Bill[]>([])
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState<Bill | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  // Form
  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [payFromAccountId, setPayFromAccountId] = useState("")
  const [dueDay, setDueDay] = useState("1")
  const [frequency, setFrequency] = useState("monthly")
  const [autoPay, setAutoPay] = useState(false)
  const [reminderDays, setReminderDays] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchItems = (loadMore = false) => {
    const params = loadMore && cursor ? `cursor=${cursor}` : ""
    billsApi.listPage(params)
      .then((res) => {
        if (loadMore) {
          setItems(prev => [...prev, ...res.items])
        } else {
          setItems(res.items)
        }
        setCursor(res.cursor)
        setHasMore(res.has_more)
      })
      .catch(() => {})
  }

  useEffect(() => {
    fetchItems()
    accountsApi.summary()
      .then((data) => setAccounts(data.accounts || []))
      .catch(() => {})
    categoriesApi.list()
      .then(setCategories)
      .catch(() => {})
  }, [])

  const resetForm = () => {
    setName("")
    setAmount("")
    setDescription("")
    setCategoryId("")
    setPayFromAccountId("")
    setDueDay("1")
    setFrequency("monthly")
    setAutoPay(false)
    setReminderDays("")
  }

  const handleCreate = async () => {
    if (!name.trim() || !amount) return
    setIsSubmitting(true)
    try {
      await billsApi.create({
        name: name.trim(),
        amount: Math.round(parseFloat(amount) * 100),
        description: description.trim() || undefined,
        category_id: categoryId || undefined,
        pay_from_account_id: payFromAccountId || undefined,
        due_day: parseInt(dueDay) || 1,
        frequency,
        auto_pay: autoPay,
        reminder_days: reminderDays ? parseInt(reminderDays) : undefined,
      })
      setCreateOpen(false)
      resetForm()
      setCursor(null)
      setHasMore(false)
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
    setDescription(item.description || "")
    setCategoryId(item.category_id || "")
    setPayFromAccountId(item.pay_from_account_id || "")
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
      await billsApi.update(editItem.id, {
        name: name.trim(),
        amount: Math.round(parseFloat(amount) * 100),
        description: description.trim() || undefined,
        category: null,
        category_id: categoryId || undefined,
        pay_from_account_id: payFromAccountId || undefined,
        due_day: parseInt(dueDay) || 1,
        frequency,
        auto_pay: autoPay,
        reminder_days: reminderDays ? parseInt(reminderDays) : null,
      })
      setEditOpen(false)
      resetForm()
      setEditItem(null)
      setCursor(null)
      setHasMore(false)
      fetchItems()
      toast.success("Conta a pagar actualizada com sucesso")
    } catch {
      toast.error("Erro ao actualizar conta a pagar")
    }
    setIsSubmitting(false)
  }

  const handleMarkPaid = async (id: string) => {
    try {
      await billsApi.pay(id)
      setCursor(null)
      setHasMore(false)
      fetchItems()
      toast.success("Marcado como pago")
    } catch {
      toast.error("Erro ao marcar como pago")
    }
  }

  const handleDelete = (id: string) => {
    toast("Eliminar esta conta a pagar?", {
      description: "Esta acção não pode ser revertida.",
      action: {
        label: "Eliminar",
        onClick: async () => {
          await billsApi.remove(id).catch(() => {})
          setCursor(null)
          setHasMore(false)
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
        <Label>Descrição (opcional)</Label>
        <textarea
          className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground"
          placeholder="Detalhes adicionais sobre esta conta"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div>
        <Label>Categoria (opcional)</Label>
        <Select value={categoryId} onValueChange={(v) => setCategoryId(v || "")}>
          <SelectTrigger><SelectValue placeholder="Seleccionar categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Nenhuma</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Conta de débito (opcional)</Label>
        <Select value={payFromAccountId} onValueChange={(v) => setPayFromAccountId(v || "")}>
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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Contas a Pagar</h2>
        <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm() }}>
          <DialogTrigger render={<Button className="hidden md:inline-flex" data-tour="new-bill" />}>
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
        <div className="text-center py-16">
          <Receipt className="h-10 w-10 mx-auto text-muted-foreground/30" />
          <p className="text-muted-foreground mt-3">Nenhuma conta a pagar registada</p>
          <p className="text-sm text-muted-foreground mt-1">Adicione as suas contas recorrentes para nunca perder um prazo</p>
        </div>
      ) : (
        <div className="md:rounded-xl md:bg-card md:shadow-sm md:divide-y md:divide-border space-y-1 md:space-y-0 -mx-4 md:mx-0">
          {items.map((item) => {
            const statusStyle = STATUS_STYLES[item.status] || STATUS_STYLES.PENDING
            return (
              <div key={item.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 py-3.5 hover:bg-accent/50 transition-colors mx-4 my-1 rounded-xl bg-card shadow-sm md:mx-0 md:my-0 md:rounded-none md:bg-transparent md:shadow-none">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Receipt className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.category && <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary mr-2">{item.category}</span>}
                      Dia {item.due_day} -- {FREQ_LABELS[item.frequency] || item.frequency}
                      {item.next_due_date ? ` -- Próximo: ${new Date(item.next_due_date + "T00:00:00").toLocaleDateString("pt-AO")}` : ""}
                    </p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-1">{item.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 flex-wrap">
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

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" size="sm" onClick={() => fetchItems(true)}>
            Carregar mais
          </Button>
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
    
      <MobileFAB onClick={() => setCreateOpen(true)} label="Nova conta" />
</div>
  )
}
