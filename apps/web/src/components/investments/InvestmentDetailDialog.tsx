"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Pencil, Trash2, TrendingUp, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { investmentsApi, type Investment } from "@/lib/api/investments"
import { formatKz } from "@/lib/format"

interface Props {
  item: Investment | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
  onDeleted?: () => void
  contextHeaders?: Record<string, string>
}

const TYPE_OPTIONS = [
  { value: "fixed_income", label: "Renda fixa" },
  { value: "stocks", label: "Acções" },
  { value: "bonds", label: "Obrigações" },
  { value: "real_estate", label: "Imobiliário" },
  { value: "mutual_fund", label: "Fundo de investimento" },
  { value: "other", label: "Outro" },
]

const TYPE_LABELS: Record<string, string> = Object.fromEntries(TYPE_OPTIONS.map((t) => [t.value, t.label]))

export function InvestmentDetailDialog({
  item,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
  contextHeaders,
}: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  // Edit form state
  const [name, setName] = useState("")
  const [type, setType] = useState("fixed_income")
  const [institution, setInstitution] = useState("")
  const [investedAmount, setInvestedAmount] = useState("")
  const [currentValue, setCurrentValue] = useState("")
  const [annualRate, setAnnualRate] = useState("")
  const [startDate, setStartDate] = useState("")
  const [maturityDate, setMaturityDate] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (item && isEditing) {
      setName(item.name)
      setType(item.type)
      setInstitution(item.institution || "")
      setInvestedAmount(String(item.invested_amount / 100))
      setCurrentValue(String(item.current_value / 100))
      setAnnualRate(String(item.annual_return_rate || ""))
      setStartDate(item.start_date || "")
      setMaturityDate(item.maturity_date || "")
      setNotes(item.notes || "")
    }
  }, [item, isEditing])

  const handleDelete = () => {
    if (!item) return
    toast(`Eliminar o investimento "${item.name}"?`, {
      description: "Esta acção não pode ser revertida.",
      action: {
        label: "Eliminar",
        onClick: async () => {
          setIsDeleting(true)
          try {
            const opts = contextHeaders ? { headers: contextHeaders } : undefined
            await investmentsApi.remove(item.id, opts)
            onOpenChange(false)
            onDeleted?.()
            toast.success("Investimento eliminado com sucesso")
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Erro ao eliminar"
            setError(message)
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

  const handleSave = async () => {
    if (!item || !name.trim()) return
    setIsSubmitting(true)
    setError("")
    try {
      const opts = contextHeaders ? { headers: contextHeaders } : undefined
      await investmentsApi.update(item.id, {
        name: name.trim(),
        type,
        institution: institution.trim() || undefined,
        invested_amount: Math.round(parseFloat(investedAmount) * 100),
        current_value: currentValue ? Math.round(parseFloat(currentValue) * 100) : undefined,
        annual_return_rate: parseFloat(annualRate) || 0,
        start_date: startDate || undefined,
        maturity_date: maturityDate || undefined,
        notes: notes.trim() || undefined,
      }, opts)
      setIsEditing(false)
      onUpdated?.()
      toast.success("Investimento actualizado com sucesso")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao actualizar"
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!item) return null

  const returnVal = item.current_value - item.invested_amount
  const returnPct = item.invested_amount > 0
    ? Math.round((returnVal / item.invested_amount) * 10000) / 100
    : 0

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setError(""); setIsEditing(false) } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <span className="flex items-center gap-2">
              <TrendingUp className={`h-5 w-5 ${returnVal >= 0 ? "text-green-500" : "text-red-500"}`} />
              {isEditing ? "Editar investimento" : item.name}
            </span>
          </DialogTitle>
        </DialogHeader>

        {isEditing ? (
          <div className="space-y-4 py-2">
            <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
            <div>
              <Label>Tipo</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div><Label>Instituição (opcional)</Label><Input placeholder="Ex: Banco BAI" value={institution} onChange={(e) => setInstitution(e.target.value)} /></div>
            <div><Label>Valor investido (Kz)</Label><Input type="number" value={investedAmount} onChange={(e) => setInvestedAmount(e.target.value)} className="font-mono" /></div>
            <div><Label>Valor actual (Kz)</Label><Input type="number" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} className="font-mono" /></div>
            <div><Label>Taxa de retorno anual (%)</Label><Input type="number" step="0.1" value={annualRate} onChange={(e) => setAnnualRate(e.target.value)} className="font-mono" /></div>
            <div><Label>Data de início (opcional)</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div><Label>Data de maturidade (opcional)</Label><Input type="date" value={maturityDate} onChange={(e) => setMaturityDate(e.target.value)} /></div>
            <div><Label>Notas (opcional)</Label><textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-1" /> Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={isSubmitting}>
                {isSubmitting ? "A guardar..." : "Guardar"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Type & institution */}
            <div className="text-center py-2">
              <p className="text-xs text-muted-foreground">{TYPE_LABELS[item.type] || item.type}</p>
              {item.institution && (
                <p className="text-xs text-muted-foreground mt-1">{item.institution}</p>
              )}
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

            {/* Dates */}
            {(item.start_date || item.maturity_date) && (
              <div className="grid grid-cols-2 gap-3 text-center text-sm text-muted-foreground">
                {item.start_date && (
                  <p>Início: {new Date(item.start_date + "T00:00:00").toLocaleDateString("pt-AO")}</p>
                )}
                {item.maturity_date && (
                  <p>Maturidade: {new Date(item.maturity_date + "T00:00:00").toLocaleDateString("pt-AO")}</p>
                )}
              </div>
            )}

            {/* Notes */}
            {item.notes && (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground mb-1">Notas</p>
                <p className="text-sm">{item.notes}</p>
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {isDeleting ? "A eliminar..." : "Eliminar"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
