"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Lock, Smartphone } from "lucide-react"
import { getContext } from "@/lib/context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PhoneInput } from "@/components/auth/PhoneInput"
import { OtpInput } from "@/components/auth/OtpInput"
import { login, sendOtp, verifyOtp } from "@/lib/auth"

type LoginMethod = "password" | "otp"
type Step = "form" | "otp"

export default function LoginPage() {
  const router = useRouter()
  const [method, setMethod] = useState<LoginMethod>("password")
  const [step, setStep] = useState<Step>("form")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // Countdown for OTP resend
  function startCountdown() {
    setCountdown(60)
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  // --- Password login ---
  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!phone.trim() || !password.trim()) {
      setError("Preencha todos os campos.")
      return
    }
    setLoading(true)
    const success = await login(phone, password)
    if (success) {
      router.push(getContext() === "personal" ? "/dashboard" : "/family/dashboard")
    } else {
      setError("Número de telefone ou senha incorrectos.")
      setLoading(false)
    }
  }

  // --- OTP: send code ---
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!phone.trim()) {
      setError("Introduza o número de telefone.")
      return
    }
    setLoading(true)
    const sent = await sendOtp(phone)
    if (sent) {
      setStep("otp")
      startCountdown()
    } else {
      setError("Erro ao enviar código. Tente novamente.")
    }
    setLoading(false)
  }

  // --- OTP: verify code ---
  async function handleVerifyOtp(otp: string) {
    setError("")
    setLoading(true)
    const success = await verifyOtp(phone, otp)
    if (success) {
      router.push(getContext() === "personal" ? "/dashboard" : "/family/dashboard")
    } else {
      setError("Código inválido ou expirado.")
      setLoading(false)
    }
  }

  // --- OTP: resend ---
  async function handleResend() {
    setError("")
    const sent = await sendOtp(phone)
    if (sent) {
      startCountdown()
    } else {
      setError("Erro ao reenviar código.")
    }
  }

  // Masked phone for OTP step
  const maskedPhone = phone.length > 6
    ? phone.slice(0, 4) + " " + "*".repeat(phone.length - 6) + " " + phone.slice(-2)
    : phone

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm w-full max-w-sm">
      <h2 className="mb-6 text-center text-lg font-semibold">Entrar</h2>

      {/* Method selector */}
      {step === "form" && (
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => { setMethod("password"); setError("") }}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              method === "password"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            Com senha
          </button>
          <button
            type="button"
            onClick={() => { setMethod("otp"); setError("") }}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              method === "otp"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            Com código SMS
          </button>
        </div>
      )}

      {/* Step: Form (password or OTP send) */}
      {step === "form" && (
        <form onSubmit={method === "password" ? handlePasswordLogin : handleSendOtp} className="space-y-4">
          <div className="space-y-2">
            <Label>Número de telefone</Label>
            <PhoneInput
              value={phone}
              onChange={(fullPhone) => setPhone(fullPhone)}
              defaultCountry="AO"
            />
          </div>

          {method === "password" && (
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="A sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading
              ? "A processar..."
              : method === "password"
                ? "Entrar"
                : "Enviar código SMS"
            }
          </Button>
        </form>
      )}

      {/* Step: OTP verification */}
      {step === "otp" && (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Enviámos um código para
            </p>
            <p className="font-mono text-sm font-semibold mt-1">{maskedPhone}</p>
          </div>

          <OtpInput onComplete={handleVerifyOtp} />

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          {loading && (
            <p className="text-sm text-muted-foreground text-center">A verificar...</p>
          )}

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => { setStep("form"); setError(""); setLoading(false) }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={countdown > 0}
              className={`transition-colors ${
                countdown > 0
                  ? "text-muted-foreground cursor-not-allowed"
                  : "text-primary hover:text-primary/80"
              }`}
            >
              {countdown > 0 ? `Reenviar em ${countdown}s` : "Reenviar código"}
            </button>
          </div>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Não tem conta?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  )
}
