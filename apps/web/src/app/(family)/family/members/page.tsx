"use client"

import { Check, Copy, Plus, RefreshCw, Shield, User, UserPlus, Users, X } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  familiesApi,
  type CreateDirectMemberData,
  type Family,
  type FamilyMember,
  type JoinRequest,
} from "@/lib/api/families"
import { getContextHeader } from "@/lib/context"

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

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "agora mesmo"
  if (diffMin < 60) return `há ${diffMin} minuto${diffMin > 1 ? "s" : ""}`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `há ${diffH} hora${diffH > 1 ? "s" : ""}`
  const diffD = Math.floor(diffH / 24)
  if (diffD === 1) return "ontem"
  if (diffD < 30) return `há ${diffD} dias`
  return new Date(dateStr).toLocaleDateString("pt-AO")
}

type Tab = "members" | "requests"

export default function FamilyMembersPage() {
  const [family, setFamily] = useState<Family | null>(null)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>("members")

  // Member detail dialog
  const [memberDetailOpen, setMemberDetailOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null)
  const [memberRelation, setMemberRelation] = useState("")
  const [memberCanAddTransactions, setMemberCanAddTransactions] = useState(false)
  const [memberCanEditBudgets, setMemberCanEditBudgets] = useState(false)
  const [memberCanViewAll, setMemberCanViewAll] = useState(false)
  const [memberCanInvite, setMemberCanInvite] = useState(false)

  // Add member dialog
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [newMemberName, setNewMemberName] = useState("")
  const [newMemberPhone, setNewMemberPhone] = useState("")
  const [newMemberPassword, setNewMemberPassword] = useState("")
  const [newMemberRole, setNewMemberRole] = useState("adult")
  const [newMemberRelation, setNewMemberRelation] = useState("")
  const [newMemberDisplayName, setNewMemberDisplayName] = useState("")
  const [addingMember, setAddingMember] = useState(false)

  // Join requests
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)

  // Regenerate code
  const [regenerating, setRegenerating] = useState(false)

  const ctx = { headers: getContextHeader() }

  const fetchFamily = () => {
    familiesApi.me(ctx)
      .then(setFamily)
      .catch(() => {})
  }

  const fetchJoinRequests = () => {
    if (!family) return
    setLoadingRequests(true)
    familiesApi.joinRequests(family.id, ctx)
      .then(setJoinRequests)
      .catch(() => setJoinRequests([]))
      .finally(() => setLoadingRequests(false))
  }

  useEffect(() => {
    fetchFamily()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (family && activeTab === "requests") {
      fetchJoinRequests()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family, activeTab])

  const handleCopyCode = () => {
    if (family?.invite_code) {
      navigator.clipboard.writeText(family.invite_code)
      setCopied(true)
      toast.success("Código copiado")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleRegenerateCode = async () => {
    if (!family) return
    setRegenerating(true)
    try {
      const result = await familiesApi.regenerateCode(family.id, ctx)
      setFamily({ ...family, invite_code: result.invite_code })
      toast.success("Código de convite renovado")
    } catch {
      toast.error("Erro ao renovar código")
    } finally {
      setRegenerating(false)
    }
  }

  const handleRemoveMember = (memberId: string) => {
    toast("Remover este membro da família?", {
      description: "Esta acção não pode ser revertida.",
      action: {
        label: "Remover",
        onClick: async () => {
          await familiesApi.removeMember(memberId, ctx).catch(() => {})
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
      await familiesApi.updateMember(selectedMember.id, {
        relation: memberRelation || null,
        can_add_transactions: memberCanAddTransactions,
        can_edit_budgets: memberCanEditBudgets,
        can_view_all: memberCanViewAll,
        can_invite: memberCanInvite,
      }, ctx)
      setMemberDetailOpen(false)
      fetchFamily()
      toast.success("Membro actualizado com sucesso")
    } catch {
      toast.error("Erro ao actualizar membro")
    }
  }

  const handleChangeRole = async (memberId: string, currentRole: string) => {
    const newRole = currentRole === "adult" ? "dependent" : "adult"
    await familiesApi.changeMemberRole(memberId, newRole, ctx).catch(() => {})
    fetchFamily()
  }

  const handleAddMember = async () => {
    if (!family) return
    if (!newMemberName.trim() || !newMemberPhone.trim() || !newMemberPassword.trim()) {
      toast.error("Preencha todos os campos obrigatórios")
      return
    }
    if (newMemberPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres")
      return
    }
    setAddingMember(true)
    try {
      const data: CreateDirectMemberData = {
        name: newMemberName.trim(),
        phone: newMemberPhone.trim(),
        password: newMemberPassword.trim(),
        role: newMemberRole,
      }
      if (newMemberRelation) data.family_relation = newMemberRelation
      if (newMemberDisplayName.trim()) data.display_name = newMemberDisplayName.trim()

      const member = await familiesApi.createDirectMember(family.id, data, ctx)
      toast.success(`Membro "${member.display_name || data.name}" adicionado com sucesso`)
      setAddMemberOpen(false)
      resetAddMemberForm()
      fetchFamily()
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status
      if (status === 409) {
        toast.error("Este número já está registado")
      } else {
        toast.error("Erro ao adicionar membro")
      }
    } finally {
      setAddingMember(false)
    }
  }

  const resetAddMemberForm = () => {
    setNewMemberName("")
    setNewMemberPhone("")
    setNewMemberPassword("")
    setNewMemberRole("adult")
    setNewMemberRelation("")
    setNewMemberDisplayName("")
  }

  const handleApproveRequest = async (requestId: string) => {
    if (!family) return
    try {
      await familiesApi.approveJoinRequest(family.id, requestId, ctx)
      toast.success("Pedido aprovado")
      fetchJoinRequests()
      fetchFamily()
    } catch {
      toast.error("Erro ao aprovar pedido")
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    if (!family) return
    try {
      await familiesApi.rejectJoinRequest(family.id, requestId, ctx)
      toast.success("Pedido recusado")
      fetchJoinRequests()
    } catch {
      toast.error("Erro ao recusar pedido")
    }
  }

  if (!family) return null

  const activeMembers = (family.members ?? []).filter((m) => m.is_active)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Membros</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 rounded-lg bg-muted p-1">
        <button
          onClick={() => setActiveTab("members")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "members"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Membros
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "requests"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Pedidos de integração
          {joinRequests.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
              {joinRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab: Members */}
      {activeTab === "members" && (
        <>
          {/* Invite code card */}
          <div className="rounded-xl bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Código de convite</p>
                <p className="font-mono font-semibold text-lg">{family.invite_code}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCode}
                  className="h-8 gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? "Copiado" : "Copiar"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerateCode}
                  disabled={regenerating}
                  className="h-8 gap-1.5"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
                  Renovar código
                </Button>
              </div>
            </div>
          </div>

          {/* Add member button */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {activeMembers.length} membros
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddMemberOpen(true)}
              className="h-8 gap-1.5"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Adicionar membro
            </Button>
          </div>

          {/* Members list */}
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
        </>
      )}

      {/* Tab: Join Requests */}
      {activeTab === "requests" && (
        <>
          {loadingRequests ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              A carregar pedidos...
            </div>
          ) : joinRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum pedido pendente</p>
            </div>
          ) : (
            <div className="rounded-xl bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] divide-y divide-border">
              {joinRequests.map((req) => (
                <div key={req.id} className="flex items-center gap-3 px-4 py-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{req.user_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {req.user_phone} -- {relativeTime(req.requested_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                      onClick={() => handleApproveRequest(req.id)}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                      onClick={() => handleRejectRequest(req.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                      Recusar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

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

      {/* Add member dialog */}
      <Dialog open={addMemberOpen} onOpenChange={(v) => { setAddMemberOpen(v); if (!v) resetAddMemberForm() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar membro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome *</Label>
              <Input
                placeholder="Nome completo"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
              />
            </div>
            <div>
              <Label>Telefone *</Label>
              <div className="flex gap-2">
                <span className="flex items-center px-3 rounded-md border border-input bg-muted text-sm text-muted-foreground">
                  +244
                </span>
                <Input
                  placeholder="9XX XXX XXX"
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label>Senha *</Label>
              <Input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newMemberPassword}
                onChange={(e) => setNewMemberPassword(e.target.value)}
              />
            </div>
            <div>
              <Label>Papel</Label>
              <Select value={newMemberRole} onValueChange={(v) => setNewMemberRole(v ?? "adult")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="adult">Adulto</SelectItem>
                  <SelectItem value="dependent">Dependente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Relação familiar</Label>
              <Select value={newMemberRelation} onValueChange={(v) => setNewMemberRelation(v ?? "")}>
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
            <div>
              <Label>Nome de exibição</Label>
              <Input
                placeholder="Opcional"
                value={newMemberDisplayName}
                onChange={(e) => setNewMemberDisplayName(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={handleAddMember} disabled={addingMember}>
              {addingMember ? "A adicionar..." : "Adicionar membro"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
