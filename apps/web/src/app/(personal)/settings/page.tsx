"use client"

import {
  CreditCard,
  Mail,
  Phone,
  ShieldCheck,
  Tag as TagIcon,
  User,
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SecurityTab } from "@/components/settings/SecurityTab"
import { SubscriptionTab } from "@/components/settings/SubscriptionTab"
import { TagsTab } from "@/components/settings/TagsTab"
import { usersApi } from "@/lib/api/users"
import { getCurrentUser, type UserProfile } from "@/lib/auth"

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
// Profile tab (personal-only)
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
