"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Check,
  ChevronRight,
  Coins,
  CalendarDays,
  Wallet,
  PartyPopper,
  Loader2,
} from "lucide-react"

import { onboardingApi, type OnboardingStatus } from "@/lib/api/onboarding"
import { accountsApi } from "@/lib/api/accounts"
import { formatKz } from "@/lib/format"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STEPS = ["welcome", "currency", "salary_day", "first_account", "demo"] as const
type StepName = (typeof STEPS)[number]

const CURRENCIES = [
  { code: "AOA", label: "Kwanza (Kz)", flag: "AO" },
  { code: "USD", label: "Dolar Americano ($)", flag: "US" },
  { code: "EUR", label: "Euro", flag: "EU" },
]

const ACCOUNT_TYPES = [
  { value: "bank", label: "Banco" },
  { value: "cash", label: "Carteira" },
  { value: "savings", label: "Poupanca" },
]

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Step data
  const [currency, setCurrency] = useState("AOA")
  const [salaryDay, setSalaryDay] = useState(25)
  const [accountName, setAccountName] = useState("")
  const [accountType, setAccountType] = useState("bank")
  const [accountBalance, setAccountBalance] = useState("")

  // Load status
  useEffect(() => {
    onboardingApi
      .getStatus()
      .then((status: OnboardingStatus) => {
        if (status.completed) {
          router.replace("/dashboard")
          return
        }
        // Resume from first incomplete step
        const firstRemaining = status.remaining_steps[0]
        if (firstRemaining) {
          const idx = STEPS.indexOf(firstRemaining as StepName)
          if (idx >= 0) setCurrentStep(idx)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [router])

  /* ---------------------------------------------------------------- */
  /*  Step Handlers                                                     */
  /* ---------------------------------------------------------------- */

  async function completeCurrentStep() {
    setSaving(true)
    try {
      const stepName = STEPS[currentStep]

      let data: Record<string, unknown> = {}

      if (stepName === "currency") {
        data = { currency }
      } else if (stepName === "salary_day") {
        data = { salary_day: salaryDay }
      } else if (stepName === "first_account") {
        // Create the account first
        const balance = accountBalance ? Math.round(parseFloat(accountBalance) * 100) : 0
        await accountsApi.create({
          name: accountName || "Conta Principal",
          type: accountType,
          currency,
          balance,
        })
        data = { account_created: true }
      }

      const result = await onboardingApi.completeStep(stepName, data)

      if (result.completed) {
        // All done — go to dashboard
        router.replace("/dashboard")
        return
      }

      // Advance to next step
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1)
      }
    } catch {
      // Silently continue — user can retry
    } finally {
      setSaving(false)
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Loading state                                                     */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  /* ---------------------------------------------------------------- */
  /*  Progress bar                                                      */
  /* ---------------------------------------------------------------- */

  const progress = ((currentStep + 1) / STEPS.length) * 100

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Passo {currentStep + 1} de {STEPS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-1.5 rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i < currentStep
                  ? "bg-primary"
                  : i === currentStep
                  ? "bg-primary ring-2 ring-primary/30"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="rounded-xl bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)]">
        {currentStep === 0 && <StepWelcome />}
        {currentStep === 1 && (
          <StepCurrency value={currency} onChange={setCurrency} />
        )}
        {currentStep === 2 && (
          <StepSalaryDay value={salaryDay} onChange={setSalaryDay} />
        )}
        {currentStep === 3 && (
          <StepFirstAccount
            name={accountName}
            onNameChange={setAccountName}
            type={accountType}
            onTypeChange={setAccountType}
            balance={accountBalance}
            onBalanceChange={setAccountBalance}
          />
        )}
        {currentStep === 4 && <StepComplete />}

        {/* Action button */}
        <button
          onClick={completeCurrentStep}
          disabled={saving}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : currentStep === STEPS.length - 1 ? (
            <>
              Ir para o Dashboard
              <ChevronRight className="h-4 w-4" />
            </>
          ) : (
            <>
              Continuar
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Step Components                                                     */
/* ------------------------------------------------------------------ */

function StepWelcome() {
  return (
    <div className="text-center py-4">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <PartyPopper className="h-8 w-8 text-primary" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Bem-vindo ao O Financeiro!</h1>
      <p className="text-muted-foreground text-sm leading-relaxed">
        Vamos configurar a sua conta em poucos passos para que possa comecar
        a controlar as suas financas de forma inteligente.
      </p>
    </div>
  )
}

function StepCurrency({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Coins className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Moeda principal</h2>
          <p className="text-xs text-muted-foreground">
            Pode adicionar outras moedas mais tarde
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {CURRENCIES.map((c) => (
          <button
            key={c.code}
            onClick={() => onChange(c.code)}
            className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
              value === c.code
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-primary/40"
            }`}
          >
            <span>{c.label}</span>
            {value === c.code && <Check className="h-4 w-4 text-primary" />}
          </button>
        ))}
      </div>
    </div>
  )
}

function StepSalaryDay({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const commonDays = [1, 5, 10, 15, 20, 25, 28, 30]

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <CalendarDays className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Dia do salario</h2>
          <p className="text-xs text-muted-foreground">
            Ajuda a organizar os periodos de orcamento
          </p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {commonDays.map((d) => (
          <button
            key={d}
            onClick={() => onChange(d)}
            className={`rounded-lg border px-3 py-2.5 text-sm font-mono font-semibold transition-colors ${
              value === d
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-primary/40"
            }`}
          >
            {d}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Outro dia:</span>
        <input
          type="number"
          min={1}
          max={31}
          value={value}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10)
            if (v >= 1 && v <= 31) onChange(v)
          }}
          className="w-16 rounded-md border border-border bg-background px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
    </div>
  )
}

function StepFirstAccount({
  name,
  onNameChange,
  type,
  onTypeChange,
  balance,
  onBalanceChange,
}: {
  name: string
  onNameChange: (v: string) => void
  type: string
  onTypeChange: (v: string) => void
  balance: string
  onBalanceChange: (v: string) => void
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Wallet className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Primeira conta</h2>
          <p className="text-xs text-muted-foreground">
            Crie a sua primeira conta para comecar a registar transaccoes
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Nome da conta
          </label>
          <input
            type="text"
            placeholder="Ex: Conta BAI, Carteira"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Tipo
          </label>
          <div className="grid grid-cols-3 gap-2">
            {ACCOUNT_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => onTypeChange(t.value)}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  type === t.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-primary/40"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Balance */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Saldo actual (Kz)
          </label>
          <input
            type="number"
            placeholder="0"
            value={balance}
            onChange={(e) => onBalanceChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>
    </div>
  )
}

function StepComplete() {
  return (
    <div className="text-center py-4">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-income/10">
        <Check className="h-8 w-8 text-income" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Tudo pronto!</h2>
      <p className="text-muted-foreground text-sm leading-relaxed">
        A sua conta esta configurada. Agora pode comecar a registar as suas
        transaccoes, criar orcamentos e acompanhar as suas financas.
      </p>
    </div>
  )
}
