"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangle, Settings } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiFetch } from "@/lib/api"
import { getContextHeader, setContext } from "@/lib/context"

interface Family {
  id: string
  name: string
  currency: string | null
  month_start_day: number | null
  contribution_model: string | null
}

export default function FamilySettingsPage() {
  const router = useRouter()
  const [family, setFamily] = useState<Family | null>(null)
  const [name, setName] = useState("")
  const [currency, setCurrency] = useState("AOA")
  const [monthStartDay, setMonthStartDay] = useState("1")
  const [contributionModel, setContributionModel] = useState("equal")
  const [isSaving, setIsSaving] = useState(false)

  const fetchFamily = () => {
    apiFetch<Family>("/api/v1/families/me", { headers: getContextHeader() })
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
    fetchFamily()
  }, [])

  const handleSave = async () => {
    if (!family || !name.trim()) return
    setIsSaving(true)
    try {
      await apiFetch(`/api/v1/families/${family.id}`, {
        method: "PUT",
        headers: getContextHeader(),
        body: JSON.stringify({
          name: name.trim(),
          currency,
          month_start_day: parseInt(monthStartDay) || 1,
          contribution_model: contributionModel,
        }),
      })
      toast.success("Configurações guardadas")
      fetchFamily()
    } catch {
      toast.error("Erro ao guardar configurações")
    }
    setIsSaving(false)
  }

  const handleLeaveFamily = () => {
    toast("Tem a certeza que deseja sair da família?", {
      description: "Perderá o acesso a todas as finanças partilhadas.",
      action: {
        label: "Sair",
        onClick: async () => {
          try {
            await apiFetch("/api/v1/families/leave", {
              method: "POST",
              headers: getContextHeader(),
            })
            setContext("personal")
            toast.success("Saiu da família")
            router.push("/dashboard")
          } catch {
            toast.error("Erro ao sair da família")
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
    toast("Eliminar a família permanentemente?", {
      description: "Todos os dados partilhados serão eliminados. Esta acção é irreversível.",
      action: {
        label: "Eliminar",
        onClick: async () => {
          try {
            await apiFetch(`/api/v1/families/${family.id}`, {
              method: "DELETE",
              headers: getContextHeader(),
            })
            setContext("personal")
            toast.success("Família eliminada")
            router.push("/dashboard")
          } catch {
            toast.error("Erro ao eliminar família")
          }
        },
      },
      cancel: {
        label: "Cancelar",
        onClick: () => {},
      },
    })
  }

  if (!family) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Configurações da Família</h2>
      </div>

      <div className="max-w-lg space-y-8">
        {/* General */}
        <section className="rounded-xl bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] space-y-4">
          <h3 className="font-semibold">Geral</h3>
          <div>
            <Label>Nome da família</Label>
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
              <option value="USD">Dólar (USD)</option>
              <option value="EUR">Euro (EUR)</option>
            </select>
          </div>
          <div>
            <Label>Dia de início do mês</Label>
            <Input
              type="number"
              min="1"
              max="31"
              value={monthStartDay}
              onChange={(e) => setMonthStartDay(e.target.value)}
            />
          </div>
          <div>
            <Label>Modelo de contribuição</Label>
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
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "A guardar..." : "Guardar alterações"}
          </Button>
        </section>

        {/* Danger Zone */}
        <section className="rounded-xl border border-destructive/30 bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h3 className="font-semibold text-destructive">Zona de perigo</h3>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleLeaveFamily}>
              Sair da família
            </Button>
            <Button
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
              onClick={handleDeleteFamily}
            >
              Eliminar família
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
