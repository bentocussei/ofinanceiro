"use client"

import { useEffect, useState } from "react"

import { CreateTransactionDialog } from "@/components/transactions/CreateTransactionDialog"
import { apiFetch } from "@/lib/api"
import { formatKz, formatRelativeDate } from "@/lib/format"

interface Transaction {
  id: string
  amount: number
  type: string
  description: string | null
  merchant: string | null
  transaction_date: string
  created_at: string
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const fetchTransactions = (reset = false) => {
    const cursorParam = reset || !cursor ? "" : `&cursor=${cursor}`
    apiFetch<{ items: Transaction[]; cursor: string | null; has_more: boolean }>(
      `/api/v1/transactions/?limit=30${cursorParam}`
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
  }, [])

  // Group by date
  const grouped = transactions.reduce<Record<string, Transaction[]>>((acc, txn) => {
    const date = txn.transaction_date
    if (!acc[date]) acc[date] = []
    acc[date].push(txn)
    return acc
  }, {})

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Transacções</h2>
        <CreateTransactionDialog onCreated={() => fetchTransactions(true)} />
      </div>

      {transactions.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">
          Nenhuma transacção registada
        </p>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, items]) => {
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
                    className={`text-xs font-mono ${
                      dayTotal >= 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {formatKz(Math.abs(dayTotal))}
                  </span>
                </div>
                <div className="rounded-lg border bg-card divide-y">
                  {items.map((txn) => (
                    <div key={txn.id} className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm">{txn.description || "Sem descrição"}</span>
                      <span
                        className={`font-mono font-semibold text-sm ${
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

          {hasMore && (
            <button
              onClick={() => fetchTransactions(false)}
              className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Carregar mais
            </button>
          )}
        </div>
      )}
    </div>
  )
}
