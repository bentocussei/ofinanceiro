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
import { apiFetch } from "@/lib/api"
import { formatKz } from "@/lib/format"
import { getContextHeader } from "@/lib/context"

interface Split {
  id: string
  description: string
  total_amount: number
  status: string
  created_at: string
  items: SplitItem[]
}

interface SplitItem {
  id: string
  member_name: string
  amount: number
  is_settled: boolean
}

export default function FamilyExpenseSplitsPage() {
  const [splits, setSplits] = useState<Split[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchSplits = () => {
    apiFetch<{ items: Split[] }>("/api/v1/expense-splits/", { headers: getContextHeader() })
      .then((d) => setSplits(d.items ?? []))
      .catch(() => {})
  }

  useEffect(() => {
    fetchSplits()
  }, [])

  const handleCreate = async () => {
    if (!description.trim() || !amount) return
    setIsSubmitting(true)
    try {
      await apiFetch("/api/v1/expense-splits/", {
        method: "POST",
        headers: getContextHeader(),
        body: JSON.stringify({
          description: description.trim(),
          total_amount: Math.round(parseFloat(amount) * 100),
        }),
      })
      setCreateOpen(false)
      setDescription("")
      setAmount("")
      fetchSplits()
      toast.success("Divisão criada")
    } catch {
      toast.error("Erro ao criar divisão")
    }
    setIsSubmitting(false)
  }

  const handleSettle = async (splitId: string, itemId: string) => {
    try {
      await apiFetch(`/api/v1/expense-splits/${splitId}/items/${itemId}/settle`, {
        method: "POST",
        headers: getContextHeader(),
      })
      fetchSplits()
      toast.success("Parcela marcada como paga")
    } catch {
      toast.error("Erro ao marcar como paga")
    }
  }

  const pendingSplits = splits.filter((s) => s.status === "pending")
  const settledSplits = splits.filter((s) => s.status === "settled")

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Divisão de Despesas</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4 mr-1" /> Nova divisão
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Criar divisão de despesa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
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
                />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? "A criar..." : "Criar"}
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
                <div className="space-y-2">
                  {split.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{item.member_name}</span>
                        {item.is_settled && (
                          <span className="text-xs text-income font-medium">Pago</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono">{formatKz(item.amount)}</span>
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
