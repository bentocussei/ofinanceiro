"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiFetch } from "@/lib/api"
import { getCurrentUser, logout, type UserProfile } from "@/lib/auth"

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Profile form
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [profileMsg, setProfileMsg] = useState("")

  // Preferences
  const [currency, setCurrency] = useState("AOA")
  const [salaryDay, setSalaryDay] = useState("25")
  const [prefMsg, setPrefMsg] = useState("")

  // Password
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordMsg, setPasswordMsg] = useState("")

  // Theme
  const [theme, setTheme] = useState("system")

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
      // Load theme from localStorage
      const savedTheme = localStorage.getItem("theme") || "system"
      setTheme(savedTheme)
      applyTheme(savedTheme)
      setLoading(false)
    }
    load()
  }, [])

  function applyTheme(t: string) {
    const root = document.documentElement
    if (t === "dark") {
      root.classList.add("dark")
    } else if (t === "light") {
      root.classList.remove("dark")
    } else {
      // system
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        root.classList.add("dark")
      } else {
        root.classList.remove("dark")
      }
    }
  }

  function handleThemeChange(t: string) {
    setTheme(t)
    localStorage.setItem("theme", t)
    applyTheme(t)
  }

  async function handleProfileSave() {
    setProfileMsg("")
    try {
      await apiFetch("/api/v1/users/me", {
        method: "PUT",
        body: JSON.stringify({ name, email: email || undefined }),
      })
      setProfileMsg("Perfil actualizado com sucesso.")
    } catch {
      setProfileMsg("Erro ao actualizar o perfil.")
    }
  }

  async function handlePrefSave() {
    setPrefMsg("")
    try {
      await apiFetch("/api/v1/users/me/preferences", {
        method: "PUT",
        body: JSON.stringify({
          currency,
          salary_day: parseInt(salaryDay, 10),
        }),
      })
      setPrefMsg("Preferencias actualizadas.")
    } catch {
      setPrefMsg("Erro ao actualizar preferencias.")
    }
  }

  async function handlePasswordChange() {
    setPasswordMsg("")
    if (newPassword !== confirmPassword) {
      setPasswordMsg("As senhas nao coincidem.")
      return
    }
    if (newPassword.length < 6) {
      setPasswordMsg("A senha deve ter pelo menos 6 caracteres.")
      return
    }
    try {
      await apiFetch("/api/v1/users/me/password", {
        method: "PUT",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      })
      setPasswordMsg("Senha alterada com sucesso.")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch {
      setPasswordMsg("Erro ao alterar a senha. Verifique a senha actual.")
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
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Configuracoes</h1>

      {/* Profile */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Perfil</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="settings-name">Nome</Label>
            <Input
              id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-phone">Telefone</Label>
            <Input
              id="settings-phone"
              value={user?.phone || ""}
              disabled
              className="opacity-60"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-email">Email (opcional)</Label>
            <Input
              id="settings-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>
          {profileMsg && (
            <p className="text-sm text-muted-foreground">{profileMsg}</p>
          )}
          <Button onClick={handleProfileSave}>Guardar perfil</Button>
        </div>
      </section>

      {/* Preferences */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Preferencias</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="settings-currency">Moeda</Label>
            <select
              id="settings-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="AOA">Kwanza (AOA)</option>
              <option value="USD">Dolar (USD)</option>
              <option value="EUR">Euro (EUR)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-salary-day">Dia do salario</Label>
            <Input
              id="settings-salary-day"
              type="number"
              min="1"
              max="31"
              value={salaryDay}
              onChange={(e) => setSalaryDay(e.target.value)}
            />
          </div>
          {prefMsg && (
            <p className="text-sm text-muted-foreground">{prefMsg}</p>
          )}
          <Button onClick={handlePrefSave}>Guardar preferencias</Button>
        </div>
      </section>

      {/* Theme */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Tema</h2>
        <div className="flex gap-3">
          {(["light", "dark", "system"] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleThemeChange(t)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                theme === t
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-accent"
              }`}
            >
              {t === "light" ? "Claro" : t === "dark" ? "Escuro" : "Sistema"}
            </button>
          ))}
        </div>
      </section>

      {/* Security */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Seguranca</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="settings-current-pw">Senha actual</Label>
            <Input
              id="settings-current-pw"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-new-pw">Nova senha</Label>
            <Input
              id="settings-new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-confirm-pw">Confirmar nova senha</Label>
            <Input
              id="settings-confirm-pw"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          {passwordMsg && (
            <p className="text-sm text-muted-foreground">{passwordMsg}</p>
          )}
          <Button onClick={handlePasswordChange}>Alterar senha</Button>
        </div>
      </section>

      {/* Plan */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Plano</h2>
        <p className="text-sm text-muted-foreground">
          Plano actual:{" "}
          <span className="font-medium text-foreground">
            {user?.plan || "Gratuito"}
          </span>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Para alterar o seu plano, entre em contacto com o suporte.
        </p>
      </section>

      {/* Danger Zone */}
      <section className="rounded-xl border border-destructive/30 bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-destructive">
          Zona perigosa
        </h2>
        <Button variant="destructive" onClick={logout}>
          Terminar sessao
        </Button>
      </section>
    </div>
  )
}
