"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  AlertTriangle,
  CreditCard,
  ShieldCheck,
  Tag as TagIcon,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SecurityTab } from "@/components/settings/SecurityTab"
import { SubscriptionTab } from "@/components/settings/SubscriptionTab"
import { TagsTab } from "@/components/settings/TagsTab"
import { familiesApi, type Family } from "@/lib/api/families"
import { getCurrentUser, type UserProfile } from "@/lib/auth"
import { getContextHeader, setContext } from "@/lib/context"

type TabId = "family" | "subscription" | "tags" | "security"

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "family", label: "Familia", icon: Users },
  { id: "subscription", label: "Subscricao", icon: CreditCard },
  { id: "tags", label: "Etiquetas", icon: TagIcon },
  { id: "security", label: "Seguranca", icon: ShieldCheck },
]

export default function FamilySettingsPage() {
  const router = useRouter()
  const [tab, setTab] = useState<TabId>("family")
  const [user, setUser] = useState<UserProfile | null>(null)
  const [family, setFamily] = useState<Family | null>(null)
  const [name, setName] = useState("")
  const [currency, setCurrency] = useState("AOA")
  const [monthStartDay, setMonthStartDay] = useState("1")
  const [contributionModel, setContributionModel] = useState("equal")
  const [isSaving, setIsSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchFamily = () => {
    const ctx = { headers: getContextHeader() }
    familiesApi.me(ctx)
      .then((f) => {
        if (f) {
          setFamily(f)
          setName(f.name)
          setCurrency(f.currency || "AOA")
          setMonthStartDay(String(f.month_start_day || 1))
          setContributionModel(f.contribution_model || "equal")
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    Promise.all([
      getCurrentUser(),
      familiesApi.me({ headers: getContextHeader() }).catch(() => null),
    ]).then(([u, f]) => {
      setUser(u)
      if (f) {
        setFamily(f)
        setName(f.name)
        setCurrency(f.currency || "AOA")
        setMonthStartDay(String(f.month_start_day || 1))
        setContributionModel(f.contribution_model || "equal")
      }
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    if (!family || !name.trim()) return
    setIsSaving(true)
    try {
      const ctx = { headers: getContextHeader() }
      await familiesApi.update(family.id, {
        name: name.trim(),
        currency,
        month_start_day: parseInt(monthStartDay) || 1,
        contribution_model: contributionModel,
      }, ctx)
      toast.success("Configuracoes guardadas")
      fetchFamily()
    } catch {
      toast.error("Erro ao guardar configuracoes")
    }
    setIsSaving(false)
  }

  const handleLeaveFamily = () => {
    toast("Tem a certeza que deseja sair da familia?", {
      description: "Perdera o acesso a todas as financas partilhadas.",
      action: {
        label: "Sair",
        onClick: async () => {
          try {
            const ctx = { headers: getContextHeader() }
            await familiesApi.leave(ctx)
            setContext("personal")
            toast.success("Saiu da familia")
            router.push("/dashboard")
          } catch {
            toast.error("Erro ao sair da familia")
          }
        },
      },
      cancel: {
        label: "Cancelar",
        onClick: () => {},
      },
    })
  }

  const handleDeleteFamily = () => {
    if (!family) return
    toast("Eliminar a familia permanentemente?", {
      description: "Todos os dados partilhados serao eliminados. Esta accao e irreversivel.",
      action: {
        label: "Eliminar",
        onClick: async () => {
          try {
            const ctx = { headers: getContextHeader() }
            await familiesApi.remove(family.id, ctx)
            setContext("personal")
            toast.success("Familia eliminada")
            router.push("/dashboard")
          } catch {
            toast.error("Erro ao eliminar familia")
          }
        },
      },
      cancel: {
        label: "Cancelar",
        onClick: () => {},
      },
    })
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        A carregar...
      </div>
    )
  }

  if (!family) return null

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight mb-6">Configuracoes da Familia</h1>

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
      {tab === "family" && (
        <FamilyTab
          name={name}
          setName={setName}
          currency={currency}
          setCurrency={setCurrency}
          monthStartDay={monthStartDay}
          setMonthStartDay={setMonthStartDay}
          contributionModel={contributionModel}
          setContributionModel={setContributionModel}
          isSaving={isSaving}
          onSave={handleSave}
          onLeave={handleLeaveFamily}
          onDelete={handleDeleteFamily}
        />
      )}
      {tab === "subscription" && <SubscriptionTab user={user} />}
      {tab === "tags" && <TagsTab />}
      {tab === "security" && <SecurityTab />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Family tab (family-specific settings)
// ---------------------------------------------------------------------------

function FamilyTab({
  name,
  setName,
  currency,
  setCurrency,
  monthStartDay,
  setMonthStartDay,
  contributionModel,
  setContributionModel,
  isSaving,
  onSave,
  onLeave,
  onDelete,
}: {
  name: string
  setName: (v: string) => void
  currency: string
  setCurrency: (v: string) => void
  monthStartDay: string
  setMonthStartDay: (v: string) => void
  contributionModel: string
  setContributionModel: (v: string) => void
  isSaving: boolean
  onSave: () => void
  onLeave: () => void
  onDelete: () => void
}) {
  return (
    <div className="max-w-lg space-y-8">
      {/* General */}
      <section className="rounded-xl bg-card p-5 shadow-sm space-y-4">
        <h3 className="font-semibold">Geral</h3>
        <div>
          <Label>Nome da familia</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Moeda</Label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
          >
            <option value="AOA">Kwanza (Kz)</option>
            <option value="USD">Dolar (USD)</option>
            <option value="EUR">Euro (EUR)</option>
          </select>
        </div>
        <div>
          <Label>Dia de inicio do mes</Label>
          <Input
            type="number"
            min="1"
            max="31"
            value={monthStartDay}
            onChange={(e) => setMonthStartDay(e.target.value)}
          />
        </div>
        <div>
          <Label>Modelo de contribuicao</Label>
          <select
            value={contributionModel}
            onChange={(e) => setContributionModel(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
          >
            <option value="equal">Igual para todos</option>
            <option value="proportional">Proporcional ao rendimento</option>
            <option value="custom">Personalizado</option>
          </select>
        </div>
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? "A guardar..." : "Guardar alteracoes"}
        </Button>
      </section>

      {/* Danger Zone */}
      <section className="rounded-xl border border-destructive/30 bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <h3 className="font-semibold text-destructive">Zona de perigo</h3>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onLeave}>
            Sair da familia
          </Button>
          <Button
            variant="outline"
            className="border-destructive/50 text-destructive hover:bg-destructive/10"
            onClick={onDelete}
          >
            Eliminar familia
          </Button>
        </div>
      </section>
    </div>
  )
}
