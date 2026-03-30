"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Check, Percent, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { expenseSplitsApi, type ExpenseSplit } from "@/lib/api/expense-splits"
import { familiesApi, type FamilyMember } from "@/lib/api/families"
import { formatKz } from "@/lib/format"
import { getContextHeader } from "@/lib/context"

const SPLIT_TYPES = [
  { value: "equal", label: "Igual" },
  { value: "percentage", label: "Percentagem" },
  { value: "fixed", label: "Valor fixo" },
]

interface MemberSplitState {
  member_id: string
  display_name: string
  selected: boolean
  amount: string
  percentage: string
}

export default function FamilyExpenseSplitsPage() {
  const [splits, setSplits] = useState<ExpenseSplit[]>([])
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [splitType, setSplitType] = useState("equal")
  const [notes, setNotes] = useState("")
  const [memberStates, setMemberStates] = useState<MemberSplitState[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchSplits = () => {
    const ctx = { headers: getContextHeader() }
    expenseSplitsApi.list(ctx)
      .then((items) => setSplits(items ?? []))
      .catch(() => {})
  }

  const fetchMembers = () => {
    const ctx = { headers: getContextHeader() }
    familiesApi.me(ctx)
      .then((family) => {
        if (family?.members) {
          setMembers(family.members)
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    fetchSplits()
    fetchMembers()
  }, [])

  // Initialize member states when members load or dialog opens
  useEffect(() => {
    if (createOpen && members.length > 0) {
      setMemberStates(members.filter((m) => m.is_active).map((m) => ({
        member_id: m.id,
        display_name: m.display_name || m.user_id,
        selected: true,
        amount: "",
        percentage: "",
      })))
    }
  }, [createOpen, members])

  const resetForm = () => {
    setDescription("")
    setAmount("")
    setSplitType("equal")
    setNotes("")
    setMemberStates([])
  }

  const toggleMember = (memberId: string) => {
    setMemberStates((prev) =>
      prev.map((m) => m.member_id === memberId ? { ...m, selected: !m.selected } : m)
    )
  }

  const updateMemberField = (memberId: string, field: "amount" | "percentage", value: string) => {
    setMemberStates((prev) =>
      prev.map((m) => m.member_id === memberId ? { ...m, [field]: value } : m)
    )
  }

  const selectedMembers = memberStates.filter((m) => m.selected)

  const handleCreate = async () => {
    if (!description.trim() || !amount || selectedMembers.length === 0) {
      if (selectedMembers.length === 0) {
        toast.error("Seleccione pelo menos um membro")
      }
      return
    }

    const totalCentavos = Math.round(parseFloat(amount) * 100)

    // Build parts array based on split type
    let parts: { member_id: string; amount?: number; percentage?: number }[] = []

    if (splitType === "equal") {
      const perPerson = Math.floor(totalCentavos / selectedMembers.length)
      const remainder = totalCentavos - perPerson * selectedMembers.length
      parts = selectedMembers.map((m, idx) => ({
        member_id: m.member_id,
        amount: perPerson + (idx < remainder ? 1 : 0),
        percentage: Math.round((100 / selectedMembers.length) * 100) / 100,
      }))
    } else if (splitType === "percentage") {
      const totalPct = selectedMembers.reduce((s, m) => s + (parseFloat(m.percentage) || 0), 0)
      if (Math.abs(totalPct - 100) > 0.01) {
        toast.error("As percentagens devem somar 100%")
        return
      }
      parts = selectedMembers.map((m) => {
        const pct = parseFloat(m.percentage) || 0
        return {
          member_id: m.member_id,
          amount: Math.round(totalCentavos * pct / 100),
          percentage: pct,
        }
      })
    } else {
      // fixed
      const totalFixed = selectedMembers.reduce((s, m) => s + Math.round((parseFloat(m.amount) || 0) * 100), 0)
      if (Math.abs(totalFixed - totalCentavos) > 1) {
        toast.error(`Os valores fixos devem somar ${formatKz(totalCentavos)}`)
        return
      }
      parts = selectedMembers.map((m) => ({
        member_id: m.member_id,
        amount: Math.round((parseFloat(m.amount) || 0) * 100),
      }))
    }

    setIsSubmitting(true)
    try {
      const ctx = { headers: getContextHeader() }
      await expenseSplitsApi.create({
        description: description.trim(),
        total_amount: totalCentavos,
        split_type: splitType,
        parts,
      }, ctx)
      setCreateOpen(false)
      resetForm()
      fetchSplits()
      toast.success("Divisão criada com sucesso")
    } catch {
      toast.error("Erro ao criar divisão")
    }
    setIsSubmitting(false)
  }

  const handleSettle = async (splitId: string, itemId: string) => {
    try {
      const ctx = { headers: getContextHeader() }
      await expenseSplitsApi.settlePart(splitId, itemId, ctx)
      fetchSplits()
      toast.success("Parcela marcada como paga")
    } catch {
      toast.error("Erro ao marcar como paga")
    }
  }

  const pendingSplits = splits.filter((s) => s.status === "pending")
  const settledSplits = splits.filter((s) => s.status === "settled")

  // Calculate equal split preview
  const equalPerPerson = selectedMembers.length > 0 && amount
    ? Math.round(parseFloat(amount) * 100 / selectedMembers.length)
    : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Divisão de Despesas</h2>
        <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm() }}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4 mr-1" /> Nova divisão
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Criar divisão de despesa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto">
              <div>
                <Label>Descrição</Label>
                <Input
                  placeholder="Ex: Compras do supermercado"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <Label>Valor total (Kz)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <Label>Tipo de divisão</Label>
                <Select value={splitType} onValueChange={(v) => { if (v) setSplitType(v) }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SPLIT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notas (opcional)</Label>
                <textarea
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground"
                  placeholder="Observações adicionais"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Member selection */}
              <div>
                <Label className="mb-2 block">Membros</Label>
                {memberStates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">A carregar membros...</p>
                ) : (
                  <div className="space-y-2">
                    {memberStates.map((m) => (
                      <div key={m.member_id} className="rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleMember(m.member_id)}
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                              m.selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-input"
                            }`}
                          >
                            {m.selected && <Check className="h-3 w-3" />}
                          </button>
                          <span className="text-sm font-medium flex-1">{m.display_name}</span>

                          {m.selected && splitType === "equal" && amount && (
                            <span className="text-xs font-mono text-muted-foreground">
                              {formatKz(equalPerPerson)}
                            </span>
                          )}

                          {m.selected && splitType === "percentage" && (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                placeholder="0"
                                value={m.percentage}
                                onChange={(e) => updateMemberField(m.member_id, "percentage", e.target.value)}
                                className="w-20 h-8 font-mono text-xs"
                              />
                              <span className="text-xs text-muted-foreground">%</span>
                            </div>
                          )}

                          {m.selected && splitType === "fixed" && (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={m.amount}
                                onChange={(e) => updateMemberField(m.member_id, "amount", e.target.value)}
                                className="w-24 h-8 font-mono text-xs"
                              />
                              <span className="text-xs text-muted-foreground">Kz</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button className="w-full" onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? "A criar..." : "Criar divisão"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {pendingSplits.length > 0 && (
        <section className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Pendentes
          </p>
          <div className="space-y-4">
            {pendingSplits.map((split) => (
              <div
                key={split.id}
                className="rounded-xl bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)]"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">{split.description}</h3>
                  <span className="text-sm font-mono font-semibold">{formatKz(split.total_amount)}</span>
                </div>
                {split.split_type && (
                  <p className="text-xs text-muted-foreground mb-2">
                    {split.split_type === "equal" ? "Divisão igual" : split.split_type === "percentage" ? "Por percentagem" : "Valor fixo"}
                  </p>
                )}
                <div className="space-y-2">
                  {(split.items ?? split.parts).map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{item.member_name}</span>
                        {item.is_settled && (
                          <span className="text-xs text-income font-medium">Pago</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono">{formatKz(item.amount)}</span>
                        {item.percentage != null && item.percentage > 0 && (
                          <span className="text-xs text-muted-foreground">({item.percentage}%)</span>
                        )}
                        {!item.is_settled && (
                          <button
                            onClick={() => handleSettle(split.id, item.id)}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-income/10 text-income hover:bg-income/20 transition-colors"
                            title="Marcar como pago"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {settledSplits.length > 0 && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Concluídas
          </p>
          <div className="space-y-3">
            {settledSplits.map((split) => (
              <div
                key={split.id}
                className="rounded-xl bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] opacity-70"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{split.description}</span>
                  <span className="text-sm font-mono">{formatKz(split.total_amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {splits.length === 0 && (
        <div className="rounded-xl bg-card p-12 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] flex flex-col items-center text-center">
          <Percent className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">Nenhuma divisão de despesa registada</p>
        </div>
      )}
    </div>
  )
}
