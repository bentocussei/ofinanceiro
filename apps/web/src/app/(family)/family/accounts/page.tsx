"use client"

import { useEffect, useState } from "react"
import { Plus, Wallet } from "lucide-react"
import { MobileFAB } from "@/components/layout/MobileFAB"
import { toast } from "sonner"

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { accountsApi, type AccountSummary } from "@/lib/api/accounts"
import { formatKz } from "@/lib/format"
import { getContextHeader } from "@/lib/context"

const TYPE_LABELS: Record<string, string> = {
  bank: "Banco",
  digital_wallet: "Carteira digital",
  cash: "Dinheiro",
  savings: "Poupança",
  investment: "Investimento",
  credit_card: "Cartão de crédito",
  loan: "Empréstimo",
}

export default function FamilyAccountsPage() {
  const [summary, setSummary] = useState<AccountSummary | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState("")
  const [type, setType] = useState("bank")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchAccounts = () => {
    const ctx = { headers: getContextHeader() }
    accountsApi.summary(ctx)
      .then(setSummary)
      .catch(() => {})
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const handleCreate = async () => {
    if (!name.trim()) return
    setIsSubmitting(true)
    try {
      const ctx = { headers: getContextHeader() }
      await accountsApi.create({ name: name.trim(), type, is_shared: true }, ctx)
      setCreateOpen(false)
      setName("")
      setType("bank")
      fetchAccounts()
      toast.success("Conta partilhada criada")
    } catch {
      toast.error("Erro ao criar conta")
    }
    setIsSubmitting(false)
  }

  const accounts = summary?.accounts ?? []

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Contas Partilhadas</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button className="hidden md:inline-flex" size="sm" />}>
            <Plus className="h-4 w-4 mr-1" /> Nova conta
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Criar conta partilhada</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Nome</Label>
                <Input
                  placeholder="Ex: Conta conjunta"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(v) => setType(v ?? "bank")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? "A criar..." : "Criar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-6">
          <div className="rounded-xl bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)]">
            <p className="text-xs text-muted-foreground">Activos</p>
            <p className="text-lg font-bold font-mono text-income">{formatKz(summary.total_assets)}</p>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)]">
            <p className="text-xs text-muted-foreground">Passivos</p>
            <p className="text-lg font-bold font-mono text-expense">{formatKz(summary.total_liabilities)}</p>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)]">
            <p className="text-xs text-muted-foreground">Saldo líquido</p>
            <p className="text-lg font-bold font-mono">{formatKz(summary.net_worth)}</p>
          </div>
        </div>
      )}

      {/* Accounts List */}
      {accounts.length > 0 ? (
        <div className="rounded-xl bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] divide-y divide-border">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="flex items-center justify-between px-5 py-4 hover:bg-accent/40 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{acc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {TYPE_LABELS[acc.type] || acc.type}
                    {acc.institution ? ` -- ${acc.institution}` : ""}
                  </p>
                </div>
              </div>
              <span
                className={`text-sm font-semibold font-mono ml-4 ${
                  acc.balance >= 0 ? "text-income" : "text-expense"
                }`}
              >
                {formatKz(acc.balance)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-card p-12 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] flex flex-col items-center text-center">
          <Wallet className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">Nenhuma conta partilhada registada</p>
        </div>
      )}
    
      <MobileFAB onClick={() => setCreateOpen(true)} label="Nova conta" />
</div>
  )
}
