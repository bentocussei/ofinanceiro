"use client"

import {
  Check,
  CreditCard,
  Crown,
  Gift,
  Loader2,
  Puzzle,
  Receipt,
  Star,
  Trash2,
  Wallet,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { billingApi, type PlanInfo, type SubscriptionInfo, type ModuleAddonInfo, type PaymentMethodInfo, type PaymentInfo } from "@/lib/api/billing"
import { type UserProfile } from "@/lib/auth"
import { formatKz } from "@/lib/format"

// ---------------------------------------------------------------------------
// SubscriptionTab — shared between personal and family settings
// ---------------------------------------------------------------------------

export function SubscriptionTab({ user }: { user: UserProfile | null }) {
  const [plans, setPlans] = useState<PlanInfo[]>([])
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [loadingSub, setLoadingSub] = useState(true)
  const [promoCode, setPromoCode] = useState("")
  const [applyingPromo, setApplyingPromo] = useState(false)
  const [changingPlan, setChangingPlan] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      billingApi.plans().catch(() => []),
      billingApi.subscription().catch(() => null),
    ]).then(([p, s]) => {
      setPlans(p)
      setSubscription(s)
      setLoadingSub(false)
    })
  }, [])

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "---"
    const d = new Date(dateStr)
    return d.toLocaleDateString("pt-AO", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  const statusLabel = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      active: { label: "Activo", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
      trialing: { label: "Trial", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
      cancelled: { label: "Cancelado", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
      past_due: { label: "Em atraso", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
      expired: { label: "Expirado", className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
    }
    const info = map[status] || { label: status, className: "bg-gray-100 text-gray-800" }
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${info.className}`}>
        {info.label}
      </span>
    )
  }

  const handleUpgrade = async (planId: string) => {
    setChangingPlan(planId)
    try {
      const result = await billingApi.upgrade({ plan_id: planId })
      setSubscription(result)
      toast.success("Plano alterado com sucesso!")
    } catch {
      toast.error("Erro ao alterar plano. Tente novamente.")
    } finally {
      setChangingPlan(null)
    }
  }

  const handleCancel = () => {
    toast("Tem a certeza que deseja cancelar a sua subscricao?", {
      description: "Pode reactivar a qualquer momento antes do final do periodo.",
      action: {
        label: "Cancelar subscricao",
        onClick: async () => {
          try {
            await billingApi.cancel()
            const updated = await billingApi.subscription().catch(() => null)
            setSubscription(updated)
            toast.success("Subscricao cancelada. Pode reactivar a qualquer momento.")
          } catch {
            toast.error("Erro ao cancelar subscricao.")
          }
        },
      },
      cancel: { label: "Voltar", onClick: () => {} },
    })
  }

  const handleReactivate = async () => {
    try {
      const result = await billingApi.reactivate()
      setSubscription(result)
      toast.success("Subscricao reactivada com sucesso!")
    } catch {
      toast.error("Erro ao reactivar subscricao.")
    }
  }

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return
    setApplyingPromo(true)
    try {
      const result = await billingApi.applyPromo(promoCode.trim())
      toast.success(result.message || "Codigo promocional aplicado!")
      setPromoCode("")
      // Refresh subscription to see updated price
      const updated = await billingApi.subscription().catch(() => null)
      setSubscription(updated)
    } catch {
      toast.error("Codigo promocional invalido ou expirado.")
    } finally {
      setApplyingPromo(false)
    }
  }

  if (loadingSub) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        A carregar informacoes de subscricao...
      </div>
    )
  }

  const priceDisplay = () => {
    if (!subscription) return "Sem subscricao activa"
    if (subscription.status === "trialing" && subscription.trial_end_date) {
      return `0 Kz (trial ate ${formatDate(subscription.trial_end_date)})`
    }
    const cycle = subscription.billing_cycle === "annual" ? "/ano" : "/mes"
    return `${formatKz(subscription.final_price)}${cycle}`
  }

  return (
    <div className="space-y-6">
      {/* Current subscription */}
      <section className="rounded-xl bg-card shadow-sm p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Crown className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold">Subscricao actual</h2>
            <p className="text-xs text-muted-foreground">Detalhes do seu plano</p>
          </div>
        </div>

        {subscription ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold">{subscription.plan_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tipo: {subscription.plan_type === "family" ? "Familiar" : "Pessoal"}
                  </p>
                </div>
                {statusLabel(subscription.status)}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Preco</p>
                  <p className="font-mono font-medium">{priceDisplay()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ciclo</p>
                  <p>{subscription.billing_cycle === "annual" ? "Anual" : "Mensal"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Inicio</p>
                  <p>{formatDate(subscription.start_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Proximo pagamento</p>
                  <p>{formatDate(subscription.end_date)}</p>
                </div>
                {subscription.discount_amount > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Desconto aplicado</p>
                    <p className="font-mono text-green-600">{formatKz(subscription.discount_amount)}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Renovacao automatica</p>
                  <p>{subscription.auto_renew ? "Sim" : "Nao"}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {subscription.status === "cancelled" ? (
                <Button size="sm" onClick={handleReactivate}>
                  Reactivar subscricao
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  Cancelar subscricao
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhuma subscricao activa. Escolha um plano abaixo.
            </p>
          </div>
        )}
      </section>

      {/* Available plans */}
      {plans.length > 0 && (
        <section className="rounded-xl bg-card shadow-sm p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Star className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold">Planos disponiveis</h2>
              <p className="text-xs text-muted-foreground">Escolha o plano ideal para si</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = subscription?.plan_type === plan.type
              return (
                <div
                  key={plan.id}
                  className={`rounded-lg border p-4 transition-colors ${
                    isCurrent
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-sm">{plan.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                    </div>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        <Check className="h-3 w-3" />
                        Actual
                      </span>
                    )}
                  </div>

                  <div className="mb-3">
                    <p className="font-mono text-lg font-bold">
                      {formatKz(plan.base_price_monthly)}
                      <span className="text-xs font-normal text-muted-foreground">/mes</span>
                    </p>
                    {plan.base_price_annual > 0 && (
                      <p className="text-xs text-muted-foreground">
                        ou {formatKz(plan.base_price_annual)}/ano
                      </p>
                    )}
                  </div>

                  {plan.max_family_members > 0 && (
                    <p className="text-xs text-muted-foreground mb-3">
                      Ate {plan.max_family_members} membros da familia
                      {plan.extra_member_cost > 0 && (
                        <> ({formatKz(plan.extra_member_cost)} por membro extra)</>
                      )}
                    </p>
                  )}

                  {!isCurrent && (
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={changingPlan === plan.id}
                      onClick={() => handleUpgrade(plan.id)}
                    >
                      {changingPlan === plan.id ? "A processar..." : "Mudar para este plano"}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Payment methods */}
      <PaymentMethodsSection />

      {/* Module Addons */}
      <ModuleAddonsSection subscription={subscription} onUpdate={async () => {
        const s = await billingApi.subscription().catch(() => null)
        setSubscription(s)
      }} />

      {/* Payment history */}
      <PaymentHistorySection />

      {/* Promo code */}
      <section className="rounded-xl bg-card shadow-sm p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Gift className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold">Codigo promocional</h2>
            <p className="text-xs text-muted-foreground">Aplique um codigo para obter desconto</p>
          </div>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">Codigo</Label>
            <Input
              placeholder="Ex: BEMVINDO50"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
            />
          </div>
          <Button size="sm" onClick={handleApplyPromo} disabled={applyingPromo || !promoCode.trim()}>
            {applyingPromo ? "A aplicar..." : "Aplicar"}
          </Button>
        </div>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Module Addons section (inside subscription tab)
// ---------------------------------------------------------------------------

function ModuleAddonsSection({ subscription, onUpdate }: { subscription: SubscriptionInfo | null; onUpdate: () => Promise<void> }) {
  const [addons, setAddons] = useState<ModuleAddonInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    billingApi.addons()
      .then(setAddons)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || addons.length === 0) return null

  // Determine which modules the user's plan already includes
  const planFeatures = subscription?.features || {}
  const activeAddonModules = new Set<string>() // TODO: get from subscription addons list

  const handleAdd = async (addonId: string) => {
    setProcessing(addonId)
    try {
      await billingApi.addAddon(addonId)
      toast.success("Modulo adicionado com sucesso")
      await onUpdate()
    } catch {
      toast.error("Erro ao adicionar modulo")
    }
    setProcessing(null)
  }

  const handleRemove = async (addonId: string) => {
    setProcessing(addonId)
    try {
      await billingApi.removeAddon(addonId)
      toast.success("Modulo removido")
      await onUpdate()
    } catch {
      toast.error("Erro ao remover modulo")
    }
    setProcessing(null)
  }

  return (
    <section className="rounded-xl bg-card shadow-sm p-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Puzzle className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-[15px] font-semibold">Modulos adicionais</h2>
          <p className="text-xs text-muted-foreground">Adicione modulos ao seu plano actual</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {addons.map((addon) => {
          const included = !!(planFeatures as Record<string, Record<string, unknown>>)[addon.module]?.enabled
          const isActive = activeAddonModules.has(addon.module)

          return (
            <div
              key={addon.id}
              className={`rounded-lg border p-4 ${
                included ? "border-primary/30 bg-primary/5" : isActive ? "border-green-500/30 bg-green-50 dark:bg-green-900/10" : "border-border"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold">{addon.name}</p>
                  {addon.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{addon.description}</p>
                  )}
                </div>
                {included && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    <Check className="h-3 w-3" />
                    No plano
                  </span>
                )}
              </div>

              {!included && (
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs font-mono font-semibold">
                    +{formatKz(addon.price_monthly)}/mes
                  </p>
                  {isActive ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={processing === addon.id}
                      onClick={() => handleRemove(addon.id)}
                    >
                      {processing === addon.id ? "A remover..." : "Remover"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={processing === addon.id}
                      onClick={() => handleAdd(addon.id)}
                    >
                      {processing === addon.id ? "A adicionar..." : "Adicionar"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}


// ---------------------------------------------------------------------------
// Payment Methods section
// ---------------------------------------------------------------------------

function PaymentMethodsSection() {
  const [methods, setMethods] = useState<PaymentMethodInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)
  const [settingDefault, setSettingDefault] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const loadMethods = useCallback(async () => {
    try {
      const m = await billingApi.paymentMethods()
      setMethods(m)
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMethods()
  }, [loadMethods])

  const handleRemove = async (id: string) => {
    setRemoving(id)
    try {
      await billingApi.removePaymentMethod(id)
      toast.success("Metodo de pagamento removido")
      await loadMethods()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao remover"
      toast.error(msg)
    } finally {
      setRemoving(null)
    }
  }

  const handleSetDefault = async (id: string) => {
    setSettingDefault(id)
    try {
      await billingApi.setDefaultPaymentMethod(id)
      toast.success("Metodo predefinido actualizado")
      await loadMethods()
    } catch {
      toast.error("Erro ao definir metodo predefinido")
    } finally {
      setSettingDefault(null)
    }
  }

  const handleCardAdded = async () => {
    setDialogOpen(false)
    await loadMethods()
  }

  const gatewayLabel = (gateway: string) => {
    const labels: Record<string, string> = {
      stripe: "Cartao Internacional",
      multicaixa_express: "Multicaixa Express",
      referencia_bancaria: "Referencia Bancaria",
      unitel_money: "Unitel Money",
      e_kwanza: "e-Kwanza",
      paypay: "PayPay",
    }
    return labels[gateway] || gateway
  }

  return (
    <>
      <section className="rounded-xl bg-card shadow-sm p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold">Metodos de pagamento</h2>
            <p className="text-xs text-muted-foreground">Gerir os seus metodos de pagamento</p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">A carregar...</p>
        ) : methods.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <Wallet className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              Nenhum metodo de pagamento configurado.
            </p>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              Adicionar cartao
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {methods.map((pm) => (
              <div
                key={pm.id}
                className={`flex items-center justify-between rounded-lg border p-3 ${
                  pm.is_default ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{pm.label}</p>
                    <p className="text-xs text-muted-foreground">{gatewayLabel(pm.gateway)}</p>
                  </div>
                  {pm.is_default && (
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Predefinido
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {!pm.is_default && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSetDefault(pm.id)}
                      disabled={settingDefault === pm.id}
                    >
                      {settingDefault === pm.id ? "..." : "Predefinir"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleRemove(pm.id)}
                    disabled={removing === pm.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
              Adicionar cartao
            </Button>
          </div>
        )}
      </section>

      <AddCardDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleCardAdded}
      />
    </>
  )
}


// ---------------------------------------------------------------------------
// Add Card Dialog — Stripe Elements embedded
// ---------------------------------------------------------------------------

function AddCardDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}) {
  const [step, setStep] = useState<"loading" | "ready" | "confirming" | "error">("loading")
  const [errorMsg, setErrorMsg] = useState("")
  const [stripeInstance, setStripeInstance] = useState<import("@stripe/stripe-js").Stripe | null>(null)
  const [cardElement, setCardElement] = useState<import("@stripe/stripe-js").StripeCardElement | null>(null)
  const [clientSecret, setClientSecret] = useState("")
  // Initialize Stripe + SetupIntent when dialog opens
  useEffect(() => {
    if (!open) {
      setStep("loading")
      setErrorMsg("")
      setStripeInstance(null)
      setCardElement(null)
      setClientSecret("")
      return
    }

    let cancelled = false

    const init = async () => {
      try {
        // 1. Get SetupIntent from our API
        const setup = await billingApi.createSetupIntent()
        if (cancelled) return

        // 2. Load Stripe.js
        const { loadStripe } = await import("@stripe/stripe-js")
        const stripe = await loadStripe(setup.publishable_key)
        if (cancelled || !stripe) {
          if (!cancelled) setStep("error")
          return
        }

        setStripeInstance(stripe)
        setClientSecret(setup.client_secret)
        setStep("ready")
      } catch {
        if (!cancelled) {
          setErrorMsg("Erro ao preparar o formulario de pagamento")
          setStep("error")
        }
      }
    }

    init()
    return () => { cancelled = true }
  }, [open])

  // Mount card element when Stripe is ready and container exists
  const mountCard = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || !stripeInstance || cardElement) return

      const elements = stripeInstance.elements()
      const card = elements.create("card", {
        style: {
          base: {
            fontSize: "16px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            color: "var(--color-foreground, #1a1a1a)",
            "::placeholder": { color: "var(--color-muted-foreground, #888)" },
          },
          invalid: { color: "#ef4444" },
        },
        hidePostalCode: true,
      })
      card.mount(node)
      setCardElement(card)
    },
    [stripeInstance, cardElement],
  )

  const handleConfirm = async () => {
    if (!stripeInstance || !cardElement || !clientSecret) return

    setStep("confirming")
    setErrorMsg("")

    const { error, setupIntent } = await stripeInstance.confirmCardSetup(clientSecret, {
      payment_method: { card: cardElement },
    })

    if (error) {
      setErrorMsg(error.message || "Erro ao confirmar cartao")
      setStep("ready")
      return
    }

    if (setupIntent?.payment_method) {
      try {
        await billingApi.addPaymentMethod({
          gateway: "stripe",
          payment_method_token: setupIntent.payment_method as string,
          set_as_default: true,
        })
        toast.success("Cartao adicionado com sucesso")
        onSuccess()
      } catch {
        setErrorMsg("Cartao confirmado mas erro ao guardar. Tente novamente.")
        setStep("ready")
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <span className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Adicionar cartao
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {step === "loading" && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {step === "error" && !clientSecret && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-center">
              <p className="text-sm text-destructive">{errorMsg || "Erro inesperado"}</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          )}

          {(step === "ready" || step === "confirming") && (
            <>
              <div>
                <Label className="text-xs mb-2 block">Dados do cartao</Label>
                <div
                  ref={mountCard}
                  className="rounded-md border border-input bg-background px-3 py-3 shadow-sm"
                />
              </div>

              {errorMsg && (
                <p className="text-sm text-destructive">{errorMsg}</p>
              )}

              <p className="text-xs text-muted-foreground">
                Os dados do cartao sao processados de forma segura pelo Stripe. Nunca armazenamos os dados completos do cartao.
              </p>
            </>
          )}
        </div>

        {(step === "ready" || step === "confirming") && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={step === "confirming"}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={step === "confirming"}>
              {step === "confirming" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A confirmar...
                </>
              ) : (
                "Confirmar cartao"
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}


// ---------------------------------------------------------------------------
// Payment History section
// ---------------------------------------------------------------------------

function PaymentHistorySection() {
  const [payments, setPayments] = useState<PaymentInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    billingApi.payments(10)
      .then(setPayments)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || payments.length === 0) return null

  const statusLabel = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      completed: { label: "Pago", className: "text-green-600" },
      pending: { label: "Pendente", className: "text-yellow-600" },
      processing: { label: "A processar", className: "text-blue-600" },
      failed: { label: "Falhado", className: "text-red-600" },
      refunded: { label: "Reembolsado", className: "text-gray-600" },
    }
    const info = map[status] || { label: status, className: "text-gray-600" }
    return <span className={`text-xs font-medium ${info.className}`}>{info.label}</span>
  }

  return (
    <section className="rounded-xl bg-card shadow-sm p-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Receipt className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-[15px] font-semibold">Historico de pagamentos</h2>
          <p className="text-xs text-muted-foreground">Ultimos pagamentos realizados</p>
        </div>
      </div>

      <div className="space-y-2">
        {payments.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">{p.description || "Pagamento"}</p>
              <p className="text-xs text-muted-foreground">
                {p.paid_at
                  ? new Date(p.paid_at).toLocaleDateString("pt-AO", { day: "2-digit", month: "2-digit", year: "numeric" })
                  : new Date(p.created_at).toLocaleDateString("pt-AO", { day: "2-digit", month: "2-digit", year: "numeric" })}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-semibold">{formatKz(p.amount)}</p>
              {statusLabel(p.status)}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
