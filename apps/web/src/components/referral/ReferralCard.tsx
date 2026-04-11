"use client"

import { Copy, Gift, Share2, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { referralsApi, type ReferralStats } from "@/lib/api/referrals"

export function ReferralCard() {
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Apply referral code state
  const [friendCode, setFriendCode] = useState("")
  const [applying, setApplying] = useState(false)
  const [applyResult, setApplyResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    referralsApi
      .stats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleCopyCode() {
    if (!stats?.referral_code) return
    try {
      await navigator.clipboard.writeText(stats.referral_code)
      toast.success("Codigo copiado")
    } catch {
      toast.error("Nao foi possivel copiar")
    }
  }

  async function handleShare() {
    if (!stats?.referral_code) return
    const text = `Usa o meu codigo de convite ${stats.referral_code} no O Financeiro e ganha dias gratis! https://ofinanceiro.ao/register`
    if (navigator.share) {
      try {
        await navigator.share({ text })
      } catch {
        // user cancelled — silently ignore
      }
    } else {
      try {
        await navigator.clipboard.writeText(text)
        toast.success("Mensagem copiada para a area de transferencia")
      } catch {
        toast.error("Nao foi possivel copiar")
      }
    }
  }

  async function handleApplyCode() {
    const code = friendCode.trim().toUpperCase()
    if (!code) return
    setApplying(true)
    setApplyResult(null)
    try {
      const res = await referralsApi.apply(code)
      setApplyResult({ success: true, message: res.message || `+${res.bonus_days} dias gratis adicionados` })
      setFriendCode("")
      toast.success(res.message || "Codigo aplicado com sucesso")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao aplicar codigo"
      setApplyResult({ success: false, message: msg })
    } finally {
      setApplying(false)
    }
  }

  const maxReferrals = stats?.max_referrals ?? 12
  const totalReferrals = stats?.total_referrals ?? 0
  const bonusDays = stats?.bonus_days_earned ?? 0
  const progressPct = maxReferrals > 0 ? Math.min((totalReferrals / maxReferrals) * 100, 100) : 0

  return (
    <div className="rounded-xl bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
          <Gift className="h-4.5 w-4.5 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Convidar amigos</h3>
          <p className="text-xs text-muted-foreground">Ganha dias gratis por cada convite</p>
        </div>
      </div>

      {/* Referral Code */}
      <div className="rounded-lg bg-muted/50 px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground mb-0.5">O seu codigo</p>
          <p className="text-lg font-bold font-mono tracking-widest text-primary truncate">
            {loading ? "A carregar..." : (stats?.referral_code ?? "---")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopyCode}
            disabled={!stats?.referral_code}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background hover:bg-accent transition-colors disabled:opacity-50"
            title="Copiar codigo"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleShare}
            disabled={!stats?.referral_code}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background hover:bg-accent transition-colors disabled:opacity-50"
            title="Partilhar"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2 text-sm">
        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-muted-foreground">
          Convidaste{" "}
          <span className="font-semibold text-foreground">{totalReferrals}</span>{" "}
          {totalReferrals === 1 ? "amigo" : "amigos"}
          {bonusDays > 0 && (
            <>
              {" "}—{" "}
              <span className="font-semibold text-primary">+{bonusDays} dias gratis</span>
            </>
          )}
        </span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>{totalReferrals} de {maxReferrals} referencias usadas</span>
          <span className="font-mono">{Math.round(progressPct)}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-1.5 rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Apply friend's code */}
      <div className="border-t border-border pt-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">Usar codigo de amigo</p>
        <div className="flex gap-2">
          <Input
            value={friendCode}
            onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
            placeholder="Ex: JOAO123"
            className="font-mono text-sm h-9"
            maxLength={16}
            onKeyDown={(e) => e.key === "Enter" && handleApplyCode()}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleApplyCode}
            disabled={applying || !friendCode.trim()}
            className="shrink-0 h-9 px-4"
          >
            {applying ? "A aplicar..." : "Aplicar"}
          </Button>
        </div>
        {applyResult && (
          <p className={`mt-2 text-xs ${applyResult.success ? "text-primary" : "text-destructive"}`}>
            {applyResult.message}
          </p>
        )}
      </div>
    </div>
  )
}
