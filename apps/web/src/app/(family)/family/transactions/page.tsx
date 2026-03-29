"use client"

import { useEffect, useState } from "react"
import { ArrowLeftRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"
import { formatKz, formatRelativeDate } from "@/lib/format"
import { getContextHeader } from "@/lib/context"

interface Transaction {
  id: string
  amount: number
  type: string
  description: string | null
  merchant: string | null
  transaction_date: string
  member_name?: string | null
  category_name?: string | null
}

type TypeFilter = "all" | "expense" | "income" | "transfer"

export default function FamilyTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")

  const fetchTransactions = (reset = false) => {
    const cursorParam = reset || !cursor ? "" : `&cursor=${cursor}`
    apiFetch<{ items: Transaction[]; cursor: string | null; has_more: boolean }>(
      `/api/v1/transactions/?limit=50${cursorParam}`,
      { headers: getContextHeader() }
    )
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

  const filtered =
    typeFilter === "all"
      ? transactions
      : transactions.filter((t) => t.type === typeFilter)

  const grouped = filtered.reduce<Record<string, Transaction[]>>((acc, txn) => {
    const key = txn.transaction_date
    if (!acc[key]) acc[key] = []
    acc[key].push(txn)
    return acc
  }, {})

  const filterOptions: { value: TypeFilter; label: string }[] = [
    { value: "all", label: "Todas" },
    { value: "expense", label: "Despesas" },
    { value: "income", label: "Receitas" },
    { value: "transfer", label: "Transferências" },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Transacções Familiares</h2>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setTypeFilter(opt.value)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              typeFilter === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      {Object.keys(grouped).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(grouped)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, txns]) => (
              <div key={date}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {formatRelativeDate(date)}
                </p>
                <div className="rounded-xl bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] divide-y divide-border">
                  {txns.map((txn) => (
                    <div
                      key={txn.id}
                      className="flex items-center justify-between px-5 h-14 hover:bg-accent/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            txn.type === "income" ? "bg-income" : "bg-expense"
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
                        className={`text-sm font-semibold font-mono ml-4 ${
                          txn.type === "income" ? "text-income" : "text-expense"
                        }`}
                      >
                        {txn.type === "income" ? "+" : "-"}
                        {formatKz(txn.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="rounded-xl bg-card p-12 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] flex flex-col items-center text-center">
          <ArrowLeftRight className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma transacção familiar registada</p>
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center mt-6">
          <Button variant="outline" onClick={() => fetchTransactions()}>
            Carregar mais
          </Button>
        </div>
      )}
    </div>
  )
}
