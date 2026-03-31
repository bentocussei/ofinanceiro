"use client"

import {
  Check,
  CreditCard,
  Crown,
  Gift,
  Lock,
  Mail,
  Phone,
  Plus,
  ShieldCheck,
  Star,
  Tag as TagIcon,
  Trash2,
  User,
  X,
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { billingApi, type PlanInfo, type SubscriptionInfo } from "@/lib/api/billing"
import { tagsApi, type Tag } from "@/lib/api/tags"
import { usersApi } from "@/lib/api/users"
import { getCurrentUser, type UserProfile } from "@/lib/auth"
import { formatKz } from "@/lib/format"

type TabId = "profile" | "subscription" | "tags" | "security"

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Perfil", icon: User },
  { id: "subscription", label: "Subscricao", icon: CreditCard },
  { id: "tags", label: "Etiquetas", icon: TagIcon },
  { id: "security", label: "Seguranca", icon: ShieldCheck },
]

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const [tab, setTab] = useState<TabId>("profile")
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCurrentUser().then((u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        A carregar...
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight mb-6">Configuracoes</h1>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {tab === "profile" && <ProfileTab user={user} />}
      {tab === "subscription" && <SubscriptionTab user={user} />}
      {tab === "tags" && <TagsTab />}
      {tab === "security" && <SecurityTab />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Profile tab
// ---------------------------------------------------------------------------

function ProfileTab({ user }: { user: UserProfile | null }) {
  const [name, setName] = useState(user?.name || "")
  const [email, setEmail] = useState(user?.email || "")
  const [currency, setCurrency] = useState(user?.currency || "AOA")
  const [salaryDay, setSalaryDay] = useState(String(user?.salary_day || 25))

  async function handleSave() {
    try {
      await usersApi.updateProfile({
        name,
        email: email || undefined,
        currency_default: currency,
        salary_day: parseInt(salaryDay, 10),
      })
      toast.success("Alteracoes guardadas com sucesso.")
    } catch {
      toast.error("Erro ao guardar. Tente novamente.")
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <section className="rounded-xl bg-card shadow-sm p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold">Perfil</h2>
            <p className="text-xs text-muted-foreground">Informacoes da sua conta</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="s-name" className="text-xs">Nome</Label>
            <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="s-phone" className="text-xs">Telefone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input id="s-phone" value={user?.phone || ""} disabled className="pl-9 opacity-60" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="s-email" className="text-xs">Email (opcional)</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="s-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="s-currency" className="text-xs">Moeda</Label>
              <select
                id="s-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
              >
                <option value="AOA">Kwanza (Kz)</option>
                <option value="USD">Dolar (USD)</option>
                <option value="EUR">Euro (EUR)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-salary" className="text-xs">Dia do salario</Label>
              <Input
                id="s-salary"
                type="number"
                min="1"
                max="31"
                value={salaryDay}
                onChange={(e) => setSalaryDay(e.target.value)}
              />
            </div>
          </div>

          <Button size="sm" onClick={handleSave}>Guardar alteracoes</Button>
        </div>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Subscription tab
// ---------------------------------------------------------------------------

function SubscriptionTab({ user }: { user: UserProfile | null }) {
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
// Tags tab
// ---------------------------------------------------------------------------

function TagsTab() {
  const [tags, setTags] = useState<Tag[]>([])
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState("#3b82f6")

  const TAG_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"]

  const fetchTags = () => {
    tagsApi.list().then(setTags).catch(() => {})
  }

  useEffect(() => {
    fetchTags()
  }, [])

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return
    try {
      await tagsApi.create({ name: newTagName.trim(), color: newTagColor })
      setNewTagName("")
      setNewTagColor("#3b82f6")
      fetchTags()
      toast.success("Etiqueta criada com sucesso")
    } catch {
      toast.error("Erro ao criar etiqueta")
    }
  }

  const handleDeleteTag = (id: string) => {
    toast("Eliminar esta etiqueta?", {
      action: {
        label: "Eliminar",
        onClick: async () => {
          await tagsApi.remove(id).catch(() => {})
          fetchTags()
          toast.success("Etiqueta eliminada")
        },
      },
      cancel: { label: "Cancelar", onClick: () => {} },
    })
  }

  return (
    <div className="max-w-lg">
      <section className="rounded-xl bg-card shadow-sm p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <TagIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold">Etiquetas</h2>
            <p className="text-xs text-muted-foreground">Organize transaccoes com etiquetas personalizadas</p>
          </div>
        </div>

        {/* Tag list */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm"
              >
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                {tag.name}
                <button onClick={() => handleDeleteTag(tag.id)} className="text-muted-foreground hover:text-red-500 ml-1">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        {tags.length === 0 && (
          <p className="text-sm text-muted-foreground mb-4">Nenhuma etiqueta criada</p>
        )}

        {/* Create tag */}
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">Nome da etiqueta</Label>
            <Input
              placeholder="Ex: Urgente"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Cor</Label>
            <div className="flex gap-1">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewTagColor(c)}
                  className={`h-8 w-8 rounded-md border-2 transition-colors ${
                    newTagColor === c ? "border-foreground" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <Button size="sm" onClick={handleCreateTag} className="shrink-0">
            <Plus className="h-4 w-4 mr-1" /> Criar
          </Button>
        </div>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Security tab
// ---------------------------------------------------------------------------

function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  async function handlePasswordChange() {
    if (newPassword !== confirmPassword) {
      toast.error("As senhas nao coincidem.")
      return
    }
    if (newPassword.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres.")
      return
    }
    try {
      await usersApi.changePassword(currentPassword, newPassword)
      toast.success("Senha alterada com sucesso.")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch {
      toast.error("Senha actual incorrecta.")
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      {/* Change password */}
      <section className="rounded-xl bg-card shadow-sm p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold">Alterar senha</h2>
            <p className="text-xs text-muted-foreground">Alterar a sua senha de acesso</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="s-current-pw" className="text-xs">Senha actual</Label>
            <Input
              id="s-current-pw"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-new-pw" className="text-xs">Nova senha</Label>
            <Input
              id="s-new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimo 8 caracteres"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-confirm-pw" className="text-xs">Confirmar nova senha</Label>
            <Input
              id="s-confirm-pw"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <Button size="sm" onClick={handlePasswordChange}>Alterar senha</Button>
        </div>
      </section>

      {/* Danger zone */}
      <section className="rounded-xl bg-card shadow-sm p-5">
        <h2 className="text-[15px] font-semibold mb-4">Zona de risco</h2>
        <button
          onClick={() => {
            toast("Tem a certeza que deseja eliminar a sua conta?", {
              description: "Esta accao e irreversivel. Os seus dados serao eliminados apos 30 dias.",
              action: {
                label: "Eliminar",
                onClick: () => {
                  toast.info("Funcionalidade disponivel em breve. Contacte o suporte para eliminar a conta.")
                },
              },
              cancel: {
                label: "Cancelar",
                onClick: () => {},
              },
            })
          }}
          className="flex w-full items-center gap-3 rounded-lg border border-destructive/30 p-3 text-sm text-destructive hover:bg-destructive/5 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          <div className="text-left">
            <p className="font-medium">Eliminar conta</p>
            <p className="text-xs text-muted-foreground">Remover permanentemente a conta e todos os dados (30 dias de graca)</p>
          </div>
        </button>
      </section>
    </div>
  )
}
