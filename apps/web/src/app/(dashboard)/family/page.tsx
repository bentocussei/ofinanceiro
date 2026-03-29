"use client"

import { Copy, LogIn, Plus, Shield, User, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiFetch } from "@/lib/api"

interface FamilyMember {
  id: string
  user_id: string
  role: string
  display_name: string | null
  is_active: boolean
}

interface Family {
  id: string
  name: string
  admin_user_id: string
  invite_code: string | null
  members: FamilyMember[]
}

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
      </div>

      {/* Invite code */}
      <div
        className="rounded-lg border bg-card p-4 flex items-center justify-between mb-6 cursor-pointer hover:border-foreground/20 transition-colors"
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
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">{activeMembers.length} membros</h3>
      <div className="rounded-lg border bg-card divide-y">
        {activeMembers.map((member) => {
          const RoleIcon = ROLE_ICONS[member.role] || User
          return (
            <div key={member.id} className="flex items-center gap-3 px-4 py-3">
              <RoleIcon className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium text-sm">{member.display_name || "Membro"}</p>
                <p className="text-xs text-muted-foreground">{ROLE_LABELS[member.role]}</p>
              </div>
              {member.role !== "admin" && (
                <div className="flex gap-2">
                  <button
                    className="text-xs text-blue-500 hover:text-blue-600"
                    onClick={() => handleChangeRole(member.id, member.role)}
                  >
                    {member.role === "adult" ? "Dependente" : "Adulto"}
                  </button>
                  <button
                    className="text-xs text-red-500 hover:text-red-600"
                    onClick={() => handleRemoveMember(member.id)}
                  >
                    Remover
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
