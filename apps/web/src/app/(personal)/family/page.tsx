"use client"

import { Copy, LogIn, Plus, Settings, Shield, User, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { apiFetch } from "@/lib/api"

interface FamilyMember {
  id: string
  user_id: string
  role: string
  display_name: string | null
  is_active: boolean
  relation?: string | null
  can_add_transactions?: boolean
  can_edit_budgets?: boolean
  can_view_all?: boolean
  can_invite?: boolean
}

interface Family {
  id: string
  name: string
  admin_user_id: string
  invite_code: string | null
  members: FamilyMember[]
  currency?: string | null
  month_start_day?: number | null
}

const RELATION_OPTIONS = [
  { value: "SPOUSE", label: "Cônjuge" },
  { value: "FATHER", label: "Pai" },
  { value: "MOTHER", label: "Mãe" },
  { value: "SON", label: "Filho" },
  { value: "DAUGHTER", label: "Filha" },
  { value: "SIBLING", label: "Irmão/Irmã" },
  { value: "GRANDPARENT", label: "Avô/Avó" },
  { value: "OTHER", label: "Outro" },
]

const RELATION_LABELS: Record<string, string> = Object.fromEntries(RELATION_OPTIONS.map((r) => [r.value, r.label]))

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  adult: "Adulto",
  dependent: "Dependente",
}

const ROLE_ICONS: Record<string, typeof Shield> = {
  admin: Shield,
  adult: Users,
  dependent: User,
}

