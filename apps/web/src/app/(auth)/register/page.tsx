"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, CheckCircle, Gift, ArrowRight, Smartphone, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { PhoneInput } from "@/components/auth/PhoneInput"
import { OtpInput } from "@/components/auth/OtpInput"
import { register, sendOtp, verifyOtp } from "@/lib/auth"
import { billingApi, type PromoValidation, type SubscriptionInfo } from "@/lib/api/billing"

type Step = "form" | "otp" | "success"

function maskPhone(phone: string): string {
  // +244 923 456 789 → +244 9** *** *89
  if (phone.length < 6) return phone
  const prefix = phone.slice(0, 5) // +244 9
  const suffix = phone.slice(-2) // 89
  const middle = phone.slice(5, -2).replace(/\d/g, "*")
  return `${prefix}${middle}${suffix}`
}

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("form")

  // Step 1: Form state
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [countryCode, setCountryCode] = useState("AO")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  // email removido do formulário — recolhido depois no perfil se necessário
  const [hasPromoCode, setHasPromoCode] = useState(false)
  const [promoCode, setPromoCode] = useState("")
  const [promoValidation, setPromoValidation] = useState<PromoValidation | null>(null)
  const [promoError, setPromoError] = useState("")
  const [promoLoading, setPromoLoading] = useState(false)
  const [formError, setFormError] = useState("")
  const [formLoading, setFormLoading] = useState(false)

  // Step 2: OTP state
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState("")
  const [otpKey, setOtpKey] = useState(0)
  const [countdown, setCountdown] = useState(60)
  const [resending, setResending] = useState(false)

  // Step 3: Success state
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)

  // Countdown timer for OTP resend
  useEffect(() => {
    if (step !== "otp" || countdown <= 0) return
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [step, countdown])

  // ---------------------------------------------------------------
  // Promo code validation
  // ---------------------------------------------------------------
  async function validatePromoCode() {
    const code = promoCode.trim()
    if (!code) return

    setPromoLoading(true)
    setPromoError("")
    setPromoValidation(null)

    try {
      const result = await billingApi.validatePromo(code)
      setPromoValidation(result)
    } catch {
      setPromoError("Código promocional inválido ou expirado")
    } finally {
      setPromoLoading(false)
    }
  }

  // ---------------------------------------------------------------
  // Step 1: Submit registration form
  // ---------------------------------------------------------------
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")
    setFormLoading(true)

    if (!phone.trim() || !name.trim() || !password.trim()) {
      setFormError("Preencha todos os campos obrigatórios.")
      setFormLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setFormError("As senhas não coincidem.")
      setFormLoading(false)
      return
    }

    if (password.length < 6) {
      setFormError("A senha deve ter pelo menos 6 caracteres.")
      setFormLoading(false)
      return
    }

    if (hasPromoCode && promoCode.trim() && !promoValidation) {
      setFormError("Valide o código promocional antes de continuar.")
      setFormLoading(false)
      return
    }

    const validPromo = hasPromoCode && promoValidation ? promoCode.trim() : undefined

    const success = await register(phone, name, password, countryCode, undefined, validPromo)
    if (success) {
      setCountdown(60)
      setStep("otp")
      toast.success("Conta criada! Verifique o seu telefone.")
    } else {
      setFormError("Não foi possível criar a conta. Este número pode já estar registado.")
    }
    setFormLoading(false)
  }

  // ---------------------------------------------------------------
  // Step 2: OTP verification
  // ---------------------------------------------------------------
  const handleOtpComplete = useCallback(
    async (otp: string) => {
      setOtpLoading(true)
      setOtpError("")

      const success = await verifyOtp(phone, otp)
      if (success) {
        // Fetch subscription to check if promo was applied
        try {
          const sub = await billingApi.subscription()
          setSubscription(sub)
        } catch {
          // No subscription or error — that's fine
        }
        setStep("success")
        toast.success("Telefone verificado com sucesso!")
      } else {
        setOtpError("Código inválido ou expirado. Tente novamente.")
        setOtpKey((k) => k + 1) // Reset OTP input
      }
      setOtpLoading(false)
    },
    [phone],
  )

  async function handleResendOtp() {
    setResending(true)
    const success = await sendOtp(phone)
    if (success) {
      setCountdown(60)
      setOtpKey((k) => k + 1)
      setOtpError("")
      toast.success("Código reenviado por SMS.")
    } else {
      toast.error("Não foi possível reenviar. Tente novamente.")
    }
    setResending(false)
  }

  // ---------------------------------------------------------------
  // Step 3: Go to dashboard
  // ---------------------------------------------------------------
  function handleGoToDashboard() {
    router.push("/dashboard")
  }

  // ---------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      {/* Step indicators */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {(["form", "otp", "success"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                step === s
                  ? "bg-primary text-primary-foreground"
                  : (["form", "otp", "success"].indexOf(step) > i)
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {["form", "otp", "success"].indexOf(step) > i ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </div>
            {i < 2 && (
              <div
                className={`h-0.5 w-8 rounded transition-colors ${
                  ["form", "otp", "success"].indexOf(step) > i
                    ? "bg-primary/40"
                    : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* ============================================================ */}
      {/* STEP 1: Registration form                                     */}
      {/* ============================================================ */}
      {step === "form" && (
        <>
          <h2 className="mb-6 text-center text-lg font-semibold">Criar conta</h2>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="O seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label>Número de telefone</Label>
              <PhoneInput
                value={phone}
                onChange={(fullPhone, code) => {
                  setPhone(fullPhone)
                  setCountryCode(code)
                }}
                defaultCountry="AO"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar senha</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            {/* Promo code toggle */}
            <div className="flex items-center gap-3 pt-1">
              <Switch
                id="promo-toggle"
                checked={hasPromoCode}
                onCheckedChange={(checked) => {
                  setHasPromoCode(checked)
                  if (!checked) {
                    setPromoCode("")
                    setPromoValidation(null)
                    setPromoError("")
                  }
                }}
              />
              <Label htmlFor="promo-toggle" className="cursor-pointer text-sm">
                Tenho código promocional
              </Label>
            </div>

            {/* Promo code input */}
            {hasPromoCode && (
              <div className="space-y-2">
                <Label htmlFor="promo-code">Código promocional</Label>
                <div className="flex gap-2">
                  <Input
                    id="promo-code"
                    type="text"
                    placeholder="Ex: PRIMEIRO100"
                    value={promoCode}
                    onChange={(e) => {
                      setPromoCode(e.target.value.toUpperCase())
                      setPromoValidation(null)
                      setPromoError("")
                    }}
                    onBlur={validatePromoCode}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        validatePromoCode()
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={validatePromoCode}
                    disabled={promoLoading || !promoCode.trim()}
                    className="shrink-0"
                  >
                    {promoLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Validar"
                    )}
                  </Button>
                </div>

                {promoError && (
                  <p className="text-sm text-destructive">{promoError}</p>
                )}

                {promoValidation && (
                  <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3">
                    <Gift className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="text-sm">
                      <p className="font-medium text-primary">{promoValidation.name}</p>
                      <p className="text-muted-foreground">{promoValidation.description}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={formLoading}
            >
              {formLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A criar conta...
                </>
              ) : (
                "Criar conta"
              )}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </>
      )}

      {/* ============================================================ */}
      {/* STEP 2: OTP Verification                                      */}
      {/* ============================================================ */}
      {step === "otp" && (
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Smartphone className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Verifique o seu telefone</h2>
            <p className="text-sm text-muted-foreground">
              Enviámos um código de 6 dígitos para{" "}
              <strong className="text-foreground">{maskPhone(phone)}</strong>
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-center block">Código de verificação</Label>
            <OtpInput
              key={otpKey}
              disabled={otpLoading}
              onComplete={handleOtpComplete}
            />
          </div>

          {otpError && (
            <p className="text-center text-sm text-destructive">{otpError}</p>
          )}

          {otpLoading && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              A verificar...
            </div>
          )}

          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResendOtp}
              disabled={resending || countdown > 0}
            >
              {resending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A reenviar...
                </>
              ) : countdown > 0 ? (
                `Reenviar código em ${countdown}s`
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reenviar código
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 3: Success                                               */}
      {/* ============================================================ */}
      {step === "success" && (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle className="h-9 w-9 text-green-600 dark:text-green-400" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Conta criada com sucesso!</h2>

            {/* Show promo result if applicable */}
            {promoValidation && (
              <div className="mx-auto max-w-xs rounded-md border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-center justify-center gap-2">
                  <Gift className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    Código {promoCode} aplicado
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {promoValidation.description}
                </p>
              </div>
            )}

            {/* Show auto-promo if no manual code but subscription has discount */}
            {!promoValidation && subscription && (subscription.discount_amount > 0 || subscription.trial_end_date) && (
              <div className="mx-auto max-w-xs rounded-md border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-center justify-center gap-2">
                  <Gift className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    Promoção de boas-vindas aplicada!
                  </span>
                </div>
                {subscription.trial_end_date && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Plano {subscription.plan_name} grátis até{" "}
                    {new Date(subscription.trial_end_date).toLocaleDateString("pt-AO")}
                  </p>
                )}
              </div>
            )}

            {!promoValidation && !subscription && (
              <p className="text-sm text-muted-foreground">
                Tudo pronto para começar a gerir as suas finanças.
              </p>
            )}
          </div>

          <Button size="lg" className="w-full" onClick={handleGoToDashboard}>
            Ir para o dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
