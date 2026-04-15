"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"

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
import { budgetsApi, type Budget, type BudgetItemData } from "@/lib/api/budgets"
import { categoriesApi, type Category } from "@/lib/api/categories"

const METHOD_OPTIONS = [
  { value: "category", label: "Categoria" },
  { value: "50_30_20", label: "50/30/20" },
  { value: "envelope", label: "Envelope" },
  { value: "flex", label: "Flex" },
  { value: "zero_based", label: "Base zero" },
]

const PERIOD_OPTIONS = [
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quinzenal" },
  { value: "monthly", label: "Mensal" },
  { value: "custom", label: "Personalizado" },
]

interface DraftItem {
  category_id: string
  category_name: string
  limit_amount: number
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
  /** Pass context headers for family mode */
  contextHeaders?: Record<string, string>
}

function computePeriodDates(periodType: string, refDate?: Date): { start: string; end: string } {
  const now = refDate || new Date()
  let start: Date
  let end: Date

  switch (periodType) {
    case "weekly": {
      const day = now.getDay()
      const diff = day === 0 ? 6 : day - 1
      start = new Date(now)
      start.setDate(now.getDate() - diff)
      end = new Date(start)
      end.setDate(start.getDate() + 6)
      break
    }
    case "biweekly": {
      start = now.getDate() <= 15
        ? new Date(now.getFullYear(), now.getMonth(), 1)
        : new Date(now.getFullYear(), now.getMonth(), 16)
      end = now.getDate() <= 15
        ? new Date(now.getFullYear(), now.getMonth(), 15)
        : new Date(now.getFullYear(), now.getMonth() + 1, 0)
      break
    }
    case "monthly":
    default: {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      break
    }
  }
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  }
}

function autoName(periodType: string, startDate: string): string {
  const d = new Date(startDate + "T00:00:00")
  const monthName = d.toLocaleDateString("pt-AO", { month: "long" })
  const year = d.getFullYear()
  const cap = monthName.charAt(0).toUpperCase() + monthName.slice(1)
  if (periodType === "weekly" || periodType === "biweekly") {
    const day = d.getDate()
    return `${cap} ${day} - ${year}`
  }
  return `${cap} ${year}`
}