export default function FamilyPage() {
  const [family, setFamily] = useState<Family | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [createName, setCreateName] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [memberDetailOpen, setMemberDetailOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null)
  const [memberRelation, setMemberRelation] = useState("")
  const [memberCanAddTransactions, setMemberCanAddTransactions] = useState(false)
  const [memberCanEditBudgets, setMemberCanEditBudgets] = useState(false)
  const [memberCanViewAll, setMemberCanViewAll] = useState(false)
  const [memberCanInvite, setMemberCanInvite] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [familyCurrency, setFamilyCurrency] = useState("AOA")
  const [familyMonthStartDay, setFamilyMonthStartDay] = useState("1")

  const fetchFamily = () => {
    apiFetch<Family | null>("/api/v1/families/me").then(setFamily).catch(() => {})
  }

  useEffect(() => { fetchFamily() }, [])

  const handleCreate = async () => {
    if (!createName.trim()) return
    setIsSubmitting(true)
    try {
      await apiFetch("/api/v1/families/", {
        method: "POST",
        body: JSON.stringify({ name: createName.trim() }),
      })
      setCreateOpen(false)
      setCreateName("")
      fetchFamily()
    } catch {}
    setIsSubmitting(false)
  }

  const handleJoin = async () => {
    if (!joinCode.trim()) return
    setIsSubmitting(true)
    try {
      await apiFetch("/api/v1/families/join", {
        method: "POST",
        body: JSON.stringify({ invite_code: joinCode.trim() }),
      })
      setJoinOpen(false)
      setJoinCode("")
      fetchFamily()
    } catch {}
    setIsSubmitting(false)
  }

  const handleCopyCode = () => {
    if (family?.invite_code) {
      navigator.clipboard.writeText(family.invite_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleRemoveMember = (memberId: string) => {
    toast("Remover este membro da família?", {
      description: "Esta acção não pode ser revertida.",
      action: {
        label: "Remover",
        onClick: async () => {
          await apiFetch(`/api/v1/families/members/${memberId}`, { method: "DELETE" }).catch(() => {})
          fetchFamily()
          toast.success("Membro removido com sucesso")
        },
      },
      cancel: {
        label: "Cancelar",
        onClick: () => {},
      },
    })
  }

  const openMemberDetail = (member: FamilyMember) => {
    setSelectedMember(member)
    setMemberRelation(member.relation || "")
    setMemberCanAddTransactions(member.can_add_transactions ?? false)
    setMemberCanEditBudgets(member.can_edit_budgets ?? false)
    setMemberCanViewAll(member.can_view_all ?? false)
    setMemberCanInvite(member.can_invite ?? false)
    setMemberDetailOpen(true)
  }

  const handleSaveMemberDetail = async () => {
    if (!selectedMember) return
    try {
      await apiFetch(`/api/v1/families/members/${selectedMember.id}`, {
        method: "PUT",
        body: JSON.stringify({
          relation: memberRelation || null,
          can_add_transactions: memberCanAddTransactions,
          can_edit_budgets: memberCanEditBudgets,
          can_view_all: memberCanViewAll,
          can_invite: memberCanInvite,
        }),
      })
      setMemberDetailOpen(false)
      fetchFamily()
      toast.success("Membro actualizado com sucesso")
    } catch {
      toast.error("Erro ao actualizar membro")
    }
  }

  const openFamilySettings = () => {
    if (family) {
      setFamilyCurrency(family.currency || "AOA")
      setFamilyMonthStartDay(String(family.month_start_day || 1))
      setSettingsOpen(true)
    }
  }

  const handleSaveFamilySettings = async () => {
    if (!family) return
    try {
      await apiFetch(`/api/v1/families/${family.id}`, {
        method: "PUT",
        body: JSON.stringify({
          currency: familyCurrency,
          month_start_day: parseInt(familyMonthStartDay) || 1,
        }),
      })
      setSettingsOpen(false)
      fetchFamily()
      toast.success("Configurações da família guardadas")
    } catch {
      toast.error("Erro ao guardar configurações")
    }
  }

  const handleChangeRole = async (memberId: string, currentRole: string) => {
    const newRole = currentRole === "adult" ? "dependent" : "adult"
    await apiFetch(`/api/v1/families/members/${memberId}/role`, {
      method: "PUT",
      body: JSON.stringify({ role: newRole }),
    }).catch(() => {})
    fetchFamily()
  }

  // No family
  if (!family) {
    return (
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-6">Família</h2>
        <div className="flex flex-col items-center py-16 gap-4">
          <Users className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-lg font-semibold">Sem agregado familiar</p>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Crie um agregado familiar ou junte-se a um existente com um código de convite.
          </p>
          <div className="flex gap-3 mt-4">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger render={<Button />}>
                <Plus className="h-4 w-4 mr-2" /> Criar família
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader><DialogTitle>Criar família</DialogTitle></DialogHeader>
                <div className="space-y-4 py-2">
                  <div><Label>Nome</Label><Input placeholder="Ex: Família Silva" value={createName} onChange={(e) => setCreateName(e.target.value)} autoFocus /></div>
                  <Button className="w-full" onClick={handleCreate} disabled={isSubmitting}>{isSubmitting ? "A criar..." : "Criar"}</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
              <DialogTrigger render={<Button variant="outline" />}>
                <LogIn className="h-4 w-4 mr-2" /> Tenho um código
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader><DialogTitle>Juntar-se a uma família</DialogTitle></DialogHeader>
                <div className="space-y-4 py-2">
                  <div><Label>Código de convite</Label><Input placeholder="Cole o código aqui" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} className="font-mono" autoFocus /></div>
                  <Button className="w-full" onClick={handleJoin} disabled={isSubmitting}>{isSubmitting ? "A entrar..." : "Entrar"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    )
  }

  // Has family
  const activeMembers = family.members.filter((m) => m.is_active)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">{family.name}</h2>
        <Button variant="outline" size="sm" onClick={openFamilySettings}>
          <Settings className="h-4 w-4 mr-1" /> Configurações
        </Button>
      </div>

      {/* Invite code */}
      <div
        className="rounded-xl bg-card p-4 shadow-sm flex items-center justify-between mb-6 cursor-pointer transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
        onClick={handleCopyCode}
      >
        <div>
          <p className="text-xs text-muted-foreground">Código de convite</p>
          <p className="font-mono font-semibold">{family.invite_code}</p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          {copied ? <span className="text-xs text-green-500">Copiado</span> : null}
          <Copy className="h-4 w-4" />
        </div>
      </div>

      {/* Members */}
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{activeMembers.length} membros</p>
      <div className="rounded-xl bg-card shadow-sm divide-y divide-border">
        {activeMembers.map((member) => {
          const RoleIcon = ROLE_ICONS[member.role] || User
          return (
            <div key={member.id} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => openMemberDetail(member)}>
              <RoleIcon className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium text-sm">{member.display_name || "Membro"}</p>
                <p className="text-xs text-muted-foreground">
                  {ROLE_LABELS[member.role]}
                  {member.relation ? ` -- ${RELATION_LABELS[member.relation] || member.relation}` : ""}
                </p>
              </div>
              {member.role !== "admin" && (
                <div className="flex gap-2">
                  <button
                    className="text-xs text-blue-500 hover:text-blue-600"
                    onClick={(e) => { e.stopPropagation(); handleChangeRole(member.id, member.role) }}
                  >
                    {member.role === "adult" ? "Dependente" : "Adulto"}
                  </button>
                  <button
                    className="text-xs text-red-500 hover:text-red-600"
                    onClick={(e) => { e.stopPropagation(); handleRemoveMember(member.id) }}
                  >
                    Remover
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Member detail dialog */}
      <Dialog open={memberDetailOpen} onOpenChange={setMemberDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Detalhes do membro</DialogTitle></DialogHeader>
          {selectedMember && (
            <div className="space-y-4 py-2">
              <div className="text-center py-2">
                <p className="font-semibold">{selectedMember.display_name || "Membro"}</p>
                <p className="text-xs text-muted-foreground">{ROLE_LABELS[selectedMember.role]}</p>
              </div>

              <div>
                <Label>Relação familiar</Label>
                <Select value={memberRelation} onValueChange={(v) => setMemberRelation(v || "")}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar relação" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Não definida</SelectItem>
                    {RELATION_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 border-t pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Permissões</p>
                <div className="flex items-center gap-3">
                  <Label className="flex-1 text-sm">Pode adicionar transacções</Label>
                  <button type="button" role="switch" aria-checked={memberCanAddTransactions} onClick={() => setMemberCanAddTransactions(!memberCanAddTransactions)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${memberCanAddTransactions ? "bg-primary" : "bg-muted"}`}>
                    <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${memberCanAddTransactions ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="flex-1 text-sm">Pode editar orçamentos</Label>
                  <button type="button" role="switch" aria-checked={memberCanEditBudgets} onClick={() => setMemberCanEditBudgets(!memberCanEditBudgets)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${memberCanEditBudgets ? "bg-primary" : "bg-muted"}`}>
                    <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${memberCanEditBudgets ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="flex-1 text-sm">Pode ver tudo</Label>
                  <button type="button" role="switch" aria-checked={memberCanViewAll} onClick={() => setMemberCanViewAll(!memberCanViewAll)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${memberCanViewAll ? "bg-primary" : "bg-muted"}`}>
                    <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${memberCanViewAll ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="flex-1 text-sm">Pode convidar membros</Label>
                  <button type="button" role="switch" aria-checked={memberCanInvite} onClick={() => setMemberCanInvite(!memberCanInvite)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${memberCanInvite ? "bg-primary" : "bg-muted"}`}>
                    <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${memberCanInvite ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>
              </div>

              <Button className="w-full" onClick={handleSaveMemberDetail}>Guardar alterações</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Family settings dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Configurações da família</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Moeda</Label>
              <select
                value={familyCurrency}
                onChange={(e) => setFamilyCurrency(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
              >
                <option value="AOA">Kwanza (Kz)</option>
                <option value="USD">Dólar (USD)</option>
                <option value="EUR">Euro (EUR)</option>
              </select>
            </div>
            <div>
              <Label>Dia de início do mês</Label>
              <Input type="number" min="1" max="31" value={familyMonthStartDay} onChange={(e) => setFamilyMonthStartDay(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleSaveFamilySettings}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
