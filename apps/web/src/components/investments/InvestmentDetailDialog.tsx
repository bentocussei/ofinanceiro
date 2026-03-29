"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Trash2, TrendingUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { apiFetch } from "@/lib/api"
import { formatKz } from "@/lib/format"

interface Investment {
  id: string
  name: string
  type: string
  invested_amount: number
  current_value: number
  annual_return_rate: number
  start_date: string
  status: string
}

interface Props {
  item: Investment | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
  onDeleted?: () => void
}

const TYPE_LABELS: Record<string, string> = {
  fixed_income: "Renda fixa",
  stocks: "Accoes",
  bonds: "Obrigacoes",
  real_estate: "Imobiliario",
  mutual_fund: "Fundo de investimento",
  other: "Outro",
}

export function InvestmentDetailDialog({
  item,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: Props) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState("")

  const handleDelete = () => {
    if (!item) return
    toast(`Eliminar o investimento "${item.name}"?`, {
      description: "Esta acção não pode ser revertida.",
      action: {
        label: "Eliminar",
        onClick: async () => {
          setIsDeleting(true)
          try {
            await apiFetch(`/api/v1/investments/${item.id}`, { method: "DELETE" })
            onOpenChange(false)
            onDeleted?.()
            toast.success("Investimento eliminado com sucesso")
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

  const returnVal = item.current_value - item.invested_amount
  const returnPct = item.invested_amount > 0
    ? Math.round((returnVal / item.invested_amount) * 10000) / 100
    : 0

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setError("") }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <span className="flex items-center gap-2">
              <TrendingUp className={`h-5 w-5 ${returnVal >= 0 ? "text-green-500" : "text-red-500"}`} />
              {item.name}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Type */}
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground">{TYPE_LABELS[item.type] || item.type}</p>
            {item.annual_return_rate > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{item.annual_return_rate}% a.a.</p>
            )}
          </div>

          {/* Values */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-xs text-muted-foreground">Investido</p>
              <p className="font-mono font-bold">{formatKz(item.invested_amount)}</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-xs text-muted-foreground">Valor actual</p>
              <p className="font-mono font-bold">{formatKz(item.current_value)}</p>
            </div>
          </div>

          {/* Return */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Retorno</p>
            <p className={`text-2xl font-mono font-bold ${returnVal >= 0 ? "text-green-500" : "text-red-500"}`}>
              {returnVal >= 0 ? "+" : ""}{formatKz(returnVal)}
            </p>
            <p className={`text-sm font-mono ${returnVal >= 0 ? "text-green-500" : "text-red-500"}`}>
              ({returnPct}%)
            </p>
          </div>

          {/* Start date */}
          {item.start_date && (
            <p className="text-sm text-muted-foreground text-center">
              Inicio: {new Date(item.start_date + "T00:00:00").toLocaleDateString("pt-AO")}
            </p>
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
              {isDeleting ? "A eliminar..." : "Eliminar investimento"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
