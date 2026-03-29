"use client"

import { useEffect, useState } from "react"

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
import { apiFetch } from "@/lib/api"

interface Account {
  id: string
  name: string
  icon: string | null
}

interface Props {
  onCreated?: () => void
}

export function CreateTransactionDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [type, setType] = useState<"expense" | "income">("expense")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [accountId, setAccountId] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      apiFetch<Account[]>("/api/v1/accounts/").then((data) => {
        setAccounts(data)
        if (data.length > 0 && !accountId) setAccountId(data[0].id)
      }).catch(() => {})
    }
  }, [open])

  // Keyboard shortcut: Ctrl+N / Cmd+N
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  const reset = () => {
    setType("expense")
    setAmount("")
    setDescription("")
    setError("")
  }

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError("Introduza um valor válido")
      return
    }
    if (!accountId) {
      setError("Seleccione uma conta")
      return
    }

    setIsSubmitting(true)
    setError("")
    try {
      const amountCentavos = Math.round(parseFloat(amount) * 100)
      await apiFetch("/api/v1/transactions/", {
        method: "POST",
        body: JSON.stringify({
          account_id: accountId,
          amount: amountCentavos,
          type,
          description: description.trim() || undefined,
        }),
      })
      reset()
      setOpen(false)
      onCreated?.()
    } catch (err: any) {
      setError(err.message || "Não foi possível registar a transacção")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger render={<Button />}>
        + Nova transacção
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova transacção</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Type Toggle */}
          <div className="flex gap-2">
            <Button
              variant={type === "expense" ? "destructive" : "outline"}
              className="flex-1"
              onClick={() => setType("expense")}
            >
              Despesa
            </Button>
            <Button
              variant={type === "income" ? "default" : "outline"}
              className={`flex-1 ${type === "income" ? "bg-green-600 hover:bg-green-700" : ""}`}
              onClick={() => setType("income")}
            >
              Receita
            </Button>
          </div>

          {/* Amount */}
          <div>
            <Label>Valor (Kz)</Label>
            <Input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-right font-mono text-xl font-bold"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <Label>Descrição</Label>
            <Input
              placeholder="Ex: Almoço no restaurante"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Account */}
          <div>
            <Label>Conta</Label>
            <Select value={accountId} onValueChange={(v) => { if (v) setAccountId(v) }}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.icon || "💰"} {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Atalho: Ctrl+N
            </p>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              variant={type === "expense" ? "destructive" : "default"}
              className={type === "income" ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {isSubmitting
                ? "A registar..."
                : type === "expense"
                  ? "Registar despesa"
                  : "Registar receita"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
