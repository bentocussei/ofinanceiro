"use client"

import { useEffect, useState } from "react"

import { apiFetch } from "@/lib/api"
import { formatKz } from "@/lib/format"

interface AccountSummary {
  total_assets: number
  total_liabilities: number
  net_worth: number
  accounts: { id: string; name: string; type: string; balance: number; icon: string | null }[]
}

interface Transaction {
  id: string
  amount: number
  type: string
  description: string | null
  transaction_date: string
}

export default function HomePage() {
  const [summary, setSummary] = useState<AccountSummary | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    apiFetch<AccountSummary>("/api/v1/accounts/summary").then(setSummary).catch(() => {})
    apiFetch<{ items: Transaction[] }>("/api/v1/transactions/?limit=5")
      .then((d) => setTransactions(d.items))
      .catch(() => {})
  }, [])

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight mb-6">Início</h2>

      {/* Balance Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card label="Saldo total" value={formatKz(summary?.net_worth ?? 0)} />
        <Card
          label="Receitas"
          value={formatKz(
            transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0)
          )}
          className="text-green-500"
        />
        <Card
          label="Despesas"
          value={formatKz(
            transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0)
          )}
          className="text-red-500"
        />
      </div>

      {/* Accounts */}
      {summary && summary.accounts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3">Contas</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {summary.accounts.map((acc) => (
              <div key={acc.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span>{acc.icon || "💰"}</span>
                  <span className="font-medium">{acc.name}</span>
                </div>
                <p className={`text-lg font-mono font-semibold ${acc.balance >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {formatKz(acc.balance)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Últimas transacções</h3>
        {transactions.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">Nenhuma transacção registada</p>
        ) : (
          <div className="rounded-lg border bg-card divide-y">
            {transactions.map((txn) => (
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
        )}
      </div>
    </div>
  )
}

function Card({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-2xl font-mono font-bold mt-1 ${className}`}>{value}</p>
    </div>
  )
}
