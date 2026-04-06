"use client"

import { useEffect, useState } from "react"

import { Wallet } from "lucide-react"
import { MobileFAB } from "@/components/layout/MobileFAB"
import { IconDisplay } from "@/components/common/IconDisplay"
import { AccountDetailDialog } from "@/components/accounts/AccountDetailDialog"
import { CreateAccountDialog } from "@/components/accounts/CreateAccountDialog"
import { TransferDialog } from "@/components/accounts/TransferDialog"
import { accountsApi, type Account, type AccountSummary } from "@/lib/api/accounts"
import { formatKz } from "@/lib/format"

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
  const [summary, setSummary] = useState<AccountSummary | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)

  const refresh = () => accountsApi.summary().then(setSummary)

  useEffect(() => {
    accountsApi.summary().then(setSummary).catch(() => {})
  }, [])

  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Contas</h2>
        <div className="hidden md:flex gap-2">
          <TransferDialog onTransferred={() => accountsApi.summary().then(setSummary)} />
          <CreateAccountDialog onCreated={() => accountsApi.summary().then(setSummary)} />
        </div>
      </div>

      <CreateAccountDialog open={createOpen} onOpenChange={setCreateOpen} hideTrigger onCreated={() => accountsApi.summary().then(setSummary)} />
      <MobileFAB onClick={() => setCreateOpen(true)} label="Nova conta" />

      {summary && (
        <>
          {/* Summary */}
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <div className="rounded-xl bg-card p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activos</p>
              <p className="text-xl font-mono font-bold text-green-500 mt-1">
                {formatKz(summary.total_assets)}
              </p>
            </div>
            <div className="rounded-xl bg-card p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Passivos</p>
              <p className="text-xl font-mono font-bold text-red-500 mt-1">
                {formatKz(summary.total_liabilities)}
              </p>
            </div>
            <div className="rounded-xl bg-card p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Património líquido</p>
              <p className="text-xl font-mono font-bold mt-1">{formatKz(summary.net_worth)}</p>
            </div>
          </div>

          {/* Accounts List */}
          <div className="rounded-xl bg-card shadow-sm divide-y divide-border">
            {summary.accounts.map((acc) => (
              <div key={acc.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-accent/50 active:bg-accent/50 transition-colors cursor-pointer" onClick={() => setSelectedAccount(acc)}>
                <div className="flex items-center gap-3">
                  <IconDisplay name={acc.type} className="h-6 w-6" />
                  <div>
                    <p className="font-medium truncate">{acc.name}</p>
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
              <div className="text-center py-12">
                <Wallet className="h-10 w-10 mx-auto text-muted-foreground/30" />
                <p className="text-muted-foreground mt-3">Nenhuma conta criada</p>
              </div>
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
