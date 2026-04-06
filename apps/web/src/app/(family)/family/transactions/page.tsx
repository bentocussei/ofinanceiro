"use client"

import { useMemo, useEffect, useState } from "react"
import { Plus, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CreateTransactionDialog } from "@/components/transactions/CreateTransactionDialog"
import { TransactionDetailDialog } from "@/components/transactions/TransactionDetailDialog"
import { transactionsApi, type Transaction } from "@/lib/api/transactions"
import { formatKz, formatRelativeDate } from "@/lib/format"
import { getContextHeader } from "@/lib/context"

type ViewMode = "grouped" | "table"
type TypeFilter = "all" | "expense" | "income" | "transfer"
type PeriodFilter = "week" | "month" | "3months" | "year" | "all"

export default function FamilyTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>("grouped")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("month")
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const fetchTransactions = (reset = false) => {
    const cursorParam = reset || !cursor ? "" : `&cursor=${cursor}`
    const ctx = { headers: getContextHeader() }
    transactionsApi.list(`limit=50${cursorParam}`, ctx)
      .then((data) => {
        setTransactions((prev) => (reset ? data.items : [...prev, ...data.items]))
        setCursor(data.cursor)
        setHasMore(data.has_more)
      })
      .catch(() => {})
  }

  useEffect(() => {
    fetchTransactions(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Client-side filtering
  const filtered = useMemo(() => {
    let result = transactions

    if (typeFilter !== "all") {
      result = result.filter((t) => t.type === typeFilter)
    }

    if (periodFilter !== "all") {
      const cutoff = new Date()
      if (periodFilter === "week") cutoff.setDate(cutoff.getDate() - 7)
      else if (periodFilter === "month") cutoff.setMonth(cutoff.getMonth() - 1)
      else if (periodFilter === "3months") cutoff.setMonth(cutoff.getMonth() - 3)
      else if (periodFilter === "year") cutoff.setFullYear(cutoff.getFullYear() - 1)
      const cutoffStr = cutoff.toISOString().split("T")[0]
      result = result.filter((t) => t.transaction_date >= cutoffStr)
    }

    return result
  }, [transactions, typeFilter, periodFilter])

  // Group by date
  const grouped = filtered.reduce<Record<string, Transaction[]>>((acc, txn) => {
    const date = txn.transaction_date
    if (!acc[date]) acc[date] = []
    acc[date].push(txn)
    return acc
  }, {})

  const typeOptions: { value: TypeFilter; label: string }[] = [
    { value: "all", label: "Todas" },
    { value: "expense", label: "Despesas" },
    { value: "income", label: "Receitas" },
    { value: "transfer", label: "Transferências" },
  ]

  const periodOptions: { value: PeriodFilter; label: string }[] = [
    { value: "week", label: "7 dias" },
    { value: "month", label: "Mês" },
    { value: "3months", label: "3 meses" },
    { value: "year", label: "Ano" },
    { value: "all", label: "Tudo" },
  ]

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <h2 className="text-2xl font-bold tracking-tight">Transacções Familiares</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-lg shadow-sm overflow-hidden">
            <button
              className={`px-3 py-1.5 text-xs ${viewMode === "grouped" ? "bg-foreground text-background" : "hover:bg-accent"}`}
              onClick={() => setViewMode("grouped")}
            >
              Agrupado
            </button>
            <button
              className={`px-3 py-1.5 text-xs ${viewMode === "table" ? "bg-foreground text-background" : "hover:bg-accent"}`}
              onClick={() => setViewMode("table")}
            >
              Planilha
            </button>
          </div>
          <Button className="hidden md:inline-flex" onClick={() => setCreateOpen(true)}>+ Nova transacção</Button>
        </div>
      </div>

      <CreateTransactionDialog open={createOpen} onOpenChange={setCreateOpen} hideTrigger onCreated={() => fetchTransactions(true)} />

      {/* Filters — horizontal scroll on mobile */}
      <div className="-mx-4 px-4 md:mx-0 md:px-0 mb-4 overflow-x-auto md:overflow-visible scrollbar-hide">
        <div className="flex items-center gap-2 md:flex-wrap min-w-max md:min-w-0">
          {typeOptions.map((opt) => (
            <button
              key={opt.value}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                typeFilter === opt.value
                  ? "bg-foreground text-background border-foreground"
                  : "border-border hover:bg-accent"
              }`}
              onClick={() => setTypeFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}

          <span className="w-px h-6 bg-border shrink-0 mx-1" />

          {periodOptions.map((opt) => (
            <button
              key={opt.value}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                periodFilter === opt.value
                  ? "bg-foreground text-background border-foreground"
                  : "border-border hover:bg-accent"
              }`}
              onClick={() => setPeriodFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile FAB */}
      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        aria-label="Nova transacção"
        className="md:hidden fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus className="h-6 w-6" />
      </button>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Receipt className="h-10 w-10 mx-auto text-muted-foreground/30" />
          <p className="text-muted-foreground mt-3">
            {typeFilter !== "all" || periodFilter !== "all"
              ? "Nenhuma transacção encontrada com estes filtros"
              : "Nenhuma transacção familiar registada"}
          </p>
        </div>
      ) : viewMode === "table" ? (
        /* Table/Spreadsheet View */
        <div className="rounded-xl bg-card shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Data</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Descrição</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Membro</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Categoria</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Tipo</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((txn) => (
                <tr key={txn.id} className="hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => setSelectedTxn(txn)}>
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                    {formatRelativeDate(txn.transaction_date)}
                  </td>
                  <td className="px-4 py-2.5">
                    {txn.description || "Sem descrição"}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {txn.member_name || "--"}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {txn.category_name || "--"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        txn.type === "income"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : txn.type === "expense"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      }`}
                    >
                      {txn.type === "income" ? "Receita" : txn.type === "expense" ? "Despesa" : "Transf."}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right font-mono font-semibold ${
                      txn.type === "income" ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {txn.type === "income" ? "+" : "-"}
                    {formatKz(txn.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grouped View */
        <div className="space-y-4">
          {Object.entries(grouped)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, items]) => {
              const dayTotal = items.reduce(
                (sum, t) => sum + (t.type === "income" ? t.amount : -t.amount),
                0
              )
              return (
                <div key={date}>
                  <div className="flex items-center justify-between px-2 py-2">
                    <span className="text-sm font-semibold text-muted-foreground">
                      {formatRelativeDate(date)}
                    </span>
                    <span
                      className={`text-xs font-mono ${dayTotal >= 0 ? "text-green-500" : "text-red-500"}`}
                    >
                      {formatKz(Math.abs(dayTotal))}
                    </span>
                  </div>
                  <div className="rounded-xl bg-card shadow-sm divide-y divide-border">
                    {items.map((txn) => (
                      <div key={txn.id} className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => setSelectedTxn(txn)}>
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              txn.type === "income" ? "bg-green-500" : "bg-red-500"
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              {txn.description || "Sem descrição"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {txn.member_name && (
                                <span className="font-medium">{txn.member_name} -- </span>
                              )}
                              {txn.category_name || (txn.type === "income" ? "Receita" : "Despesa")}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`font-mono font-semibold text-sm ml-4 whitespace-nowrap shrink-0 ${
                            txn.type === "income" ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          {txn.type === "income" ? "+" : "-"}
                          {formatKz(txn.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
        </div>
      )}

      {hasMore && (
        <button
          onClick={() => fetchTransactions(false)}
          className="w-full py-3 mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Carregar mais
        </button>
      )}

      <TransactionDetailDialog
        transaction={selectedTxn}
        open={!!selectedTxn}
        onOpenChange={(v) => { if (!v) setSelectedTxn(null) }}
        onUpdated={() => { setSelectedTxn(null); fetchTransactions(true) }}
        onDeleted={() => fetchTransactions(true)}
      />
    </div>
  )
}