export function BudgetFormDialog({ open, onOpenChange, onSaved, contextHeaders }: Props) {
  const [name, setName] = useState("")
  const [method, setMethod] = useState("category")
  const [periodType, setPeriodType] = useState("monthly")
  const [periodStart, setPeriodStart] = useState("")
  const [periodEnd, setPeriodEnd] = useState("")
  const [totalLimit, setTotalLimit] = useState("")
  const [alertThreshold, setAlertThreshold] = useState("80")
  const [alertEnabled, setAlertEnabled] = useState(true)
  const [rollover, setRollover] = useState(false)
  const [items, setItems] = useState<DraftItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Category add sub-form
  const [addCategoryId, setAddCategoryId] = useState("")
  const [addCategoryLimit, setAddCategoryLimit] = useState("")

  const opts = contextHeaders ? { headers: contextHeaders } : undefined

  const resetForm = useCallback(() => {
    setName("")
    setMethod("category")
    setPeriodType("monthly")
    setTotalLimit("")
    setAlertThreshold("80")
    setAlertEnabled(true)
    setRollover(false)
    setItems([])
    setAddCategoryId("")
    setAddCategoryLimit("")
    const dates = computePeriodDates("monthly")
    setPeriodStart(dates.start)
    setPeriodEnd(dates.end)
  }, [])

  useEffect(() => {
    if (open) {
      resetForm()
      categoriesApi.list(opts).then(setCategories).catch(() => {})
    }
  }, [open, resetForm])

  useEffect(() => {
    if (periodType !== "custom") {
      const dates = computePeriodDates(periodType)
      setPeriodStart(dates.start)
      setPeriodEnd(dates.end)
    }
  }, [periodType])

  const handleAddItem = () => {
    if (!addCategoryId || !addCategoryLimit) return
    if (items.some((i) => i.category_id === addCategoryId)) {
      toast.error("Esta categoria já foi adicionada")
      return
    }
    const cat = categories.find((c) => c.id === addCategoryId)
    if (!cat) return
    setItems([...items, {
      category_id: addCategoryId,
      category_name: cat.name,
      limit_amount: Math.round(parseFloat(addCategoryLimit) * 100),
    }])
    setAddCategoryId("")
    setAddCategoryLimit("")
  }

  const handleRemoveItem = (categoryId: string) => {
    setItems(items.filter((i) => i.category_id !== categoryId))
  }

  const handleCreate = async () => {
    setIsSubmitting(true)
    try {
      const finalName = name.trim() || autoName(periodType, periodStart)
      const budgetItems: BudgetItemData[] = items.map((i) => ({
        category_id: i.category_id,
        limit_amount: i.limit_amount,
      }))

      await budgetsApi.create({
        name: finalName,
        method,
        period_type: periodType,
        period_start: periodStart,
        period_end: periodEnd,
        total_limit: totalLimit ? Math.round(parseFloat(totalLimit) * 100) : undefined,
        alert_threshold: parseInt(alertThreshold) || 80,
        alert_enabled: alertEnabled,
        rollover,
        items: budgetItems.length > 0 ? budgetItems : undefined,
      }, opts)

      toast.success("Orçamento criado com sucesso")
      onOpenChange(false)
      onSaved?.()
    } catch {
      toast.error("Erro ao criar orçamento")
    } finally {
      setIsSubmitting(false)
    }
  }

  const availableCategories = categories.filter(
    (c) => !items.some((i) => i.category_id === c.id)
  )

  const itemsTotal = items.reduce((sum, i) => sum + i.limit_amount, 0)

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Novo orçamento"
      desktopClassName="sm:max-w-lg"
    >
        <div className="space-y-5 py-2">
          {/* Name */}
          <div>
            <Label>Nome (opcional)</Label>
            <Input
              placeholder={autoName(periodType, periodStart)}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Se deixar vazio, será preenchido automaticamente
            </p>
          </div>

          {/* Method */}
          <div>
            <Label>Método</Label>
            <Select value={method} onValueChange={(v) => { if (v) setMethod(v) }}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period */}
          <div>
            <Label>Período</Label>
            <Select value={periodType} onValueChange={(v) => { if (v) setPeriodType(v) }}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Início</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                disabled={periodType !== "custom"}
              />
            </div>
            <div>
              <Label>Fim</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                disabled={periodType !== "custom"}
              />
            </div>
          </div>

          {/* Total limit */}
          <div>
            <Label>Limite total (Kz)</Label>
            <Input
              type="number"
              placeholder="0"
              value={totalLimit}
              onChange={(e) => setTotalLimit(e.target.value)}
              className="font-mono"
            />
          </div>

          {/* Alert threshold */}
          <div>
            <Label>Limite de alerta (%)</Label>
            <Input
              type="number"
              min="1"
              max="100"
              placeholder="80"
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(e.target.value)}
            />
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Label className="flex-1">Alertas activados</Label>
              <button
                type="button"
                role="switch"
                aria-checked={alertEnabled}
                onClick={() => setAlertEnabled(!alertEnabled)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${alertEnabled ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${alertEnabled ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <Label className="flex-1">Rollover (arrastar saldo)</Label>
              <button
                type="button"
                role="switch"
                aria-checked={rollover}
                onClick={() => setRollover(!rollover)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${rollover ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${rollover ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>
          </div>

          {/* Budget Items */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold">Categorias do orçamento</Label>
              {items.length > 0 && (
                <span className="text-xs text-muted-foreground font-mono">
                  Total: {(itemsTotal / 100).toLocaleString("pt-AO")} Kz
                </span>
              )}
            </div>

            {/* Existing items */}
            {items.length > 0 && (
              <div className="space-y-2 mb-4">
                {items.map((item) => (
                  <div
                    key={item.category_id}
                    className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2"
                  >
                    <span className="flex-1 text-sm font-medium">{item.category_name}</span>
                    <span className="text-sm font-mono text-muted-foreground">
                      {(item.limit_amount / 100).toLocaleString("pt-AO")} Kz
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.category_id)}
                      className="text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new item */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="text-xs">Categoria</Label>
                <Select value={addCategoryId} onValueChange={(v) => setAddCategoryId(v || "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-28">
                <Label className="text-xs">Limite (Kz)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={addCategoryLimit}
                  onChange={(e) => setAddCategoryLimit(e.target.value)}
                  className="font-mono"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                disabled={!addCategoryId || !addCategoryLimit}
                className="shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {items.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Adicione categorias para definir limites individuais por categoria.
              </p>
            )}
          </div>

          {/* Submit */}
          <Button className="w-full" onClick={handleCreate} disabled={isSubmitting}>
            {isSubmitting ? "A criar..." : "Criar orçamento"}
          </Button>
        </div>
    </ResponsiveDialog>
  )
}
