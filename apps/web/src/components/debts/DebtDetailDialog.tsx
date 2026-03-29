"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Trash2, Banknote, CreditCard } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiFetch } from "@/lib/api"
import { formatKz } from "@/lib/format"

interface Debt {
  id: string
  name: string
  type: string
  original_amount: number
  remaining_balance: number
  interest_rate: number
  minimum_payment: number
  due_day: number
  status: string
}

interface Props {
  item: Debt | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
  onDeleted?: () => void
}

const TYPE_LABELS: Record<string, string> = {
  personal_loan: "Empréstimo pessoal",
  mortgage: "Hipoteca",
  credit_card: "Cartão de crédito",
  auto_loan: "Empréstimo auto",
  other: "Outro",
}

export function DebtDetailDialog({
  item,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: Props) {
  const [payAmount, setPayAmount] = useState("")
  const [isPaying, setIsPaying] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState("")

  const handlePay = async () => {
    if (!item || !payAmount) return
    setIsPaying(true)
    setError("")
    try {
      await apiFetch(`/api/v1/debts/${item.id}/pay`, {
        method: "POST",
        body: JSON.stringify({ amount: Math.round(parseFloat(payAmount) * 100) }),
      })
      setPayAmount("")
      onUpdated?.()
    } catch (err: any) {
      setError(err.message || "Erro ao registar pagamento")
    } finally {
      setIsPaying(false)
    }
  }

  const handleDelete = () => {
    if (!item) return
    toast(`Eliminar a dívida "${item.name}"?`, {
      description: "Esta acção não pode ser revertida.",
      action: {
        label: "Eliminar",
        onClick: async () => {
          setIsDeleting(true)
          try {
            await apiFetch(`/api/v1/debts/${item.id}`, { method: "DELETE" })
            onOpenChange(false)
            onDeleted?.()
            toast.success("Dívida eliminada com sucesso")
          } catch (err: any) {
            setError(err.message || "Erro ao eliminar")
          } finally {
            setIsDeleting(false)
          }
        },
      },
      cancel: {
        label: "Cancelar",
        onClick: () => {},
      },
    })
  }

  if (!item) return null

  const pct = item.original_amount > 0
    ? Math.round((1 - item.remaining_balance / item.original_amount) * 100)
    : 0
  const isPaidOff = item.status === "paid_off"

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setPayAmount(""); setError("") } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <span className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {item.name}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Type + Status */}
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground">{TYPE_LABELS[item.type] || item.type}</p>
            {isPaidOff && <span className="text-xs text-green-500 font-semibold">Quitada</span>}
          </div>

          {/* Balance */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Saldo devedor</p>
            <p className="text-3xl font-mono font-bold text-red-500">{formatKz(item.remaining_balance)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              de {formatKz(item.original_amount)} original
            </p>
          </div>

          {/* Progress */}
          <div>
            <div className="h-2 bg-muted rounded-full mb-1">
              <div className="h-2 rounded-full bg-green-500" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground text-center">{pct}% pago</p>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-xs text-muted-foreground">Taxa de juros</p>
              <p className="font-mono font-bold">{item.interest_rate}%</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-xs text-muted-foreground">Pagamento mínimo</p>
              <p className="font-mono font-bold text-sm">{formatKz(item.minimum_payment)}</p>
            </div>
          </div>

          {item.due_day > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              Vencimento: dia {item.due_day} de cada mês
            </p>
          )}

          {/* Register payment */}
          {!isPaidOff && (
            <div className="border-t pt-3">
              <Label>Registar pagamento (Kz)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  placeholder="0"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="font-mono"
                />
                <Button onClick={handlePay} disabled={isPaying || !payAmount}>
                  <Banknote className="h-4 w-4 mr-1" />
                  {isPaying ? "..." : "Pagar"}
                </Button>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Delete */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {isDeleting ? "A eliminar..." : "Eliminar dívida"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
