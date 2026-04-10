"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Banknote, Plus, Pencil, Trash2 } from "lucide-react"
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
import { incomeSourcesApi, type IncomeSource } from "@/lib/api/income-sources"
import { accountsApi } from "@/lib/api/accounts"
import { formatKz } from "@/lib/format"
import { useTour } from "@/lib/tours"

interface AccountOption {
  id: string
  name: string
}

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

export default function IncomeSourcesPage() {
  useTour("income-sources")
  const [items, setItems] = useState<IncomeSource[]>([])
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState<IncomeSource | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [type, setType] = useState("SALARY")
  const [expectedAmount, setExpectedAmount] = useState("")
  const [frequency, setFrequency] = useState("monthly")
  const [dayOfMonth, setDayOfMonth] = useState("")
  const [accountId, setAccountId] = useState("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchItems = (loadMore = false) => {
    const params = loadMore && cursor ? `cursor=${cursor}` : ""
    incomeSourcesApi.listPage(params)
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

  const fetchAccounts = () => {
    accountsApi.summary()
      .then((data) => setAccounts(data.accounts || []))
      .catch(() => {})
  }

  useEffect(() => {
    fetchItems()
    fetchAccounts()
  }, [])

  const resetForm = () => {
    setName("")
    setType("SALARY")
    setExpectedAmount("")
    setFrequency("monthly")
    setDayOfMonth("")
    setAccountId("")
    setDescription("")
  }

  const handleCreate = async () => {
    if (!name.trim()) return
    setIsSubmitting(true)
    try {
      await incomeSourcesApi.create({
        name: name.trim(),
        type,
        expected_amount: expectedAmount ? Math.round(parseFloat(expectedAmount) * 100) : 0,
        frequency,
        day_of_month: dayOfMonth ? parseInt(dayOfMonth) : undefined,
        account_id: accountId || undefined,
        description: description.trim() || undefined,
      })
      setCreateOpen(false)
      resetForm()
      setCursor(null)
      setHasMore(false)
      fetchItems()
      toast.success("Rendimento criado com sucesso")
    } catch {
      toast.error("Erro ao criar rendimento")
    }
    setIsSubmitting(false)
  }

  const startEdit = (item: IncomeSource) => {
    setEditItem(item)
    setName(item.name)
    setType(item.type)
    setExpectedAmount(String(item.expected_amount / 100))
    setFrequency(item.frequency)
    setDayOfMonth(item.day_of_month ? String(item.day_of_month) : "")
    setAccountId(item.account_id || "")
    setDescription(item.description || "")
    setEditOpen(true)
  }

  const handleEdit = async () => {
    if (!editItem || !name.trim()) return
    setIsSubmitting(true)
    try {
      await incomeSourcesApi.update(editItem.id, {
        name: name.trim(),
        type,
        expected_amount: expectedAmount ? Math.round(parseFloat(expectedAmount) * 100) : 0,
        frequency,
        day_of_month: dayOfMonth ? parseInt(dayOfMonth) : undefined,
        account_id: accountId || undefined,
        description: description.trim() || undefined,
      })
      setEditOpen(false)
      resetForm()
      setEditItem(null)
      setCursor(null)
      setHasMore(false)
      fetchItems()
      toast.success("Rendimento actualizado com sucesso")
    } catch {
      toast.error("Erro ao actualizar rendimento")
    }
    setIsSubmitting(false)
  }

  const handleDelete = (id: string) => {
    toast("Eliminar este rendimento?", {
      description: "Esta acção não pode ser revertida.",
      action: {
        label: "Eliminar",
        onClick: async () => {
          await incomeSourcesApi.remove(id).catch(() => {})
          setCursor(null)
          setHasMore(false)
          fetchItems()
          toast.success("Rendimento eliminado com sucesso")
        },
      },
      cancel: { label: "Cancelar", onClick: () => {} },
    })
  }

  const formFields = (
    <div className="space-y-4 py-2">
      <div>
        <Label>Nome</Label>
        <Input placeholder="Ex: Salário empresa" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
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
      <div>
        <Label>Conta destino (opcional)</Label>
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
        <Label>Descrição (opcional)</Label>
        <textarea
          className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground"
          placeholder="Detalhes adicionais sobre este rendimento"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Rendimentos</h2>
        <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm() }}>
          <DialogTrigger render={<Button className="hidden md:inline-flex" data-tour="new-income-source" />}>
            <Plus className="h-4 w-4 mr-1" /> Novo rendimento
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Novo rendimento</DialogTitle></DialogHeader>
            {formFields}
            <Button className="w-full" onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? "A criar..." : "Criar rendimento"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <Banknote className="h-10 w-10 mx-auto text-muted-foreground/30" />
          <p className="text-muted-foreground mt-3">Nenhum rendimento registado</p>
          <p className="text-sm text-muted-foreground mt-1">Adicione as suas fontes de rendimento para melhor planeamento</p>
        </div>
      ) : (
        <div className="rounded-xl bg-card shadow-sm divide-y divide-border">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3.5 hover:bg-accent/50 transition-colors">
              <div className="flex items-start gap-3 min-w-0">
                <Banknote className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary mr-2">
                      {TYPE_LABELS[item.type] || item.type}
                    </span>
                    {FREQ_LABELS[item.frequency] || item.frequency}
                    {item.day_of_month ? ` -- Dia ${item.day_of_month}` : ""}
                    {item.account_name ? ` -- ${item.account_name}` : ""}
                  </p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-1">{item.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                <p className="font-mono font-semibold text-green-500 whitespace-nowrap">{formatKz(item.expected_amount)}</p>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => startEdit(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
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
          <DialogHeader><DialogTitle>Editar rendimento</DialogTitle></DialogHeader>
          {formFields}
          <Button className="w-full" onClick={handleEdit} disabled={isSubmitting}>
            {isSubmitting ? "A guardar..." : "Guardar alterações"}
          </Button>
        </DialogContent>
      </Dialog>
    
      <MobileFAB onClick={() => setCreateOpen(true)} label="Novo rendimento" />
</div>
  )
}
