"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { Pencil, Trash2, RotateCcw, Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  budgetsApi,
  type Budget,
  type BudgetStatus,
  type BudgetItemStatus,
} from "@/lib/api/budgets"
import { categoriesApi, type Category } from "@/lib/api/categories"
import { formatKz } from "@/lib/format"

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

function getProgressColor(pct: number): string {
  if (pct >= 100) return "bg-red-500"
  if (pct >= 90) return "bg-orange-500"
  if (pct >= 70) return "bg-amber-500"
  return "bg-green-500"
}

function getTextColor(pct: number): string {
  if (pct >= 100) return "text-red-500"
  if (pct >= 90) return "text-orange-500"
  if (pct >= 70) return "text-amber-500"
  return "text-green-500"
}

function methodLabel(method: string): string {
  return METHOD_OPTIONS.find((o) => o.value === method)?.label || method
}

interface Props {
  item: Budget | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
  onDeleted?: () => void
  /** Pass context headers for family mode */
  contextHeaders?: Record<string, string>
}

export function BudgetDetailDialog({
  item,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
  contextHeaders,
}: Props) {
  const [status, setStatus] = useState<BudgetStatus | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState("")

  // Edit fields
  const [editName, setEditName] = useState("")
  const [editMethod, setEditMethod] = useState("category")
  const [editPeriodType, setEditPeriodType] = useState("monthly")
  const [editPeriodStart, setEditPeriodStart] = useState("")
  const [editPeriodEnd, setEditPeriodEnd] = useState("")
  const [editTotalLimit, setEditTotalLimit] = useState("")
  const [editAlertThreshold, setEditAlertThreshold] = useState("80")
  const [editAlertEnabled, setEditAlertEnabled] = useState(true)
  const [editRollover, setEditRollover] = useState(false)

  // Item management in edit mode
  const [addCategoryId, setAddCategoryId] = useState("")
  const [addCategoryLimit, setAddCategoryLimit] = useState("")
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingItemLimit, setEditingItemLimit] = useState("")
  const [itemActionLoading, setItemActionLoading] = useState(false)

  const opts = contextHeaders ? { headers: contextHeaders } : undefined

  const fetchStatus = useCallback(() => {
    if (!item) return
    budgetsApi.status(item.id, opts).then(setStatus).catch(() => {})
  }, [item, contextHeaders])

  useEffect(() => {
    if (item && open) {
      fetchStatus()
      categoriesApi.list(opts).then(setCategories).catch(() => {})
    }
    if (!open) {
      setStatus(null)
      setIsEditing(false)
      setError("")
      setAddCategoryId("")
      setAddCategoryLimit("")
      setEditingItemId(null)
    }
  }, [item, open, fetchStatus])

  const startEdit = () => {
    if (!item) return
    setEditName(item.name || "")
    setEditMethod(item.method || "category")
    setEditPeriodType(item.period_type || "monthly")
    setEditPeriodStart(item.period_start || "")
    setEditPeriodEnd(item.period_end || "")
    setEditTotalLimit(item.total_limit ? String(item.total_limit / 100) : "")
    setEditAlertThreshold(String(item.alert_threshold ?? 80))
    setEditAlertEnabled(item.alert_enabled !== false)
    setEditRollover(item.rollover || false)
    setIsEditing(true)
    setError("")
  }

  const handleSave = async () => {
    if (!item) return
    setIsSaving(true)
    setError("")
    try {
      await budgetsApi.update(item.id, {
        name: editName.trim() || undefined,
        method: editMethod,
        period_type: editPeriodType,
        period_start: editPeriodStart,
        period_end: editPeriodEnd,
        total_limit: editTotalLimit ? Math.round(parseFloat(editTotalLimit) * 100) : undefined,
        alert_threshold: parseInt(editAlertThreshold) || 80,
        alert_enabled: editAlertEnabled,
        rollover: editRollover,
      }, opts)
      setIsEditing(false)
      fetchStatus()
      onUpdated?.()
      toast.success("Orçamento actualizado")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao guardar"
      setError(msg)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = () => {
    if (!item) return
    toast("Eliminar este orçamento?", {
      description: "Esta acção não pode ser revertida.",
      action: {
        label: "Eliminar",
        onClick: async () => {
          setIsDeleting(true)
          try {
            await budgetsApi.remove(item.id, opts)
            onOpenChange(false)
            onDeleted?.()
            toast.success("Orçamento eliminado com sucesso")
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Erro ao eliminar"
            setError(msg)
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

  const handleAddItem = async () => {
    if (!item || !addCategoryId || !addCategoryLimit) return
    setItemActionLoading(true)
    try {
      await budgetsApi.addItem(item.id, {
        category_id: addCategoryId,
        limit_amount: Math.round(parseFloat(addCategoryLimit) * 100),
      }, opts)
      setAddCategoryId("")
      setAddCategoryLimit("")
      fetchStatus()
      onUpdated?.()
      toast.success("Categoria adicionada")
    } catch {
      toast.error("Erro ao adicionar categoria")
    } finally {
      setItemActionLoading(false)
    }
  }

  const handleUpdateItemLimit = async (itemId: string) => {
    if (!item || !editingItemLimit) return
    setItemActionLoading(true)
    try {
      await budgetsApi.updateItem(item.id, itemId, {
        limit_amount: Math.round(parseFloat(editingItemLimit) * 100),
      }, opts)
      setEditingItemId(null)
      setEditingItemLimit("")
      fetchStatus()
      onUpdated?.()
      toast.success("Limite actualizado")
    } catch {
      toast.error("Erro ao actualizar limite")
    } finally {
      setItemActionLoading(false)
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    if (!item) return
    setItemActionLoading(true)
    try {
      await budgetsApi.removeItem(item.id, itemId, opts)
      fetchStatus()
      onUpdated?.()
      toast.success("Categoria removida")
    } catch {
      toast.error("Erro ao remover categoria")
    } finally {
      setItemActionLoading(false)
    }
  }

  if (!item) return null

  const usedCategoryIds = status?.items.map((i) => i.category_id) || []
  const availableCategories = categories.filter(
    (c) => !usedCategoryIds.includes(c.id)
  )

  // Find the budget item ID from items array for update/remove operations
  const getItemId = (categoryId: string): string | null => {
    const budgetItem = item.items?.find(
      (i) => (i as unknown as { category_id?: string }).category_id === categoryId
    )
    // The status items might have item_id or we use category_id as fallback
    // Try to find from the budget object's items
    if (budgetItem) return budgetItem.id
    // Fallback: use the category_id as the item identifier
    return categoryId
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setIsEditing(false) }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar orçamento" : "Detalhe do orçamento"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isEditing ? (
            /* ===== EDIT MODE ===== */
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nome do orçamento"
                />
              </div>

              <div>
                <Label>Método</Label>
                <Select value={editMethod} onValueChange={(v) => { if (v) setEditMethod(v) }}>
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

              <div>
                <Label>Período</Label>
                <Select value={editPeriodType} onValueChange={(v) => { if (v) setEditPeriodType(v) }}>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Início</Label>
                  <Input
                    type="date"
                    value={editPeriodStart}
                    onChange={(e) => setEditPeriodStart(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Fim</Label>
                  <Input
                    type="date"
                    value={editPeriodEnd}
                    onChange={(e) => setEditPeriodEnd(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>Limite total (Kz)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={editTotalLimit}
                  onChange={(e) => setEditTotalLimit(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div>
                <Label>Limite de alerta (%)</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={editAlertThreshold}
                  onChange={(e) => setEditAlertThreshold(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Label className="flex-1">Alertas activados</Label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={editAlertEnabled}
                    onClick={() => setEditAlertEnabled(!editAlertEnabled)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${editAlertEnabled ? "bg-primary" : "bg-muted"}`}
                  >
                    <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${editAlertEnabled ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="flex-1">Rollover (arrastar saldo)</Label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={editRollover}
                    onClick={() => setEditRollover(!editRollover)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${editRollover ? "bg-primary" : "bg-muted"}`}
                  >
                    <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${editRollover ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ===== VIEW MODE ===== */
            <>
              {/* Header info */}
              <div className="text-center py-2">
                <h3 className="text-lg font-semibold">{item.name || "Orçamento"}</h3>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="text-xs rounded-full bg-muted px-2 py-0.5">
                    {methodLabel(item.method)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {item.period_start} - {item.period_end}
                  </span>
                </div>
              </div>

              {/* Status summary */}
              {status && (
                <>
                  <div className="text-center">
                    <div className="flex items-baseline justify-center gap-1 mb-2">
                      <span className="font-mono font-bold text-2xl">{formatKz(status.total_spent)}</span>
                      <span className="text-sm text-muted-foreground font-mono">/ {formatKz(status.total_limit || 0)}</span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full mb-1">
                      <div
                        className={`h-2.5 rounded-full ${getProgressColor(status.percentage)}`}
                        style={{ width: `${Math.min(status.percentage, 100)}%` }}
                      />
                    </div>
                    <p className={`text-sm font-semibold ${getTextColor(status.percentage)}`}>
                      {status.percentage}% utilizado
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <RotateCcw className="inline h-3 w-3 mr-1" />
                      {status.days_remaining} dias restantes
                    </p>
                  </div>

                  {/* Category breakdown */}
                  {status.items.length > 0 && (
                    <div className="space-y-3 border-t pt-3">
                      <p className="text-xs font-semibold text-muted-foreground">Por categoria</p>
                      {status.items.map((cat) => (
                        <div key={cat.category_id}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="flex items-center gap-1.5">
                              <IconDisplay name={cat.category_icon || cat.category_name} className="h-4 w-4" />
                              {cat.category_name}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">
                              {formatKz(cat.spent)} / {formatKz(cat.limit_amount)}
                            </span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full">
                            <div
                              className={`h-1.5 rounded-full ${getProgressColor(cat.percentage)}`}
                              style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {status.items.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4 border-t">
                      Sem categorias definidas. Edite o orçamento para adicionar.
                    </p>
                  )}
                </>
              )}
            </>
          )}

          {/* Item management (shown in edit mode) */}
          {isEditing && (
            <div className="border-t pt-4">
              <Label className="text-sm font-semibold">Gerir categorias</Label>

              {/* Current items from status (with edit/remove) */}
              {status && status.items.length > 0 && (
                <div className="space-y-2 mt-3">
                  {status.items.map((cat: BudgetItemStatus) => {
                    const itemId = getItemId(cat.category_id) || cat.category_id
                    const isEditingThis = editingItemId === itemId

                    return (
                      <div
                        key={cat.category_id}
                        className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2"
                      >
                        <span className="flex-1 text-sm font-medium flex items-center gap-1.5">
                          <IconDisplay name={cat.category_icon || cat.category_name} className="h-4 w-4" />
                          {cat.category_name}
                        </span>

                        {isEditingThis ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={editingItemLimit}
                              onChange={(e) => setEditingItemLimit(e.target.value)}
                              className="w-24 h-7 font-mono text-sm"
                              placeholder="Kz"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2"
                              onClick={() => handleUpdateItemLimit(itemId)}
                              disabled={itemActionLoading}
                            >
                              OK
                            </Button>
                            <button
                              type="button"
                              onClick={() => setEditingItemId(null)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono text-muted-foreground">
                              {formatKz(cat.limit_amount)}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItemId(itemId)
                                setEditingItemLimit(String(cat.limit_amount / 100))
                              }}
                              className="text-muted-foreground hover:text-blue-500 transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(itemId)}
                              disabled={itemActionLoading}
                              className="text-muted-foreground hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Add new item */}
              <div className="flex items-end gap-2 mt-3">
                <div className="flex-1">
                  <Label className="text-xs">Categoria</Label>
                  <Select value={addCategoryId} onValueChange={(v) => setAddCategoryId(v || "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar" />
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
                  disabled={!addCategoryId || !addCategoryLimit || itemActionLoading}
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {isEditing ? (
              <>
                <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "A guardar..." : "Guardar"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="flex-1" onClick={startEdit}>
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
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
