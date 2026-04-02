"use client"

import {
  Lock,
  Trash2,
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { usersApi } from "@/lib/api/users"
import { getCurrentUser } from "@/lib/auth"

export function SecurityTab() {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user) setHasPassword((user as unknown as { has_password?: boolean }).has_password ?? true)
    })
  }, [])

  async function handlePasswordChange() {
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.")
      return
    }
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.")
      return
    }
    try {
      await usersApi.changePassword(hasPassword ? currentPassword : undefined, newPassword)
      toast.success(hasPassword ? "Senha alterada com sucesso." : "Senha definida com sucesso.")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setHasPassword(true)
    } catch {
      toast.error("Erro ao alterar a senha.")
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      {/* Password section */}
      <section className="rounded-xl bg-card shadow-sm p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold">
              {hasPassword ? "Alterar senha" : "Definir senha"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {hasPassword
                ? "Altere a sua senha de acesso"
                : "Defina uma senha para aceder com telefone e senha"
              }
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {hasPassword && (
            <div className="space-y-1.5">
              <Label htmlFor="s-current-pw" className="text-xs">Senha actual</Label>
              <Input
                id="s-current-pw"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="s-new-pw" className="text-xs">
              {hasPassword ? "Nova senha" : "Senha"}
            </Label>
            <Input
              id="s-new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-confirm-pw" className="text-xs">Confirmar senha</Label>
            <Input
              id="s-confirm-pw"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <Button size="sm" onClick={handlePasswordChange}>
            {hasPassword ? "Alterar senha" : "Definir senha"}
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
            <p className="text-xs text-muted-foreground">Remover permanentemente a conta e todos os dados</p>
          </div>
        </button>
      </section>
    </div>
  )
}
