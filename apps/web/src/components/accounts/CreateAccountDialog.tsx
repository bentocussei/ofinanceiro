"use client"

import { useState } from "react"

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

const ACCOUNT_TYPES = [
  { value: "bank", label: "Banco", icon: "🏦" },
  { value: "digital_wallet", label: "Carteira digital", icon: "📱" },
  { value: "cash", label: "Dinheiro", icon: "💵" },
  { value: "savings", label: "Poupança", icon: "🏦" },
  { value: "investment", label: "Investimento", icon: "📈" },
  { value: "credit_card", label: "Cartão de crédito", icon: "💳" },
  { value: "loan", label: "Empréstimo", icon: "📋" },
]

interface Props {
  onCreated?: () => void
}

export function CreateAccountDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [type, setType] = useState("bank")
  const [institution, setInstitution] = useState("")
  const [balance, setBalance] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const reset = () => {
    setName("")
    setType("bank")
    setInstitution("")
    setBalance("")
    setError("")
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("O nome da conta é obrigatório")
      return
    }

    setIsSubmitting(true)
    setError("")
    try {
      const balanceCentavos = balance
        ? Math.round(parseFloat(balance.replace(/[^\d]/g, "")) * 100)
        : 0
      await apiFetch("/api/v1/accounts/", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          type,
          institution: institution.trim() || undefined,
          balance: balanceCentavos,
          icon: ACCOUNT_TYPES.find((t) => t.value === type)?.icon,
        }),
      })
      reset()
      setOpen(false)
      onCreated?.()
    } catch (err: any) {
      setError(err.message || "Não foi possível criar a conta")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger render={<Button />}>
        + Nova conta
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova conta</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Nome da conta</Label>
            <Input
              placeholder="Ex: BAI - Conta Corrente"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <Label>Tipo de conta</Label>
            <Select value={type} onValueChange={(v) => { if (v) setType(v) }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.icon} {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Instituição (opcional)</Label>
            <Input
              placeholder="Ex: BAI, BFA, Multicaixa Express"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
            />
          </div>

          <div>
            <Label>Saldo inicial (Kz)</Label>
            <Input
              type="number"
              placeholder="0"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "A criar..." : "Criar conta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
