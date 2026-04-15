"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { ResponsiveDialog } from "@/components/ui/responsive-dialog"
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
import { accountsApi, type Account } from "@/lib/api/accounts"

interface Props {
  onTransferred?: () => void
}

export function TransferDialog({ onTransferred }: Props) {
  const [open, setOpen] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [fromId, setFromId] = useState("")
  const [toId, setToId] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      accountsApi.list().then(setAccounts).catch(() => {})
    }
  }, [open])

  const reset = () => {
    setFromId("")
    setToId("")
    setAmount("")
    setDescription("")
    setError("")
  }

  const handleSubmit = async () => {
    if (!fromId || !toId) {
      setError("Seleccione a conta de origem e destino")
      return
    }
    if (fromId === toId) {
      setError("As contas devem ser diferentes")
      return
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError("Introduza um valor válido")
      return
    }

    setIsSubmitting(true)
    setError("")
    try {
      const amountCentavos = Math.round(parseFloat(amount) * 100)
      await accountsApi.transfer({
        from_account_id: fromId,
        to_account_id: toId,
        amount: amountCentavos,
        description: description.trim() || undefined,
      })
      reset()
      setOpen(false)
      onTransferred?.()
    } catch (err: any) {
      setError(err.message || "Não foi possível realizar a transferência")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>↔ Transferir</Button>
      <ResponsiveDialog
        open={open}
        onOpenChange={(v) => { setOpen(v); if (!v) reset() }}
        title="Transferência entre contas"
        desktopClassName="sm:max-w-md"
      >
        {accounts.length < 2 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Precisa de pelo menos 2 contas para fazer transferências.
          </p>
        ) : (
          <div className="space-y-4 py-2">
            <div>
              <Label>De (origem)</Label>
              <Select value={fromId} onValueChange={(v) => { if (v) setFromId(v) }}>
                <SelectTrigger>
                  <SelectValue placeholder="Conta de origem" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.filter((a) => a.id !== toId).map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      <span className="flex items-center gap-1"><IconDisplay name={acc.icon} className="h-4 w-4" /> {acc.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-center text-2xl text-muted-foreground">↓</div>

            <div>
              <Label>Para (destino)</Label>
              <Select value={toId} onValueChange={(v) => { if (v) setToId(v) }}>
                <SelectTrigger>
                  <SelectValue placeholder="Conta de destino" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.filter((a) => a.id !== fromId).map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      <span className="flex items-center gap-1"><IconDisplay name={acc.icon} className="h-4 w-4" /> {acc.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Valor (Kz)</Label>
              <Input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="font-mono"
              />
            </div>

            <div>
              <Label>Descrição (opcional)</Label>
              <Input
                placeholder="Ex: Poupar para férias"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "A transferir..." : "Transferir"}
            </Button>
          </div>
        )}
      </ResponsiveDialog>
    </>
  )
}
