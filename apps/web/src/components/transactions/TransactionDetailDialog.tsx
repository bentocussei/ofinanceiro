"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { CalendarIcon, X } from "lucide-react"

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
import { categoriesApi, type Category } from "@/lib/api/categories"
import { tagsApi, type Tag } from "@/lib/api/tags"
import { transactionsApi, type Transaction } from "@/lib/api/transactions"
import { formatKz, formatRelativeDate } from "@/lib/format"

interface Props {
  transaction: Transaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
  onDeleted?: () => void
}

export function TransactionDetailDialog({
  transaction,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [editDesc, setEditDesc] = useState("")
  const [editAmount, setEditAmount] = useState("")
  const [editCategoryId, setEditCategoryId] = useState("")
  const [editMerchant, setEditMerchant] = useState("")
  const [editDate, setEditDate] = useState("")
  const [editNotes, setEditNotes] = useState("")
  const [editTags, setEditTags] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open && isEditing) {
      categoriesApi.list().then(setCategories).catch(() => {})
      tagsApi.list().then(setAvailableTags).catch(() => {})
    }
  }, [open, isEditing])

  const startEdit = () => {
    if (!transaction) return
    setEditDesc(transaction.description || "")
    setEditAmount(String(transaction.amount / 100))
    setEditCategoryId(transaction.category_id || "")
    setEditMerchant(transaction.merchant || "")
    setEditDate(transaction.transaction_date ? transaction.transaction_date.slice(0, 10) : "")
    setEditNotes(transaction.notes || "")
    setEditTags(transaction.tags || [])
    setIsEditing(true)
    setError("")
  }

  const toggleTag = (tagName: string) => {
    setEditTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    )
  }

  const handleSave = async () => {
    if (!transaction) return
    setIsSaving(true)
    setError("")
    try {
      const updates: Record<string, unknown> = {}

      const trimDesc = editDesc.trim()
      if (trimDesc !== (transaction.description || "")) {
        updates.description = trimDesc || null
      }

      const newAmount = Math.round(parseFloat(editAmount) * 100)
      if (newAmount > 0 && newAmount !== transaction.amount) {
        updates.amount = newAmount
      }

      if (editCategoryId !== (transaction.category_id || "")) {
        updates.category_id = editCategoryId || null
      }

      const trimMerchant = editMerchant.trim()
      if (trimMerchant !== (transaction.merchant || "")) {
        updates.merchant = trimMerchant || null
      }

      const dateStr = editDate.slice(0, 10)
      if (dateStr && dateStr !== (transaction.transaction_date || "").slice(0, 10)) {
        updates.transaction_date = dateStr
      }

      const trimNotes = editNotes.trim()
      if (trimNotes !== (transaction.notes || "")) {
        updates.notes = trimNotes || null
      }

      const prevTags = transaction.tags || []
      const tagsChanged =
        editTags.length !== prevTags.length ||
        editTags.some((t) => !prevTags.includes(t))
      if (tagsChanged) {
        updates.tags = editTags
      }

      if (Object.keys(updates).length > 0) {
        await transactionsApi.update(transaction.id, updates)
        toast.success("Transacção actualizada com sucesso")
      }
      setIsEditing(false)
      onUpdated?.()
    } catch (err: any) {
      setError(err.message || "Erro ao guardar")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = () => {
    if (!transaction) return
    toast("Eliminar esta transacção?", {
      description: "Esta acção não pode ser revertida.",
      action: {
        label: "Eliminar",
        onClick: async () => {
          setIsDeleting(true)
          try {
            await transactionsApi.remove(transaction.id)
            onOpenChange(false)
            onDeleted?.()
            toast.success("Transacção eliminada com sucesso")
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

  if (!transaction) return null

  const categoryName = transaction.category_name || "Sem categoria"

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setIsEditing(false) }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhe da transacção</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Type + Amount */}
          <div className="text-center py-2">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-2 ${
                transaction.type === "income"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              }`}
            >
              {transaction.type === "income" ? "Receita" : "Despesa"}
            </span>
            {isEditing ? (
              <div>
                <Label>Valor (Kz)</Label>
                <Input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="text-center font-mono text-2xl font-bold mt-1"
                />
              </div>
            ) : (
              <p className={`text-3xl font-mono font-bold ${
                transaction.type === "income" ? "text-green-500" : "text-red-500"
              }`}>
                {transaction.type === "income" ? "+" : "-"}{formatKz(transaction.amount)}
              </p>
            )}
          </div>

          {/* Transaction Date */}
          {isEditing ? (
            <div>
              <Label>Data</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="pl-9"
                />
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          ) : (
            <div>
              <Label>Data</Label>
              <p className="text-sm mt-1">{formatRelativeDate(transaction.transaction_date)}</p>
            </div>
          )}

          {/* Description */}
          <div>
            <Label>Descrição</Label>
            {isEditing ? (
              <Input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Descrição"
              />
            ) : (
              <p className="text-sm mt-1">{transaction.description || "Sem descrição"}</p>
            )}
          </div>

          {/* Merchant */}
          <div>
            <Label>Estabelecimento</Label>
            {isEditing ? (
              <Input
                value={editMerchant}
                onChange={(e) => setEditMerchant(e.target.value)}
                placeholder="Ex: Restaurante Ponto Final"
              />
            ) : (
              <p className="text-sm mt-1">{transaction.merchant || "Sem estabelecimento"}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <Label>Categoria</Label>
            {isEditing ? (
              <Select value={editCategoryId} onValueChange={(v) => setEditCategoryId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((c) => !c.parent_id && (c.type === transaction.type || c.type === "both"))
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <span className="flex items-center gap-1">
                          <IconDisplay name={cat.name} className="h-4 w-4" /> {cat.name}
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm mt-1">{categoryName}</p>
            )}
          </div>

          {/* Tags */}
          <div>
            <Label>Etiquetas</Label>
            {isEditing ? (
              <div className="flex flex-wrap gap-2 mt-1.5">
                {availableTags.length > 0 ? (
                  availableTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.name)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                        editTags.includes(tag.name)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                      {editTags.includes(tag.name) && (
                        <X className="h-3 w-3" />
                      )}
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhuma etiqueta disponível</p>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {transaction.tags && transaction.tags.length > 0 ? (
                  transaction.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Sem etiquetas</p>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label>Notas</Label>
            {isEditing ? (
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Notas adicionais..."
                rows={2}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            ) : (
              <p className="text-sm mt-1">{transaction.notes || "Sem notas"}</p>
            )}
          </div>

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
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
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
