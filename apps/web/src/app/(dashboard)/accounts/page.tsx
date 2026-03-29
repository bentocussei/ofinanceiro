"use client"

import { useEffect, useState } from "react"

import { IconDisplay } from "@/components/common/IconDisplay"
import { AccountDetailDialog } from "@/components/accounts/AccountDetailDialog"
import { CreateAccountDialog } from "@/components/accounts/CreateAccountDialog"
import { TransferDialog } from "@/components/accounts/TransferDialog"
import { apiFetch } from "@/lib/api"
import { formatKz } from "@/lib/format"

interface Account {
  id: string
  name: string
  type: string
  currency: string
  balance: number
  icon: string | null
  institution: string | null
}

interface Summary {
  total_assets: number
  total_liabilities: number
  net_worth: number
  accounts: Account[]
}

const TYPE_LABELS: Record<string, string> = {
  bank: "Banco",
  digital_wallet: "Carteira digital",
  cash: "Dinheiro",
  savings: "Poupança",
  investment: "Investimento",
  credit_card: "Cartão de crédito",
  loan: "Empréstimo",
}

export default function AccountsPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)

  const refresh = () => apiFetch<Summary>("/api/v1/accounts/summary").then(setSummary)

  useEffect(() => {
    apiFetch<Summary>("/api/v1/accounts/summary").then(setSummary).catch(() => {})
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Contas</h2>
        <div className="flex gap-2">
          <TransferDialog onTransferred={() => apiFetch<Summary>("/api/v1/accounts/summary").then(setSummary)} />
          <CreateAccountDialog onCreated={() => apiFetch<Summary>("/api/v1/accounts/summary").then(setSummary)} />
        </div>
      </div>

      {summary && (
        <>
          {/* Summary */}
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Activos</p>
              <p className="text-xl font-mono font-bold text-green-500 mt-1">
                {formatKz(summary.total_assets)}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Passivos</p>
              <p className="text-xl font-mono font-bold text-red-500 mt-1">
                {formatKz(summary.total_liabilities)}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Patrimônio líquido</p>
              <p className="text-xl font-mono font-bold mt-1">{formatKz(summary.net_worth)}</p>
            </div>
          </div>

          {/* Accounts List */}
          <div className="rounded-lg border bg-card divide-y">
            {summary.accounts.map((acc) => (
              <div key={acc.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => setSelectedAccount(acc)}>
                <div className="flex items-center gap-3">
                  <IconDisplay name={acc.type} className="h-6 w-6" />
                  <div>
                    <p className="font-medium">{acc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {TYPE_LABELS[acc.type] || acc.type}
                      {acc.institution ? ` · ${acc.institution}` : ""}
                    </p>
                  </div>
                </div>
                <p
                  className={`font-mono font-semibold ${
                    acc.balance >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {formatKz(acc.balance)}
                </p>
              </div>
            ))}
            {summary.accounts.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Nenhuma conta criada</p>
            )}
          </div>
        </>
      )}

      <AccountDetailDialog
        account={selectedAccount}
        open={!!selectedAccount}
        onOpenChange={(v) => { if (!v) setSelectedAccount(null) }}
        onUpdated={() => { setSelectedAccount(null); refresh() }}
        onDeleted={() => refresh()}
      />
    </div>
  )
}
