"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronsUpDown, Plus, User, Users } from "lucide-react"
import { toast } from "sonner"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { familiesApi, type Family } from "@/lib/api/families"
import { getContext, setContext } from "@/lib/context"

export function ContextSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter()
  const [family, setFamily] = useState<Family | null>(null)
  const [current, setCurrent] = useState(getContext())
  const [open, setOpen] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [createName, setCreateName] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    familiesApi.me()
      .then((f) => setFamily(f))
      .catch(() => {})
  }, [])

  const handleSelect = (ctx: "personal" | `family:${string}`) => {
    setContext(ctx)
    setCurrent(ctx)
    setOpen(false)
    setShowCreate(false)
    setShowJoin(false)
    if (ctx === "personal") {
      router.push("/dashboard")
    } else {
      router.push("/family/dashboard")
    }
  }

  const handleCreateFamily = async () => {
    if (!createName.trim()) return
    setLoading(true)
    try {
      const newFamily = await familiesApi.create(createName.trim())
      setFamily(newFamily)
      setCreateName("")
      setShowCreate(false)
      toast.success(`Família "${newFamily.name}" criada com sucesso`)
      handleSelect(`family:${newFamily.id}`)
    } catch {
      toast.error("Não foi possível criar a família")
    } finally {
      setLoading(false)
    }
  }

  const handleJoinFamily = async () => {
    if (!joinCode.trim()) return
    setLoading(true)
    try {
      await familiesApi.join(joinCode.trim())
      toast.success("Pedido de integração enviado. Aguarde aprovação.")
      setJoinCode("")
      setShowJoin(false)
      setOpen(false)
    } catch {
      toast.error("Código de convite inválido")
    } finally {
      setLoading(false)
    }
  }

  const isPersonal = current === "personal"

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setShowCreate(false); setShowJoin(false) } }}>
      <PopoverTrigger
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-sidebar-accent cursor-pointer ${
          collapsed ? "justify-center" : ""
        }`}
      >
        {isPersonal ? (
          <User className="h-4 w-4 shrink-0 text-primary" />
        ) : (
          <Users className="h-4 w-4 shrink-0 text-primary" />
        )}
        {!collapsed && (
          <>
            <span className="flex-1 text-left truncate text-sidebar-foreground">
              {isPersonal ? "Pessoal" : family?.name || "Família"}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </>
        )}
      </PopoverTrigger>
      <PopoverContent
        side={collapsed ? "right" : "bottom"}
        align="start"
        className="w-56 p-1"
      >
        {/* Personal option */}
        <button
          onClick={() => handleSelect("personal")}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
        >
          <User className="h-4 w-4" />
          <span className="flex-1 text-left">Pessoal</span>
          {isPersonal && <Check className="h-4 w-4 text-primary" />}
        </button>

        {/* Family option — if exists */}
        {family && (
          <button
            onClick={() => handleSelect(`family:${family.id}`)}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
          >
            <Users className="h-4 w-4" />
            <span className="flex-1 text-left truncate">{family.name}</span>
            {!isPersonal && <Check className="h-4 w-4 text-primary" />}
          </button>
        )}

        {/* Create/Join family — if no family */}
        {!family && (
          <div className="border-t border-border mt-1 pt-1">
            {showCreate ? (
              <div className="p-2 space-y-2">
                <Input
                  placeholder="Nome da família"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateFamily()}
                  autoFocus
                  className="h-8 text-sm"
                />
                <div className="flex gap-1">
                  <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleCreateFamily} disabled={loading}>
                    {loading ? "A criar..." : "Criar"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowCreate(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : showJoin ? (
              <div className="p-2 space-y-2">
                <Input
                  placeholder="Código de convite"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinFamily()}
                  autoFocus
                  className="h-8 text-sm font-mono"
                />
                <div className="flex gap-1">
                  <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleJoinFamily} disabled={loading}>
                    {loading ? "A entrar..." : "Entrar"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowJoin(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-primary hover:bg-accent transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Criar família</span>
                </button>
                <button
                  onClick={() => setShowJoin(true)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors"
                >
                  <Users className="h-4 w-4" />
                  <span>Tenho um código</span>
                </button>
              </>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
