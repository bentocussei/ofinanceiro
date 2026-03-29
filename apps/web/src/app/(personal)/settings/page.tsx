"use client"

import { Lock, Mail, Phone, Plus, Tag as TagIcon, Trash2, User, Wallet, X } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { tagsApi, type Tag } from "@/lib/api/tags"
import { usersApi } from "@/lib/api/users"
import { getCurrentUser, logout, type UserProfile } from "@/lib/auth"

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [currency, setCurrency] = useState("AOA")
  const [salaryDay, setSalaryDay] = useState("25")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Tags
  const [tags, setTags] = useState<Tag[]>([])
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState("#3b82f6")

  const TAG_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"]

  const fetchTags = () => {
    tagsApi.list().then(setTags).catch(() => {})
  }

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

  useEffect(() => {
    async function load() {
      const u = await getCurrentUser()
      if (u) {
        setUser(u)
        setName(u.name || "")
        setEmail(u.email || "")
        setCurrency(u.currency || "AOA")
        setSalaryDay(String(u.salary_day || 25))
      }
      setLoading(false)
    }
    load()
    fetchTags()
  }, [])

  async function handleProfileSave() {
    try {
      await usersApi.updateProfile({
        name,
        email: email || undefined,
        currency_default: currency,
        salary_day: parseInt(salaryDay, 10),
      })
      toast.success("Alterações guardadas com sucesso.")
    } catch {
      toast.error("Erro ao guardar. Tente novamente.")
    }
  }

  async function handlePasswordChange() {
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.")
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        A carregar...
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight mb-6">Configurações</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column — Profile & Preferences */}
        <div className="space-y-6">
          <section className="rounded-xl bg-card shadow-sm p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold">Perfil</h2>
                <p className="text-xs text-muted-foreground">Informações da sua conta</p>
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
                  <Input id="s-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" className="pl-9" />
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
                    <option value="USD">Dólar (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-salary" className="text-xs">Dia do salário</Label>
                  <Input id="s-salary" type="number" min="1" max="31" value={salaryDay} onChange={(e) => setSalaryDay(e.target.value)} />
                </div>
              </div>

              <Button size="sm" onClick={handleProfileSave}>Guardar alterações</Button>
            </div>
          </section>

          {/* Plan */}
          <section className="rounded-xl bg-card shadow-sm p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold">Plano</h2>
                <p className="text-xs text-muted-foreground">A sua subscrição actual</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-semibold capitalize">{user?.plan || "Gratuito"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {user?.plan === "free" || !user?.plan
                    ? "50 transacções/mês, 5 perguntas IA/dia"
                    : "Transacções e IA ilimitadas"}
                </p>
              </div>
              <Button variant="outline" size="sm">Alterar plano</Button>
            </div>
          </section>
        </div>

        {/* Right column — Security & Account */}
        <div className="space-y-6">
          <section className="rounded-xl bg-card shadow-sm p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold">Segurança</h2>
                <p className="text-xs text-muted-foreground">Alterar a sua senha de acesso</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="s-current-pw" className="text-xs">Senha actual</Label>
                <Input id="s-current-pw" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-new-pw" className="text-xs">Nova senha</Label>
                <Input id="s-new-pw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-confirm-pw" className="text-xs">Confirmar nova senha</Label>
                <Input id="s-confirm-pw" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>

              <Button size="sm" onClick={handlePasswordChange}>Alterar senha</Button>
            </div>
          </section>

          {/* Tags */}
          <section className="rounded-xl bg-card shadow-sm p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <TagIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold">Etiquetas</h2>
                <p className="text-xs text-muted-foreground">Organize transacções com etiquetas personalizadas</p>
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
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cor</Label>
                <div className="flex gap-1">
                  {TAG_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewTagColor(c)}
                      className={`h-8 w-8 rounded-md border-2 transition-colors ${newTagColor === c ? "border-foreground" : "border-transparent"}`}
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

          {/* Danger zone */}
          <section className="rounded-xl bg-card shadow-sm p-5">
            <h2 className="text-[15px] font-semibold mb-4">Zona de risco</h2>
            <button
              onClick={() => {
                toast("Tem a certeza que deseja eliminar a sua conta?", {
                  description: "Esta acção é irreversível. Os seus dados serão eliminados após 30 dias.",
                  action: {
                    label: "Eliminar",
                    onClick: () => {
                      toast.info("Funcionalidade disponível em breve. Contacte o suporte para eliminar a conta.")
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
                <p className="text-xs text-muted-foreground">Remover permanentemente a conta e todos os dados (30 dias de graça)</p>
              </div>
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}
