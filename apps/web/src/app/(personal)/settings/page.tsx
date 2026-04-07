"use client"

import {
  Camera,
  CreditCard,
  Mail,
  Phone,
  ShieldCheck,
  Smartphone,
  Tag as TagIcon,
  Trash2,
  User,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { InstallAppTab } from "@/components/settings/InstallAppTab"
import { SecurityTab } from "@/components/settings/SecurityTab"
import { SubscriptionTab } from "@/components/settings/SubscriptionTab"
import { TagsTab } from "@/components/settings/TagsTab"
import { usersApi } from "@/lib/api/users"
import { getCurrentUser, type UserProfile } from "@/lib/auth"

type TabId = "profile" | "subscription" | "tags" | "security" | "install"

interface TabDef {
  id: TabId
  label: string
  icon: React.ElementType
  mobileOnly?: boolean
}

const TABS: TabDef[] = [
  { id: "profile", label: "Perfil", icon: User },
  { id: "subscription", label: "Subscricao", icon: CreditCard },
  { id: "tags", label: "Etiquetas", icon: TagIcon },
  { id: "security", label: "Seguranca", icon: ShieldCheck },
  { id: "install", label: "Instalar app", icon: Smartphone, mobileOnly: true },
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

  // Mobile-only tabs (e.g. install) must fall back when viewport reaches desktop
  useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia("(min-width: 768px)")
    const sync = () => {
      if (mq.matches && tab === "install") setTab("profile")
    }
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [tab])

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
      <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto scrollbar-hide">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                t.mobileOnly ? "md:hidden" : ""
              } ${
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
      {tab === "profile" && <ProfileTab user={user} onUserUpdate={() => getCurrentUser().then(setUser)} />}
      {tab === "subscription" && <SubscriptionTab user={user} />}
      {tab === "tags" && <TagsTab />}
      {tab === "security" && <SecurityTab />}
      {tab === "install" && <InstallAppTab />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Profile tab (personal-only)
// ---------------------------------------------------------------------------

function ProfileTab({ user, onUserUpdate }: { user: UserProfile | null; onUserUpdate?: () => void }) {
  const [name, setName] = useState(user?.name || "")
  const [email, setEmail] = useState(user?.email || "")
  const [currency, setCurrency] = useState(user?.currency || "AOA")
  const [salaryDay, setSalaryDay] = useState(String(user?.salary_day || 25))
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "")
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleSave() {
    try {
      await usersApi.updateProfile({
        name,
        email: email || undefined,
        currency_default: currency,
        salary_day: parseInt(salaryDay, 10),
      })
      toast.success("Alteracoes guardadas com sucesso.")
      onUserUpdate?.()
    } catch {
      toast.error("Erro ao guardar. Tente novamente.")
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Formato nao suportado. Use JPEG, PNG ou WebP.")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Foto muito grande. Maximo 2MB.")
      return
    }

    setUploadingAvatar(true)
    try {
      const result = await usersApi.uploadAvatar(file)
      setAvatarUrl(result.avatar_url)
      toast.success("Foto actualizada")
      onUserUpdate?.()
    } catch {
      toast.error("Erro ao enviar foto")
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleAvatarDelete() {
    try {
      await usersApi.deleteAvatar()
      setAvatarUrl("")
      toast.success("Foto removida")
      onUserUpdate?.()
    } catch {
      toast.error("Erro ao remover foto")
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      {/* Avatar section */}
      <section className="rounded-xl bg-card shadow-sm p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Camera className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold">Foto de perfil</h2>
            <p className="text-xs text-muted-foreground">JPEG, PNG ou WebP. Maximo 2MB.</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={user?.name || "Avatar"}
                className="h-16 w-16 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                {user?.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? "A enviar..." : avatarUrl ? "Alterar foto" : "Adicionar foto"}
            </Button>
            {avatarUrl && (
              <Button size="sm" variant="ghost" className="text-destructive" onClick={handleAvatarDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>
      </section>

      {/* Profile fields */}
      <section className="rounded-xl bg-card shadow-sm p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold">Dados pessoais</h2>
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
