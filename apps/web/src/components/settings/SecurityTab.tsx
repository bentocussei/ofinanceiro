"use client"

import {
  Lock,
  Trash2,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { usersApi } from "@/lib/api/users"

// ---------------------------------------------------------------------------
// SecurityTab — shared between personal and family settings
// ---------------------------------------------------------------------------

export function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  async function handlePasswordChange() {
    if (newPassword !== confirmPassword) {
      toast.error("As senhas nao coincidem.")
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

  return (
    <div className="max-w-lg space-y-6">
      {/* Change password */}
      <section className="rounded-xl bg-card shadow-sm p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold">Alterar senha</h2>
            <p className="text-xs text-muted-foreground">Alterar a sua senha de acesso</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="s-current-pw" className="text-xs">Senha actual</Label>
            <Input
              id="s-current-pw"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-new-pw" className="text-xs">Nova senha</Label>
            <Input
              id="s-new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimo 8 caracteres"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-confirm-pw" className="text-xs">Confirmar nova senha</Label>
            <Input
              id="s-confirm-pw"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <Button size="sm" onClick={handlePasswordChange}>Alterar senha</Button>
        </div>
      </section>

      {/* Danger zone */}
      <section className="rounded-xl bg-card shadow-sm p-5">
        <h2 className="text-[15px] font-semibold mb-4">Zona de risco</h2>
        <button
          onClick={() => {
            toast("Tem a certeza que deseja eliminar a sua conta?", {
              description: "Esta accao e irreversivel. Os seus dados serao eliminados apos 30 dias.",
              action: {
                label: "Eliminar",
                onClick: () => {
                  toast.info("Funcionalidade disponivel em breve. Contacte o suporte para eliminar a conta.")
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
            <p className="text-xs text-muted-foreground">Remover permanentemente a conta e todos os dados (30 dias de graca)</p>
          </div>
        </button>
      </section>
    </div>
  )
}
