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
import { accountsApi, type Account } from "@/lib/api/accounts"
import { categoriesApi, type Category } from "@/lib/api/categories"
import { transactionsApi } from "@/lib/api/transactions"
import { tagsApi, type Tag } from "@/lib/api/tags"

interface Props {
  onCreated?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function CreateTransactionDialog({ onCreated, open: controlledOpen, onOpenChange, hideTrigger }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [type, setType] = useState<"expense" | "income">("expense")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [accountId, setAccountId] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [merchant, setMerchant] = useState("")
  const [transactionDate, setTransactionDate] = useState(todayISO())
  const [notes, setNotes] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isPrivate, setIsPrivate] = useState(false)
  const [needsReview, setNeedsReview] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      categoriesApi.list().then(setCategories).catch(() => {})
      accountsApi.list().then((data) => {
        setAccounts(data)
        if (data.length > 0 && !accountId) setAccountId(data[0].id)
      }).catch(() => {})
      tagsApi.list().then(setAvailableTags).catch(() => {})
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
    setMerchant("")
    setTransactionDate(todayISO())
    setNotes("")
    setSelectedTags([])
    setIsPrivate(false)
    setNeedsReview(false)
    setError("")
  }

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    )
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
      await transactionsApi.create({
        account_id: accountId,
        amount: amountCentavos,
        type,
        description: description.trim() || undefined,
        category_id: categoryId || undefined,
        merchant: merchant.trim() || undefined,
        transaction_date: transactionDate || undefined,
        notes: notes.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        is_private: isPrivate || undefined,
        needs_review: needsReview || undefined,
      })
      reset()
      setOpen(false)
      onCreated?.()
      toast.success("Transacção registada com sucesso")
    } catch (err: any) {
      setError(err.message || "Não foi possível registar a transacção")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      {!hideTrigger && (
        <DialogTrigger render={<Button />}>
          + Nova transacção
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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

          {/* Merchant */}
          <div>
            <Label>Estabelecimento (opcional)</Label>
            <Input
              placeholder="Ex: Restaurante Ponto Final"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
            />
          </div>

          {/* Transaction Date */}
          <div>
            <Label>Data</Label>
            <div className="relative">
              <Input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="pl-9"
              />
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
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
                  <SelectItem key={acc.id} value={acc.id} label={acc.name}>
                    <span className="flex items-center gap-1"><IconDisplay name={acc.icon} className="h-4 w-4" /> {acc.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div>
            <Label>Categoria (opcional)</Label>
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Auto-categorizar" />
              </SelectTrigger>
              <SelectContent>
                {categories
                  .filter((c) => !c.parent_id && (c.type === type || c.type === "both"))
                  .map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} label={cat.name}>
                      <span className="flex items-center gap-1"><IconDisplay name={cat.name} className="h-4 w-4" /> {cat.name}</span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          {availableTags.length > 0 && (
            <div>
              <Label>Etiquetas (opcional)</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {availableTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.name)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      selectedTags.includes(tag.name)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                    {selectedTags.includes(tag.name) && (
                      <X className="h-3 w-3" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label>Notas (opcional)</Label>
            <textarea
              placeholder="Notas adicionais sobre esta transacção..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          {/* Privacy toggles */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="rounded" />
              Privada
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={needsReview} onChange={(e) => setNeedsReview(e.target.checked)} className="rounded" />
              Necessita revisão
            </label>
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
