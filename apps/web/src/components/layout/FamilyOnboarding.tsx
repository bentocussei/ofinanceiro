"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogIn, Plus, Users } from "lucide-react"
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
import { apiFetch } from "@/lib/api"
import { setContext } from "@/lib/context"

export function FamilyOnboarding({ onCreated }: { onCreated: () => void }) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [createName, setCreateName] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreate = async () => {
    if (!createName.trim()) return
    setIsSubmitting(true)
    try {
      const family = await apiFetch<{ id: string }>("/api/v1/families/", {
        method: "POST",
        body: JSON.stringify({ name: createName.trim() }),
      })
      setContext(`family:${family.id}`)
      setCreateOpen(false)
      setCreateName("")
      toast.success("Família criada com sucesso")
      onCreated()
    } catch {
      toast.error("Erro ao criar família")
    }
    setIsSubmitting(false)
  }

  const handleJoin = async () => {
    if (!joinCode.trim()) return
    setIsSubmitting(true)
    try {
      const family = await apiFetch<{ family_id: string }>("/api/v1/families/join", {
        method: "POST",
        body: JSON.stringify({ invite_code: joinCode.trim() }),
      })
      setContext(`family:${family.family_id}`)
      setJoinOpen(false)
      setJoinCode("")
      toast.success("Entrou na família com sucesso")
      onCreated()
    } catch {
      toast.error("Código de convite inválido")
    }
    setIsSubmitting(false)
  }

  const handleGoBack = () => {
    setContext("personal")
    router.push("/dashboard")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 max-w-md text-center px-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Users className="h-10 w-10 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Agregado Familiar</h1>
          <p className="text-sm text-muted-foreground">
            Crie um agregado familiar para gerir finanças em conjunto ou junte-se a um existente com um código de convite.
          </p>
        </div>

        <div className="flex gap-3">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button />}>
              <Plus className="h-4 w-4 mr-2" /> Criar família
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Criar família</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Nome da família</Label>
                  <Input
                    placeholder="Ex: Família Silva"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    autoFocus
                  />
                </div>
                <Button className="w-full" onClick={handleCreate} disabled={isSubmitting}>
                  {isSubmitting ? "A criar..." : "Criar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
            <DialogTrigger render={<Button variant="outline" />}>
              <LogIn className="h-4 w-4 mr-2" /> Tenho um código de convite
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Juntar-se a uma família</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Código de convite</Label>
                  <Input
                    placeholder="Cole o código aqui"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    className="font-mono"
                    autoFocus
                  />
                </div>
                <Button className="w-full" onClick={handleJoin} disabled={isSubmitting}>
                  {isSubmitting ? "A entrar..." : "Entrar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <button
          onClick={handleGoBack}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Voltar ao contexto pessoal
        </button>
      </div>
    </div>
  )
}
