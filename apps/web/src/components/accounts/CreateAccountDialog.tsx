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
import { IconDisplay } from "@/components/common/IconDisplay"
import { accountsApi } from "@/lib/api/accounts"

const ACCOUNT_TYPES = [
  { value: "bank", label: "Banco" },
  { value: "digital_wallet", label: "Carteira digital" },
  { value: "cash", label: "Dinheiro" },
  { value: "savings", label: "Poupança" },
  { value: "investment", label: "Investimento" },
  { value: "credit_card", label: "Cartão de crédito" },
  { value: "loan", label: "Empréstimo" },
]

const USAGE_TYPES = [
  { value: "PERSONAL", label: "Pessoal" },
  { value: "SALARY", label: "Salário" },
  { value: "SAVINGS", label: "Poupança" },
  { value: "BUSINESS", label: "Negócio" },
  { value: "INVESTMENT", label: "Investimento" },
  { value: "JOINT", label: "Conjunta" },
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
  const [iban, setIban] = useState("")
  const [nib, setNib] = useState("")
  const [swiftCode, setSwiftCode] = useState("")
  const [accountHolder, setAccountHolder] = useState("")
  const [usageType, setUsageType] = useState("PERSONAL")
  const [creditLimit, setCreditLimit] = useState("")
  const [lowBalanceAlert, setLowBalanceAlert] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const reset = () => {
    setName("")
    setType("bank")
    setInstitution("")
    setBalance("")
    setIban("")
    setNib("")
    setSwiftCode("")
    setAccountHolder("")
    setUsageType("PERSONAL")
    setCreditLimit("")
    setLowBalanceAlert("")
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
      await accountsApi.create({
        name: name.trim(),
        type,
        institution: institution.trim() || undefined,
        balance: balanceCentavos,
        icon: type,
        iban: iban.trim() || undefined,
        nib: nib.trim() || undefined,
        swift_code: swiftCode.trim() || undefined,
        account_holder: accountHolder.trim() || undefined,
        usage_type: usageType,
        credit_limit: type === "credit_card" && creditLimit ? Math.round(parseFloat(creditLimit) * 100) : undefined,
        low_balance_alert: lowBalanceAlert ? Math.round(parseFloat(lowBalanceAlert) * 100) : undefined,
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
                    <span className="flex items-center gap-2"><IconDisplay name={t.value} className="h-4 w-4" /> {t.label}</span>
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

          <div>
            <Label>Uso da conta</Label>
            <Select value={usageType} onValueChange={(v) => { if (v) setUsageType(v) }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {USAGE_TYPES.map((u) => (
                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Titular da conta (opcional)</Label>
            <Input placeholder="Nome do titular" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} />
          </div>

          <div>
            <Label>IBAN (opcional)</Label>
            <Input placeholder="AO06..." value={iban} onChange={(e) => setIban(e.target.value)} className="font-mono" />
          </div>

          <div>
            <Label>NIB (opcional)</Label>
            <Input placeholder="0000.0000.0000.0000.0000.0" value={nib} onChange={(e) => setNib(e.target.value)} className="font-mono" />
          </div>

          <div>
            <Label>Código SWIFT (opcional)</Label>
            <Input placeholder="Ex: BAIAAOLU" value={swiftCode} onChange={(e) => setSwiftCode(e.target.value)} className="font-mono" />
          </div>

          {type === "credit_card" && (
            <div>
              <Label>Limite de crédito (Kz)</Label>
              <Input type="number" placeholder="0" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} className="font-mono" />
            </div>
          )}

          <div>
            <Label>Alerta de saldo baixo (Kz, opcional)</Label>
            <Input type="number" placeholder="0" value={lowBalanceAlert} onChange={(e) => setLowBalanceAlert(e.target.value)} className="font-mono" />
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
