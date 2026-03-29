"use client"

import { Copy, LogIn, Plus, Shield, User, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiFetch } from "@/lib/api"
import { getContextHeader } from "@/lib/context"

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

const RELATION_LABELS: Record<string, string> = Object.fromEntries(
  RELATION_OPTIONS.map((r) => [r.value, r.label])
)

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

export default function FamilyMembersPage() {
  const [family, setFamily] = useState<Family | null>(null)
  const [copied, setCopied] = useState(false)
  const [memberDetailOpen, setMemberDetailOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null)
  const [memberRelation, setMemberRelation] = useState("")
  const [memberCanAddTransactions, setMemberCanAddTransactions] = useState(false)
  const [memberCanEditBudgets, setMemberCanEditBudgets] = useState(false)
  const [memberCanViewAll, setMemberCanViewAll] = useState(false)
  const [memberCanInvite, setMemberCanInvite] = useState(false)

  const fetchFamily = () => {
    apiFetch<Family | null>("/api/v1/families/me", { headers: getContextHeader() })
      .then(setFamily)
      .catch(() => {})
  }

  useEffect(() => {
    fetchFamily()
  }, [])

  const handleCopyCode = () => {
    if (family?.invite_code) {
      navigator.clipboard.writeText(family.invite_code)
      setCopied(true)
      toast.success("Código copiado")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleRemoveMember = (memberId: string) => {
    toast("Remover este membro da família?", {
      description: "Esta acção não pode ser revertida.",
      action: {
        label: "Remover",
        onClick: async () => {
          await apiFetch(`/api/v1/families/members/${memberId}`, {
            method: "DELETE",
            headers: getContextHeader(),
          }).catch(() => {})
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
        headers: getContextHeader(),
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

  const handleChangeRole = async (memberId: string, currentRole: string) => {
    const newRole = currentRole === "adult" ? "dependent" : "adult"
    await apiFetch(`/api/v1/families/members/${memberId}/role`, {
      method: "PUT",
      headers: getContextHeader(),
      body: JSON.stringify({ role: newRole }),
    }).catch(() => {})
    fetchFamily()
  }

  if (!family) return null

  const activeMembers = family.members.filter((m) => m.is_active)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Membros</h2>
      </div>

      {/* Invite code */}
      <div
        className="rounded-xl bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] flex items-center justify-between mb-6 cursor-pointer transition-shadow hover:shadow-md"
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
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        {activeMembers.length} membros
      </p>
      <div className="rounded-xl bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] divide-y divide-border">
        {activeMembers.map((member) => {
          const RoleIcon = ROLE_ICONS[member.role] || User
          return (
            <div
              key={member.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => openMemberDetail(member)}
            >
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
                    onClick={(e) => {
                      e.stopPropagation()
                      handleChangeRole(member.id, member.role)
                    }}
                  >
                    {member.role === "adult" ? "Dependente" : "Adulto"}
                  </button>
                  <button
                    className="text-xs text-red-500 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveMember(member.id)
                    }}
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
          <DialogHeader>
            <DialogTitle>Detalhes do membro</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4 py-2">
              <div className="text-center py-2">
                <p className="font-semibold">{selectedMember.display_name || "Membro"}</p>
                <p className="text-xs text-muted-foreground">{ROLE_LABELS[selectedMember.role]}</p>
              </div>

              <div>
                <Label>Relação familiar</Label>
                <Select value={memberRelation} onValueChange={(v) => setMemberRelation(v || "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar relação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Não definida</SelectItem>
                    {RELATION_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 border-t pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Permissões
                </p>
                {[
                  { label: "Pode adicionar transacções", value: memberCanAddTransactions, set: setMemberCanAddTransactions },
                  { label: "Pode editar orçamentos", value: memberCanEditBudgets, set: setMemberCanEditBudgets },
                  { label: "Pode ver tudo", value: memberCanViewAll, set: setMemberCanViewAll },
                  { label: "Pode convidar membros", value: memberCanInvite, set: setMemberCanInvite },
                ].map((perm) => (
                  <div key={perm.label} className="flex items-center gap-3">
                    <Label className="flex-1 text-sm">{perm.label}</Label>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={perm.value}
                      onClick={() => perm.set(!perm.value)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        perm.value ? "bg-primary" : "bg-muted"
                      }`}
                    >
                      <span
                        className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${
                          perm.value ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              <Button className="w-full" onClick={handleSaveMemberDetail}>
                Guardar alterações
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
